import { NextRequest, NextResponse } from "next/server";
import { merchantAccounts, transfers } from "@/lib/luqra";
import { connectDB } from "@/lib/db";
import Payout from "@/lib/models/Payout";
import Customer from "@/lib/models/Customer";
import { markTransactionsDeposited } from "@/lib/markTransactionsDeposited";

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
  if (!customer.luqraMerchantAccountId) {
    return NextResponse.json(
      { error: "Customer has not connected a Luqra account" },
      { status: 400 }
    );
  }

  // Verify the merchant account can receive transfers
  const account = await merchantAccounts.retrieve(customer.luqraMerchantAccountId);
  if (!account.charges_enabled) {
    return NextResponse.json(
      { error: "Customer's Luqra account is not fully onboarded" },
      { status: 400 }
    );
  }

  // Create a Luqra Transfer to the merchant account
  const transfer = await transfers.create({
    amount: Math.round(payout.amount * 100), // cents
    currency: "usd",
    destination: customer.luqraMerchantAccountId,
    metadata: {
      payoutId: payout._id.toString(),
      customerId: customer._id.toString(),
      customerName: payout.customerName,
    },
  });

  payout.status = "completed";
  payout.luqraTransferId = transfer.id;
  payout.completedAt = new Date();
  await payout.save();

  // Mark customer's processed transactions as deposited (FIFO)
  try {
    await markTransactionsDeposited(
      payout.customerId.toString(),
      payout.amount
    );
  } catch (err: unknown) {
    console.error("Failed to mark transactions as deposited:", err instanceof Error ? err.message : err);
  }

  return NextResponse.json(payout);
}
