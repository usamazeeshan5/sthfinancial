import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Payout from "@/lib/models/Payout";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDB();
  const { id } = await params;

  const payout = await Payout.findById(id);
  if (!payout) {
    return NextResponse.json({ error: "Payout not found" }, { status: 404 });
  }
  if (payout.status !== "failed") {
    return NextResponse.json(
      { error: "Only failed payouts can be retried" },
      { status: 400 }
    );
  }

  payout.status = "scheduled";
  payout.scheduledAt = new Date();
  await payout.save();

  return NextResponse.json(payout);
}
