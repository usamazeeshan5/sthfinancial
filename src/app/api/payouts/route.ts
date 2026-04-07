import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Payout from "@/lib/models/Payout";

export async function GET(req: NextRequest) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");

  const query = status && status !== "all" ? { status } : {};

  const [payouts, total] = await Promise.all([
    Payout.find(query)
      .sort({ scheduledAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Payout.countDocuments(query),
  ]);

  return NextResponse.json({ payouts, total, page, limit });
}
