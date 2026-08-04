import { NextRequest, NextResponse } from "next/server";
import { verifySquareWebhook, SquareWebhookEvent } from "@/lib/square";
import { connectDB } from "@/lib/db";
import Transaction from "@/lib/models/Transaction";
import Payout from "@/lib/models/Payout";
import WebhookEvent from "@/lib/models/WebhookEvent";
import { markTransactionsDeposited } from "@/lib/markTransactionsDeposited";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-square-hmacsha256-signature");

  const valid = await verifySquareWebhook(body, signature);
  if (!valid) {
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 }
    );
  }

  let event: SquareWebhookEvent;
  try {
    event = JSON.parse(body) as SquareWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  await connectDB();

  // Duplicate-event protection: Square may redeliver the same event. Record the
  // event_id under a unique index; if it's already there, we've handled it.
  if (event.event_id) {
    try {
      await WebhookEvent.create({ eventId: event.event_id, type: event.type });
    } catch (err: unknown) {
      // Duplicate key → already processed. Acknowledge and stop.
      if ((err as { code?: number })?.code === 11000) {
        return NextResponse.json({ received: true, duplicate: true });
      }
      throw err;
    }
  }

  try {
    switch (event.type) {
      case "payment.updated":
      case "payment.created":
        await handlePaymentUpdated(event);
        break;
      case "payout.sent":
      case "payout.paid":
        await handlePayoutCompleted(event);
        break;
      case "payout.failed":
        await handlePayoutFailed(event);
        break;
      default:
        break;
    }
  } catch (err: unknown) {
    console.error(
      `Error handling webhook event ${event.type}:`,
      err instanceof Error ? err.message : err
    );
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handlePaymentUpdated(event: SquareWebhookEvent) {
  const payment = event.data.object?.payment as
    | { id: string; status: string; reference_id?: string }
    | undefined;

  if (!payment) return;

  const txn = await Transaction.findOne({
    $or: [
      { squarePaymentId: payment.id },
      ...(payment.reference_id ? [{ quoteId: payment.reference_id }] : []),
    ],
  });

  if (!txn) {
    console.warn("payment.updated: no matching transaction for", payment.id);
    return;
  }

  if (payment.status === "COMPLETED" && txn.status !== "deposited") {
    txn.status = "processed";
    txn.squarePaymentId = payment.id;
    await txn.save();
  } else if (payment.status === "FAILED" || payment.status === "CANCELED") {
    txn.status = "failed";
    await txn.save();
  }
}

async function handlePayoutCompleted(event: SquareWebhookEvent) {
  const payout = event.data.object?.payout as
    | { id: string; reference_id?: string }
    | undefined;
  if (!payout?.reference_id) {
    console.error("payout.sent: missing reference_id on payout", payout?.id);
    return;
  }

  const record = await Payout.findById(payout.reference_id);
  if (!record) {
    console.error("payout.sent: Payout not found:", payout.reference_id);
    return;
  }

  if (record.status !== "completed") {
    record.status = "completed";
    record.squarePayoutId = payout.id;
    record.completedAt = new Date();
    await record.save();
  }

  await markTransactionsDeposited(record.customerId.toString(), record.amount);
}

async function handlePayoutFailed(event: SquareWebhookEvent) {
  const payout = event.data.object?.payout as
    | { id: string; reference_id?: string }
    | undefined;
  if (!payout?.reference_id) return;

  const record = await Payout.findById(payout.reference_id);
  if (!record) return;

  record.status = "failed";
  await record.save();

  await Transaction.updateMany(
    { customerId: record.customerId, status: "deposited" },
    { $set: { status: "processed" } }
  );
}
