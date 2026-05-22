import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { connectDB } from "@/lib/db";
import NfcChip from "@/lib/models/NfcChip";
import FeeConfig from "@/lib/models/FeeConfig";
import Transaction from "@/lib/models/Transaction";

export async function POST(req: NextRequest) {
  await connectDB();

  const { chipUid, amount } = await req.json();

  if (!chipUid || !amount || amount <= 0) {
    return NextResponse.json(
      { error: "chipUid and a positive amount are required" },
      { status: 400 }
    );
  }

  const chip = await NfcChip.findOne({ chipUid, status: "active" });
  if (!chip || !chip.customerId) {
    return NextResponse.json(
      { error: "Invalid or unlinked chip" },
      { status: 404 }
    );
  }

  let feeConfig = await FeeConfig.findOne();
  if (!feeConfig) {
    feeConfig = await FeeConfig.create({ flatFee: 0.3, percentageFee: 3.9 });
  }

  const fee =
    Math.round(
      (amount * (feeConfig.percentageFee / 100) + feeConfig.flatFee) * 100
    ) / 100;
  const totalCharged = Math.round((amount + fee) * 100) / 100;

  const quoteId = randomUUID();

  await Transaction.create({
    customerId: chip.customerId,
    customerName: chip.customerName || "",
    amount,
    fee,
    totalCharged,
    status: "quoted",
    quoteId,
  });

  return NextResponse.json({
    quoteId,
    amount,
    fee,
    totalCharged,
    customerName: chip.customerName,
  });
}
