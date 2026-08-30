import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Transaction from "@/lib/models/Transaction";
import Payout from "@/lib/models/Payout";
import { COMPLETED_STATUSES, EARNING_STATUSES, HIDDEN_STATUSES } from "@/lib/txnStatus";

export async function GET(req: NextRequest) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get("customerId");

  if (!customerId || !mongoose.Types.ObjectId.isValid(customerId)) {
    return NextResponse.json(
      { error: "A valid customerId is required" },
      { status: 400 }
    );
  }

  // The aggregation $match stages compare against the stored ObjectId field and
  // do NOT auto-cast a string (unlike Mongoose find/countDocuments), so the
  // query param must be converted explicitly or every sum comes back empty.
  const customerObjectId = new mongoose.Types.ObjectId(customerId);

  const [totalEarnings, thisMonth, pendingResult, txCount, recentTransactions, chartData] =
    await Promise.all([
      Transaction.aggregate([
        { $match: { customerId: customerObjectId, status: { $in: ["deposited", "processed"] } } },
        { $group: { _id: null, sum: { $sum: "$amount" } } },
      ]),
      Transaction.aggregate([
        {
          $match: {
            customerId: customerObjectId,
            status: { $in: ["deposited", "processed"] },
            createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
          },
        },
        { $group: { _id: null, sum: { $sum: "$amount" } } },
      ]),
      Payout.aggregate([
        { $match: { customerId: customerObjectId, status: "scheduled" } },
        { $group: { _id: null, sum: { $sum: "$amount" } } },
      ]),
      Transaction.countDocuments({ customerId: customerObjectId, status: { $in: COMPLETED_STATUSES } }),
      Transaction.find({ customerId: customerObjectId, status: { $nin: HIDDEN_STATUSES } }).sort({ createdAt: -1 }).limit(10),
      Transaction.aggregate([
        {
          $match: {
            customerId: customerObjectId,
            status: { $in: EARNING_STATUSES },
            createdAt: { $gte: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000) },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            amount: { $sum: "$amount" },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

  return NextResponse.json({
    stats: {
      totalEarnings: totalEarnings[0]?.sum || 0,
      thisMonth: thisMonth[0]?.sum || 0,
      pending: pendingResult[0]?.sum || 0,
      totalTransactions: txCount,
    },
    recentTransactions,
    chartData: chartData.map((d: { _id: string; amount: number }) => ({
      date: new Date(d._id).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      amount: Math.round(d.amount * 100) / 100,
    })),
  });
}
