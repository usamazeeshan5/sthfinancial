import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { SquareClient, SquareEnvironment } from "square";
import { connectDB } from "@/lib/db";
import Transaction from "@/lib/models/Transaction";
import Customer from "@/lib/models/Customer";

// Direct-to-seller charging via Square OAuth.
// Money settles into the worker's own Square balance using their OAuth
// access token. Square then pays them out to their bank on their normal
// schedule — no platform-managed payouts needed.

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

  // Resolve the recipient (worker) and their Square OAuth credentials.
  if (!txn.customerId) {
    return NextResponse.json(
      { error: "Tip is not associated with a recipient" },
      { status: 400 }
    );
  }
  const recipient = await Customer.findById(txn.customerId).select(
    "+squareAccessToken squareLocationId squareMerchantId bankAccountStatus name"
  );
  if (!recipient) {
    return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
  }
  if (
    !recipient.squareAccessToken ||
    !recipient.squareLocationId ||
    recipient.bankAccountStatus !== "connected"
  ) {
    return NextResponse.json(
      {
        error:
          "The recipient hasn't finished connecting their bank yet. Please ask them to complete Square onboarding and try again.",
      },
      { status: 409 }
    );
  }

  const isSandbox = process.env.SQUARE_ENVIRONMENT !== "production";

  // Per-request Square client scoped to the seller's OAuth token. We don't
  // reuse the platform `squareClient` here — that one settles money to the
  // platform, which is exactly what we're trying to avoid.
  const sellerClient = new SquareClient({
    token: recipient.squareAccessToken,
    environment: isSandbox ? SquareEnvironment.Sandbox : SquareEnvironment.Production,
  });

  try {
    const response = await sellerClient.payments.create({
      sourceId,
      idempotencyKey: randomUUID(),
      amountMoney: {
        amount: BigInt(Math.round(txn.totalCharged * 100)),
        currency: "USD",
      },
      locationId: recipient.squareLocationId,
      referenceId: quoteId,
      note: `Tip for ${txn.customerName || recipient.name || "recipient"}`,
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
    // Square OAuth tokens can expire / be revoked; surface that clearly so
    // the worker knows to re-onboard.
    const message =
      err instanceof Error ? err.message : "Square payment failed";
    if (/unauthorized|expired|revoked|access_token/i.test(message)) {
      return NextResponse.json(
        {
          error:
            "The recipient's Square connection is no longer valid. Please ask them to reconnect their bank.",
        },
        { status: 401 }
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
