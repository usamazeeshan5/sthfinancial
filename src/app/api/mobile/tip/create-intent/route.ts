import { NextRequest, NextResponse } from "next/server";
import { paymentIntents } from "@/lib/luqra";
import { connectDB } from "@/lib/db";
import NfcChip from "@/lib/models/NfcChip";
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

  const fee =
    Math.round(
      (amount * (feeConfig.percentageFee / 100) + feeConfig.flatFee) * 100
    ) / 100;
  const totalCharged = Math.round((amount + fee) * 100) / 100;

  // Create Luqra PaymentIntent (amount in cents)
  const paymentIntent = await paymentIntents.create({
    amount: Math.round(totalCharged * 100),
    currency: "usd",
    automatic_payment_methods: { enabled: true },
    metadata: {
      chipUid,
      customerId: chip.customerId.toString(),
      customerName: chip.customerName || "",
      tipAmount: amount.toString(),
      fee: fee.toString(),
    },
  });

  return NextResponse.json({
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    amount,
    fee,
    totalCharged,
    customerName: chip.customerName,
  });
}
