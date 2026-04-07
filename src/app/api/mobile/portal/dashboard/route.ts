import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Transaction from "@/lib/models/Transaction";
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

  const [totalEarnings, thisMonth, pendingResult, txCount, recentTransactions, chartData] =
    await Promise.all([
      Transaction.aggregate([
        { $match: { customerId: customerId, status: { $in: ["deposited", "processed"] } } },
        { $group: { _id: null, sum: { $sum: "$amount" } } },
      ]),
      Transaction.aggregate([
        {
          $match: {
            customerId: customerId,
            status: { $in: ["deposited", "processed"] },
            createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
          },
        },
        { $group: { _id: null, sum: { $sum: "$amount" } } },
      ]),
      Payout.aggregate([
        { $match: { customerId: customerId, status: "scheduled" } },
        { $group: { _id: null, sum: { $sum: "$amount" } } },
      ]),
      Transaction.countDocuments({ customerId }),
      Transaction.find({ customerId }).sort({ createdAt: -1 }).limit(10),
      Transaction.aggregate([
        {
          $match: {
            customerId: customerId,
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
