import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Payout from "@/lib/models/Payout";
import Customer from "@/lib/models/Customer";
import { markTransactionsDeposited } from "@/lib/markTransactionsDeposited";

// Admin-triggered manual payout to a connected customer.
//
// Square architecture note:
//   Unlike Stripe Connect, Square does not let a platform move money to a
//   connected seller's bank account on demand. Square automatically deposits
//   the seller's own Square balance to their linked bank account on the
//   seller's configured payout schedule.
//
//   This route currently just marks the payout as completed in our DB so the
//   admin/customer balance math stays consistent. Wire it up to an external
//   ACH/transfer provider (Dwolla, Modern Treasury, etc.) once you've picked
//   a payout rail, OR change the model so each customer is an OAuth-connected
//   Square seller and Square handles their payouts automatically.

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
  if (!customer.squareMerchantId) {
    return NextResponse.json(
      { error: "Customer has not connected their Square account" },
      { status: 400 }
    );
  }

  payout.status = "completed";
  payout.completedAt = new Date();
  await payout.save();

  try {
    await markTransactionsDeposited(
      payout.customerId.toString(),
      payout.amount
    );
  } catch (err: unknown) {
    console.error(
      "Failed to mark transactions as deposited:",
      err instanceof Error ? err.message : err
    );
  }

  return NextResponse.json(payout);
}
