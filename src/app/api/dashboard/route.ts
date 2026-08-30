import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Customer from "@/lib/models/Customer";
import Transaction from "@/lib/models/Transaction";
import Payout from "@/lib/models/Payout";
import { COMPLETED_STATUSES, EARNING_STATUSES } from "@/lib/txnStatus";

export async function GET(req: NextRequest) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get("days") || "12");

  const [
    totalTips,
    totalFees,
    totalTransactions,
    activeCustomers,
    depositedResult,
    pendingPayouts,
    recentTransactions,
    chartData,
  ] = await Promise.all([
    // Tips/fees sum only successful money — NOT abandoned quotes.
    Transaction.aggregate([
      { $match: { status: { $in: EARNING_STATUSES } } },
      { $group: { _id: null, sum: { $sum: "$amount" } } },
    ]),
    Transaction.aggregate([
      { $match: { status: { $in: EARNING_STATUSES } } },
      { $group: { _id: null, sum: { $sum: "$fee" } } },
    ]),
    // Count real transactions, not quotes.
    Transaction.countDocuments({ status: { $in: COMPLETED_STATUSES } }),
    Customer.countDocuments({ active: true }),
    Transaction.aggregate([
      { $match: { status: "deposited" } },
      { $group: { _id: null, sum: { $sum: "$amount" } } },
    ]),
    Payout.aggregate([
      { $match: { status: "scheduled" } },
      { $group: { _id: null, sum: { $sum: "$amount" } } },
    ]),
    Transaction.find({ status: { $in: COMPLETED_STATUSES } })
      .sort({ createdAt: -1 })
      .limit(5),
    // Chart: aggregate paid tips per day for the last N days.
    Transaction.aggregate([
      {
        $match: {
          status: { $in: EARNING_STATUSES },
          createdAt: {
            $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
          },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          tips: { $sum: "$amount" },
          fees: { $sum: "$fee" },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const stats = {
    totalTips: totalTips[0]?.sum || 0,
    totalFees: totalFees[0]?.sum || 0,
    totalTransactions,
    activeCustomers,
    depositedAmount: depositedResult[0]?.sum || 0,
    pendingPayouts: pendingPayouts[0]?.sum || 0,
  };

  // Format chart data with readable dates
  const formattedChart = chartData.map((d: { _id: string; tips: number; fees: number }) => {
    const date = new Date(d._id);
    return {
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      tips: Math.round(d.tips * 100) / 100,
      fees: Math.round(d.fees * 100) / 100,
    };
  });

  return NextResponse.json({
    stats,
    recentTransactions,
    chartData: formattedChart,
  });
}
