import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { verifyToken } from "@/lib/jwt";
import Customer from "@/lib/models/Customer";
import Transaction from "@/lib/models/Transaction";
import Payout from "@/lib/models/Payout";

export async function GET(req: NextRequest) {
  await connectDB();

  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = verifyToken(auth.slice(7));
  if (!payload?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const availableBalance = await calculateAvailableBalance(payload.id);

  return NextResponse.json({ availableBalance });
}

export async function POST(req: NextRequest) {
  await connectDB();

  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = verifyToken(auth.slice(7));
  if (!payload?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { amount } = await req.json();

  const customer = await Customer.findById(payload.id);
  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  if (!customer.luqraMerchantAccountId) {
    return NextResponse.json(
      { error: "Please connect your Luqra account before requesting a payout" },
      { status: 400 }
    );
  }

  if (customer.bankAccountStatus !== "connected") {
    return NextResponse.json(
      { error: "Please complete Luqra onboarding before requesting a payout" },
      { status: 400 }
    );
  }

  const availableBalance = await calculateAvailableBalance(payload.id);

  const requestedAmount = amount ? parseFloat(amount) : availableBalance;

  if (requestedAmount <= 0) {
    return NextResponse.json(
      { error: "No available balance to withdraw" },
      { status: 400 }
    );
  }

  if (requestedAmount > availableBalance) {
    return NextResponse.json(
      { error: `Requested amount exceeds available balance of $${availableBalance.toFixed(2)}` },
      { status: 400 }
    );
  }

  const payout = await Payout.create({
    customerId: customer._id,
    customerName: customer.name,
    amount: Math.round(requestedAmount * 100) / 100,
    status: "scheduled",
    scheduledAt: new Date(),
  });

  return NextResponse.json({
    success: true,
    payout: {
      id: payout._id,
      amount: payout.amount,
      status: payout.status,
      scheduledAt: payout.scheduledAt,
    },
  });
}

async function calculateAvailableBalance(customerId: string): Promise<number> {
  const objectId = new mongoose.Types.ObjectId(customerId);

  const [earningsResult, paidOutResult] = await Promise.all([
    // Total earnings from processed/deposited transactions
    Transaction.aggregate([
      { $match: { customerId: objectId, status: { $in: ["processed", "deposited"] } } },
      { $group: { _id: null, sum: { $sum: "$amount" } } },
    ]),
    // Total already paid out or scheduled
    Payout.aggregate([
      { $match: { customerId: objectId, status: { $in: ["scheduled", "completed"] } } },
      { $group: { _id: null, sum: { $sum: "$amount" } } },
    ]),
  ]);

  const totalEarnings = earningsResult[0]?.sum || 0;
  const totalPaidOut = paidOutResult[0]?.sum || 0;

  return Math.round((totalEarnings - totalPaidOut) * 100) / 100;
}
