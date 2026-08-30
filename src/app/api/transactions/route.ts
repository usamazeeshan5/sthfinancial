import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Transaction from "@/lib/models/Transaction";
import { HIDDEN_STATUSES } from "@/lib/txnStatus";

export async function GET(req: NextRequest) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const search = (searchParams.get("search") || "").trim();
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const query: Record<string, unknown> = {};
  // A specific status filter is honored as-is; otherwise hide quotes/failed
  // attempts so the log shows only real, completed transactions.
  if (status && status !== "all") query.status = status;
  else query.status = { $nin: HIDDEN_STATUSES };
  if (search) {
    const rx = { $regex: search, $options: "i" };
    query.$or = [
      { customerName: rx },
      { quoteId: rx },
      { squarePaymentId: rx },
    ];
  }

  const [transactions, total, totals] = await Promise.all([
    Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Transaction.countDocuments(query),
    // Aggregate sums across the WHOLE filtered set (not just the page) so the
    // header stats stay correct while paginating.
    Transaction.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
          totalFees: { $sum: "$fee" },
        },
      },
    ]),
  ]);

  return NextResponse.json({
    transactions,
    total,
    page,
    limit,
    totalAmount: totals[0]?.totalAmount || 0,
    totalFees: totals[0]?.totalFees || 0,
  });
}
