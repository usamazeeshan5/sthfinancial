import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Customer from "@/lib/models/Customer";
import { verifyToken } from "@/lib/jwt";

// Returns the logged-in worker's Square payouts.
// Source of truth is Square (/v2/payouts), not our DB — under the
// direct-to-seller model we don't maintain local Payout records anymore.

type SquarePayout = {
  id: string;
  status: "PAID" | "SENT" | "FAILED" | "CANCELED";
  location_id: string;
  created_at: string;
  updated_at: string;
  amount_money: { amount: number | string; currency: string };
  arrival_date?: string;
  destination?: { type: string; id: string };
};

function normalizeStatus(s: SquarePayout["status"]) {
  switch (s) {
    case "PAID":
      return "completed";
    case "SENT":
      return "scheduled";
    case "FAILED":
      return "failed";
    case "CANCELED":
      return "failed";
  }
}

export async function GET(req: NextRequest) {
  await connectDB();

  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const payload = verifyToken(auth.slice(7));
  if (!payload?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const customer = await Customer.findById(payload.id).select(
    "+squareAccessToken squareLocationId name"
  );
  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  // Worker hasn't connected Square yet — return empty payouts list.
  if (!customer.squareAccessToken || !customer.squareLocationId) {
    return NextResponse.json({ payouts: [] });
  }

  const isSandbox = process.env.SQUARE_ENVIRONMENT !== "production";
  const squareHost = isSandbox
    ? "https://connect.squareupsandbox.com"
    : "https://connect.squareup.com";

  try {
    const r = await fetch(
      `${squareHost}/v2/payouts?location_id=${encodeURIComponent(
        customer.squareLocationId
      )}&limit=25`,
      {
        headers: {
          Authorization: `Bearer ${customer.squareAccessToken}`,
          "Square-Version": "2024-12-18",
          Accept: "application/json",
        },
      }
    );

    if (!r.ok) {
      // Token expired / revoked — surface this so the worker can reconnect.
      if (r.status === 401) {
        return NextResponse.json(
          {
            payouts: [],
            warning:
              "Your Square connection appears to be expired. Please reconnect your bank.",
          },
          { status: 200 }
        );
      }
      return NextResponse.json({ payouts: [] });
    }

    const json = (await r.json()) as { payouts?: SquarePayout[] };
    const payouts = (json.payouts ?? []).map((p) => {
      const amt =
        typeof p.amount_money.amount === "string"
          ? parseInt(p.amount_money.amount, 10)
          : p.amount_money.amount;
      const status = normalizeStatus(p.status);
      return {
        id: p.id,
        customerId: String(customer._id),
        customerName: customer.name || "",
        amount: Math.round(amt) / 100,
        status,
        scheduledAt: p.arrival_date || p.created_at,
        completedAt: status === "completed" ? p.updated_at : null,
      };
    });

    return NextResponse.json({ payouts });
  } catch (e: unknown) {
    console.error(
      "[mobile/portal/payouts] Square fetch failed:",
      e instanceof Error ? e.message : e
    );
    return NextResponse.json({ payouts: [] });
  }
}
