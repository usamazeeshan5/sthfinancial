import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Customer from "@/lib/models/Customer";
import Transaction from "@/lib/models/Transaction";
import Payout from "@/lib/models/Payout";
import NfcChip from "@/lib/models/NfcChip";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDB();
  const { id } = await params;
  const customer = await Customer.findById(id).select("-password");
  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const [transactions, payouts, nfcChips] = await Promise.all([
    Transaction.find({ customerId: id }).sort({ createdAt: -1 }),
    Payout.find({ customerId: id }).sort({ scheduledAt: -1 }),
    NfcChip.find({ customerId: id }),
  ]);

  return NextResponse.json({ customer, transactions, payouts, nfcChips });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDB();
  const { id } = await params;
  const body = await req.json();

  const customer = await Customer.findByIdAndUpdate(id, body, {
    new: true,
  }).select("-password");

  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  // Sync customer name on related records if name changed
  if (body.name) {
    await Promise.all([
      NfcChip.updateMany({ customerId: id }, { customerName: body.name }),
      Transaction.updateMany({ customerId: id }, { customerName: body.name }),
      Payout.updateMany({ customerId: id }, { customerName: body.name }),
    ]);
  }

  return NextResponse.json(customer);
}
