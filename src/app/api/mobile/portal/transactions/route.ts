import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Transaction from "@/lib/models/Transaction";

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
  if (status && status !== "all") query.status = status;

  const transactions = await Transaction.find(query).sort({ createdAt: -1 });
  return NextResponse.json({ transactions });
}
