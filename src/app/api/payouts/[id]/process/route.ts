import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { connectDB } from "@/lib/db";
import Payout from "@/lib/models/Payout";
import Customer from "@/lib/models/Customer";
import { markTransactionsDeposited } from "@/lib/markTransactionsDeposited";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDB();
  const { id } = await params;

  const payout = await Payout.findById(id);
  if (!payout) {
    return NextResponse.json({ error: "Payout not found" }, { status: 404 });
  }
  if (payout.status !== "scheduled") {
    return NextResponse.json(
      { error: "Only scheduled payouts can be processed" },
      { status: 400 }
    );
  }

  const customer = await Customer.findById(payout.customerId);
  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }
  if (!customer.stripeConnectedAccountId) {
    return NextResponse.json(
      { error: "Customer has not connected a Stripe account" },
      { status: 400 }
    );
  }

  // Verify the connected account can receive transfers
  const account = await stripe.accounts.retrieve(customer.stripeConnectedAccountId);
  if (!account.charges_enabled) {
    return NextResponse.json(
      { error: "Customer's Stripe account is not fully onboarded" },
      { status: 400 }
    );
  }

  // Create a Stripe Transfer to the connected account
  const transfer = await stripe.transfers.create({
    amount: Math.round(payout.amount * 100), // cents
    currency: "usd",
    destination: customer.stripeConnectedAccountId,
    metadata: {
      payoutId: payout._id.toString(),
      customerId: customer._id.toString(),
      customerName: payout.customerName,
    },
  });

  payout.status = "completed";
  payout.stripeTransferId = transfer.id;
  payout.completedAt = new Date();
  await payout.save();

  // Mark customer's processed transactions as deposited (FIFO)
  try {
    await markTransactionsDeposited(
      payout.customerId.toString(),
      payout.amount
    );
  } catch (err: any) {
    console.error("Failed to mark transactions as deposited:", err.message);
  }

  return NextResponse.json(payout);
}
