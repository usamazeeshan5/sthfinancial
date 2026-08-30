import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Transaction from "@/lib/models/Transaction";
import { HIDDEN_STATUSES } from "@/lib/txnStatus";

export async function GET(req: NextRequest) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get("customerId");
  const status = searchParams.get("status");

  if (!customerId) {
    return NextResponse.json(
      { error: "customerId is required" },
      { status: 400 }
    );
  }

  const query: Record<string, unknown> = { customerId };
  // Hide unpaid quotes / failed attempts from the worker's activity feed.
  if (status && status !== "all") query.status = status;
  else query.status = { $nin: HIDDEN_STATUSES };

  const transactions = await Transaction.find(query).sort({ createdAt: -1 });
  return NextResponse.json({ transactions });
}
