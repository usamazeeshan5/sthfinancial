import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { verifyToken } from "@/lib/jwt";
import Payout from "@/lib/models/Payout";

// Returns the logged-in worker's payout history from the local Payout
// collection (app-managed model). A worker requests a payout from the app
// (status "scheduled"), an admin processes it (-> "completed"). This is the
// same source the dashboard's "Pending Payout" and the admin list use, so the
// numbers stay consistent. Square still auto-deposits the worker's Square
// balance to their bank on its own schedule, separately from this ledger.

export async function GET(req: NextRequest) {
  await connectDB();

  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const payload = verifyToken(auth.slice(7));
  if (!payload?.id || !mongoose.Types.ObjectId.isValid(payload.id)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const customerObjectId = new mongoose.Types.ObjectId(payload.id);

  const payouts = await Payout.find({ customerId: customerObjectId })
    .sort({ scheduledAt: -1 })
    .lean();

  const shaped = payouts.map((p) => ({
    id: String(p._id),
    customerId: String(p.customerId),
    customerName: p.customerName,
    amount: p.amount,
    status: p.status,
    scheduledAt: p.scheduledAt,
    completedAt: p.completedAt || null,
  }));

  return NextResponse.json({ payouts: shaped });
}
