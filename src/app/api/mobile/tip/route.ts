import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import NfcChip from "@/lib/models/NfcChip";
import Transaction from "@/lib/models/Transaction";
import FeeConfig from "@/lib/models/FeeConfig";

export async function POST(req: NextRequest) {
  await connectDB();
  const { chipUid, amount } = await req.json();

  if (!chipUid || !amount || amount <= 0) {
    return NextResponse.json(
      { error: "chipUid and a positive amount are required" },
      { status: 400 }
    );
  }

  // Find the chip and its linked customer
  const chip = await NfcChip.findOne({ chipUid, status: "active" });
  if (!chip || !chip.customerId) {
    return NextResponse.json(
      { error: "Invalid or unlinked chip" },
      { status: 404 }
    );
  }

  // Calculate fees
  let feeConfig = await FeeConfig.findOne();
  if (!feeConfig) {
    feeConfig = await FeeConfig.create({ flatFee: 0.3, percentageFee: 3.9 });
  }

  const fee = Math.round((amount * (feeConfig.percentageFee / 100) + feeConfig.flatFee) * 100) / 100;
  const totalCharged = Math.round((amount + fee) * 100) / 100;

  // Generate Luqra reference ID (will be replaced with real Luqra integration)
  const luqraRefId = `LQ-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

  const transaction = await Transaction.create({
    customerId: chip.customerId,
    customerName: chip.customerName,
    amount,
    fee,
    totalCharged,
    status: "pending",
    luqraRefId,
  });

  return NextResponse.json({
    success: true,
    transactionId: transaction._id,
    luqraRefId,
    amount,
    fee,
    totalCharged,
    customerName: chip.customerName,
  });
}
