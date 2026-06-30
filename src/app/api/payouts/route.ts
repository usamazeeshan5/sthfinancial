import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Payout from "@/lib/models/Payout";

// Lists payout REQUESTS from the local Payout collection.
//
// App-managed model: a worker requests a payout from the mobile app, which
// creates a Payout (status "scheduled"). An admin then processes it here
// (POST /api/payouts/[id]/process), which marks it completed and flips the
// worker's transactions to "deposited". Square still auto-deposits the
// worker's Square balance to their bank on its own schedule — this ledger
// tracks the platform-side request/approval lifecycle.

export async function GET(req: NextRequest) {
  await connectDB();

  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get("status");

  const query =
    statusFilter && statusFilter !== "all" ? { status: statusFilter } : {};

  const payouts = await Payout.find(query)
    .sort({ scheduledAt: -1 })
    .lean();

  const shaped = payouts.map((p) => ({
    _id: String(p._id),
    customerId: String(p.customerId),
    customerName: p.customerName,
    amount: p.amount,
    status: p.status,
    squarePayoutId: p.squarePayoutId || "",
    scheduledAt: p.scheduledAt,
    completedAt: p.completedAt || null,
    destination: "Square balance",
  }));

  return NextResponse.json({
    payouts: shaped,
    total: shaped.length,
    page: 1,
    limit: shaped.length,
  });
}
