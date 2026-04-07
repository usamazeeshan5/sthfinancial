import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Payout from "@/lib/models/Payout";

export async function GET(req: NextRequest) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get("customerId");

  if (!customerId) {
    return NextResponse.json(
      { error: "customerId is required" },
      { status: 400 }
    );
  }

  const payouts = await Payout.find({ customerId }).sort({ scheduledAt: -1 });
  return NextResponse.json({ payouts });
}
