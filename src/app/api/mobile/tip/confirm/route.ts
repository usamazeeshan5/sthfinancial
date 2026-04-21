import { NextRequest, NextResponse } from "next/server";
import { paymentIntents } from "@/lib/luqra";
import { connectDB } from "@/lib/db";
import Transaction from "@/lib/models/Transaction";

export async function POST(req: NextRequest) {
  await connectDB();

  const { paymentIntentId } = await req.json();

  if (!paymentIntentId) {
    return NextResponse.json(
      { error: "paymentIntentId is required" },
      { status: 400 }
    );
  }

  try {
    // Verify the payment succeeded on Luqra
    const paymentIntent = await paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== "succeeded") {
      return NextResponse.json(
        { error: "Payment has not been completed" },
        { status: 400 }
      );
    }

    // Prevent duplicate transaction records
    const existing = await Transaction.findOne({ luqraPaymentIntentId: paymentIntentId });
    if (existing) {
      return NextResponse.json({
        success: true,
        transactionId: existing._id,
        amount: existing.amount,
        fee: existing.fee,
        totalCharged: existing.totalCharged,
        customerName: existing.customerName,
      });
    }

    // Extract metadata from the PaymentIntent
    const { customerId, customerName, tipAmount, fee } = paymentIntent.metadata;

    const amount = parseFloat(tipAmount);
    const feeAmount = parseFloat(fee);
    const totalCharged = Math.round((amount + feeAmount) * 100) / 100;

    const transaction = await Transaction.create({
      customerId,
      customerName: customerName || "",
      amount,
      fee: feeAmount,
      totalCharged,
      status: "processed",
      luqraPaymentIntentId: paymentIntentId,
    });

    return NextResponse.json({
      success: true,
      transactionId: transaction._id,
      amount,
      fee: feeAmount,
      totalCharged,
      customerName: customerName || "",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to confirm payment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
