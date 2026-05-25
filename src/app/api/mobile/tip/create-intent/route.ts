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

  // Public Square Web Payments SDK config — applicationId and locationId are
  // not secrets; the mobile WebView needs them to tokenize a card. The actual
  // charge still happens server-side in /api/mobile/tip/charge with the
  // server-only SQUARE_ACCESS_TOKEN.
  const squareEnvironment =
    process.env.SQUARE_ENVIRONMENT === "production" ? "production" : "sandbox";
  const squareApplicationId = process.env.SQUARE_APPLICATION_ID || null;
  const squareLocationId = process.env.SQUARE_LOCATION_ID || null;

  return NextResponse.json({
    quoteId,
    amount,
    fee,
    totalCharged,
    customerName: chip.customerName,
    square: {
      applicationId: squareApplicationId,
      locationId: squareLocationId,
      environment: squareEnvironment,
    },
  });
}
