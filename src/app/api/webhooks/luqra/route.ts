import { NextRequest, NextResponse } from "next/server";
import { webhooks, LuqraWebhookEvent } from "@/lib/luqra";
import { connectDB } from "@/lib/db";
import Transaction from "@/lib/models/Transaction";
import Payout from "@/lib/models/Payout";
import { markTransactionsDeposited } from "@/lib/markTransactionsDeposited";

const webhookSecret = process.env.LUQRA_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("luqra-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing luqra-signature header" },
      { status: 400 }
    );
  }

  let event: LuqraWebhookEvent;
  try {
    event = webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: unknown) {
    console.error("Webhook signature verification failed:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 }
    );
  }

  await connectDB();

  try {
    // TODO: Confirm actual Luqra webhook event type names when API docs are available
    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(event);
        break;
      case "transfer.created":
        await handleTransferCreated(event);
        break;
      case "transfer.reversed":
        await handleTransferReversed(event);
        break;
      default:
        break;
    }
  } catch (err: unknown) {
    console.error(`Error handling webhook event ${event.type}:`, err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}

async function handlePaymentIntentSucceeded(event: LuqraWebhookEvent) {
  const paymentIntent = event.data.object as {
    id: string;
    metadata: Record<string, string>;
  };

  const existing = await Transaction.findOne({
    luqraPaymentIntentId: paymentIntent.id,
  });

  if (existing) {
    if (existing.status === "pending") {
      existing.status = "processed";
      await existing.save();
    }
    return;
  }

  const { customerId, customerName, tipAmount, fee } = paymentIntent.metadata;

  if (!customerId || !tipAmount || !fee) {
    console.error(
      "payment_intent.succeeded: Missing metadata on PaymentIntent",
      paymentIntent.id
    );
    return;
  }

  const amount = parseFloat(tipAmount);
  const feeAmount = parseFloat(fee);
  const totalCharged = Math.round((amount + feeAmount) * 100) / 100;

  await Transaction.create({
    customerId,
    customerName: customerName || "",
    amount,
    fee: feeAmount,
    totalCharged,
    status: "processed",
    luqraPaymentIntentId: paymentIntent.id,
  });
}

async function handleTransferCreated(event: LuqraWebhookEvent) {
  const transfer = event.data.object as {
    id: string;
    metadata: Record<string, string>;
  };

  const payoutId = transfer.metadata?.payoutId;
  const customerId = transfer.metadata?.customerId;

  if (!payoutId || !customerId) {
    console.error(
      "transfer.created: Missing metadata on Transfer",
      transfer.id
    );
    return;
  }

  const payout = await Payout.findById(payoutId);
  if (!payout) {
    console.error("transfer.created: Payout not found:", payoutId);
    return;
  }

  if (payout.status !== "completed") {
    payout.status = "completed";
    payout.luqraTransferId = transfer.id;
    payout.completedAt = new Date();
    await payout.save();
  }

  await markTransactionsDeposited(customerId, payout.amount);
}

async function handleTransferReversed(event: LuqraWebhookEvent) {
  const transfer = event.data.object as {
    id: string;
    reversed: boolean;
    metadata: Record<string, string>;
  };

  const payoutId = transfer.metadata?.payoutId;
  if (!payoutId) {
    console.error(
      "transfer.reversed: Missing payoutId in Transfer metadata",
      transfer.id
    );
    return;
  }

  const payout = await Payout.findById(payoutId);
  if (!payout) {
    console.error("transfer.reversed: Payout not found:", payoutId);
    return;
  }

  if (transfer.reversed) {
    payout.status = "failed";
    await payout.save();

    await Transaction.updateMany(
      { customerId: payout.customerId, status: "deposited" },
      { $set: { status: "processed" } }
    );
  }
}
