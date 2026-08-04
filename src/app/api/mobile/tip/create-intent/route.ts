import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { connectDB } from "@/lib/db";
import NfcChip from "@/lib/models/NfcChip";
import Customer from "@/lib/models/Customer";
import FeeConfig from "@/lib/models/FeeConfig";
import Transaction from "@/lib/models/Transaction";
import { computeFee, computeAppFeeCents, toCents, toDollars } from "@/lib/feeMath";

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

  // Gross-up so the worker nets EXACTLY the displayed tip after Square's
  // processing fee and LoveTap's application fee are both deducted.
  const tipCents = toCents(amount);
  const platformFeeCents = computeAppFeeCents(
    tipCents,
    feeConfig.platformPercentageFee || 0,
    feeConfig.platformFlatFee || 0
  );
  const breakdown = computeFee(tipCents, platformFeeCents);

  const totalCharged = toDollars(breakdown.totalCents); // tipper pays
  const fee = toDollars(breakdown.serviceFeeCents); // LoveTap service fee shown
  const platformFee = toDollars(breakdown.appFeeCents); // LoveTap's cut (app fee)

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
