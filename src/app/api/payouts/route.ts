import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Customer from "@/lib/models/Customer";

// Lists payouts SOURCED FROM SQUARE for every connected worker.
//
// Under the direct-to-seller model, each worker's tips land in their own
// Square balance and Square pays them out to their bank on Square's
// schedule. We no longer maintain a local Payout collection — this endpoint
// fans out to Square's /v2/payouts per connected worker and aggregates.

type SquarePayout = {
  id: string;
  status: "PAID" | "SENT" | "FAILED" | "CANCELED";
  location_id: string;
  created_at: string;
  updated_at: string;
  amount_money: { amount: number | string; currency: string };
  arrival_date?: string;
  destination?: { type: string; id: string };
  type?: string;
};

type AdminPayout = {
  _id: string;
  customerId: string;
  customerName: string;
  amount: number;
  status: "scheduled" | "completed" | "failed" | "canceled";
  squarePayoutId: string;
  scheduledAt: string;
  completedAt: string | null;
  destination: string;
};

function normalizeStatus(s: SquarePayout["status"]): AdminPayout["status"] {
  switch (s) {
    case "PAID":
      return "completed";
    case "SENT":
      return "scheduled";
    case "FAILED":
      return "failed";
    case "CANCELED":
      return "canceled";
  }
}

export async function GET(req: NextRequest) {
  await connectDB();

  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get("status");

  const isSandbox = process.env.SQUARE_ENVIRONMENT !== "production";
  const squareHost = isSandbox
    ? "https://connect.squareupsandbox.com"
    : "https://connect.squareup.com";

  // Pull every worker who has completed Square OAuth.
  const customers = await Customer.find({
    squareAccessToken: { $ne: null },
    squareLocationId: { $ne: null },
  })
    .select("+squareAccessToken squareLocationId name")
    .lean();

  // Fan out concurrently. Limit to ~8 in flight at once so we don't blow
  // Square's per-app rate limits when there are many workers.
  const CONCURRENCY = 8;
  const buckets: (typeof customers)[number][][] = [];
  for (let i = 0; i < customers.length; i += CONCURRENCY) {
    buckets.push(customers.slice(i, i + CONCURRENCY));
  }

  const all: AdminPayout[] = [];

  for (const bucket of buckets) {
    const results = await Promise.allSettled(
      bucket.map(async (c) => {
        const url = `${squareHost}/v2/payouts?location_id=${encodeURIComponent(
          c.squareLocationId as string
        )}&limit=25`;
        const r = await fetch(url, {
          headers: {
            Authorization: `Bearer ${c.squareAccessToken}`,
            "Square-Version": "2024-12-18",
            Accept: "application/json",
          },
        });
        if (!r.ok) {
          // Token expired/revoked, or location not found. Skip this worker.
          return [] as AdminPayout[];
        }
        const json = (await r.json()) as { payouts?: SquarePayout[] };
        return (json.payouts ?? []).map<AdminPayout>((p) => {
          const amt = typeof p.amount_money.amount === "string"
            ? parseInt(p.amount_money.amount, 10)
            : p.amount_money.amount;
          const status = normalizeStatus(p.status);
          return {
            _id: p.id,
            customerId: String(c._id),
            customerName: c.name || "Unknown",
            amount: Math.round(amt) / 100,
            status,
            squarePayoutId: p.id,
            scheduledAt: p.arrival_date || p.created_at,
            completedAt: status === "completed" ? p.updated_at : null,
            destination: p.destination?.type === "BANK_ACCOUNT"
              ? "Bank account"
              : p.destination?.type || "—",
          };
        });
      })
    );
    for (const r of results) {
      if (r.status === "fulfilled") all.push(...r.value);
    }
  }

  // Newest first.
  all.sort(
    (a, b) =>
      new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
  );

  const filtered =
    statusFilter && statusFilter !== "all"
      ? all.filter((p) => p.status === statusFilter)
      : all;

  return NextResponse.json({
    payouts: filtered,
    total: filtered.length,
    page: 1,
    limit: filtered.length,
  });
}
