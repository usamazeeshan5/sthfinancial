import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { connectDB } from "@/lib/db";
import NfcChip from "@/lib/models/NfcChip";
import Customer from "@/lib/models/Customer";
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

  // Recipient (the worker the chip belongs to). We need their Square config
  // so the tipper's WebView tokenizes against the right location, and so the
  // charge route can settle money directly into the worker's Square balance.
  const recipient = await Customer.findById(chip.customerId).select(
    "+squareAccessToken squareLocationId bankAccountStatus"
  );
  if (!recipient) {
    return NextResponse.json(
      { error: "Recipient account not found" },
      { status: 404 }
    );
  }
  if (
    !recipient.squareAccessToken ||
    !recipient.squareLocationId ||
    recipient.bankAccountStatus !== "connected"
  ) {
    return NextResponse.json(
      {
        error:
          "This recipient hasn't connected their bank yet. Please ask them to finish Square onboarding before sending a tip.",
      },
      { status: 409 }
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

  // Platform fee (the operator's own cut), computed on the tip amount and
  // collected via Square's app_fee_money at charge time. Comes out of the
  // processing fee margin — it is NOT added on top of what the tipper pays.
  const platformFee =
    Math.round(
      (amount * ((feeConfig.platformPercentageFee || 0) / 100) +
        (feeConfig.platformFlatFee || 0)) *
        100
    ) / 100;

  const quoteId = randomUUID();

  await Transaction.create({
    customerId: chip.customerId,
    customerName: chip.customerName || "",
    amount,
    fee,
    totalCharged,
    platformFee,
    status: "quoted",
    quoteId,
  });

  // Public Square Web Payments SDK config for the mobile WebView.
  // - applicationId is the PLATFORM's OAuth app ID (this is correct — the
  //   platform app brokers the seller relationship).
  // - locationId is the RECIPIENT'S location, so tokenization is scoped to
  //   their seller account.
  const squareEnvironment =
    process.env.SQUARE_ENVIRONMENT === "production" ? "production" : "sandbox";
  const squareApplicationId = process.env.SQUARE_APPLICATION_ID || null;

  return NextResponse.json({
    quoteId,
    amount,
    fee,
    totalCharged,
    // Surface the actual rates the fee was computed from so the client can
    // display an accurate breakdown instead of recomputing from its own
    // hardcoded constants (which drift whenever admin changes the fee config).
    percentageFee: feeConfig.percentageFee,
    flatFee: feeConfig.flatFee,
    customerName: chip.customerName,
    square: {
      applicationId: squareApplicationId,
      locationId: recipient.squareLocationId,
      environment: squareEnvironment,
    },
  });
}
