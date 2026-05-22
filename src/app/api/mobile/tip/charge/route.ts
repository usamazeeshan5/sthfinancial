import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { squareClient, SQUARE_LOCATION_ID } from "@/lib/square";
import { connectDB } from "@/lib/db";
import Transaction from "@/lib/models/Transaction";

export async function POST(req: NextRequest) {
  await connectDB();

  const { quoteId, sourceId } = await req.json();

  if (!quoteId || !sourceId) {
    return NextResponse.json(
      { error: "quoteId and sourceId are required" },
      { status: 400 }
    );
  }

  const txn = await Transaction.findOne({ quoteId });
  if (!txn) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }

  if (txn.status === "processed" || txn.status === "deposited") {
    return NextResponse.json({
      success: true,
      transactionId: txn._id,
      squarePaymentId: txn.squarePaymentId,
      amount: txn.amount,
      fee: txn.fee,
      totalCharged: txn.totalCharged,
      customerName: txn.customerName,
    });
  }

  try {
    const response = await squareClient.payments.create({
      sourceId,
      idempotencyKey: randomUUID(),
      amountMoney: {
        amount: BigInt(Math.round(txn.totalCharged * 100)),
        currency: "USD",
      },
      locationId: SQUARE_LOCATION_ID,
      referenceId: quoteId,
      note: `Tip for ${txn.customerName || "recipient"}`,
    });

    const payment = response.payment;
    if (!payment || payment.status !== "COMPLETED") {
      txn.status = "failed";
      await txn.save();
      return NextResponse.json(
        { error: `Payment not completed (status: ${payment?.status ?? "unknown"})` },
        { status: 402 }
      );
    }

    txn.status = "processed";
    txn.squarePaymentId = payment.id;
    await txn.save();

    return NextResponse.json({
      success: true,
      transactionId: txn._id,
      squarePaymentId: payment.id,
      amount: txn.amount,
      fee: txn.fee,
      totalCharged: txn.totalCharged,
      customerName: txn.customerName,
    });
  } catch (err: unknown) {
    txn.status = "failed";
    await txn.save();
    const message =
      err instanceof Error ? err.message : "Square payment failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
