import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { SquareClient, SquareEnvironment } from "square";
import { connectDB } from "@/lib/db";
import Transaction from "@/lib/models/Transaction";
import Customer from "@/lib/models/Customer";

// Direct-to-seller charging via Square OAuth.
// Money settles into the worker's own Square balance using their OAuth
// access token. Square then pays them out to their bank on their normal
// schedule — no platform-managed payouts needed.

export async function POST(req: NextRequest) {
  await connectDB();

  const { quoteId, sourceId } = await req.json();

  if (!quoteId || !sourceId) {
    return NextResponse.json(
      { error: "quoteId and sourceId are required" },
      { status: 400 }
    );
  }

  const txn = await Transaction.findOne({ quoteId });
  if (!txn) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }

  if (txn.status === "processed" || txn.status === "deposited") {
    return NextResponse.json({
      success: true,
      transactionId: txn._id,
      squarePaymentId: txn.squarePaymentId,
      amount: txn.amount,
      fee: txn.fee,
      totalCharged: txn.totalCharged,
      customerName: txn.customerName,
    });
  }

  // Resolve the recipient (worker) and their Square OAuth credentials.
  if (!txn.customerId) {
    return NextResponse.json(
      { error: "Tip is not associated with a recipient" },
      { status: 400 }
    );
  }
  const recipient = await Customer.findById(txn.customerId).select(
    "+squareAccessToken squareLocationId squareMerchantId bankAccountStatus name"
  );
  if (!recipient) {
    return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
  }
  if (
    !recipient.squareAccessToken ||
    !recipient.squareLocationId ||
    recipient.bankAccountStatus !== "connected"
  ) {
    return NextResponse.json(
      {
        error:
          "The recipient hasn't finished connecting their bank yet. Please ask them to complete Square onboarding and try again.",
      },
      { status: 409 }
    );
  }

  const isSandbox = process.env.SQUARE_ENVIRONMENT !== "production";

  // Per-request Square client scoped to the seller's OAuth token. We don't
  // reuse the platform `squareClient` here — that one settles money to the
  // platform, which is exactly what we're trying to avoid.
  const sellerClient = new SquareClient({
    token: recipient.squareAccessToken,
    environment: isSandbox ? SquareEnvironment.Sandbox : SquareEnvironment.Production,
  });

  try {
    const response = await sellerClient.payments.create({
      sourceId,
      idempotencyKey: randomUUID(),
      amountMoney: {
        amount: BigInt(Math.round(txn.totalCharged * 100)),
        currency: "USD",
      },
      locationId: recipient.squareLocationId,
      referenceId: quoteId,
      note: `Tip for ${txn.customerName || recipient.name || "recipient"}`,
    });

    const payment = response.payment;
    if (!payment || payment.status !== "COMPLETED") {
      txn.status = "failed";
      await txn.save();
      return NextResponse.json(
        { error: `Payment not completed (status: ${payment?.status ?? "unknown"})` },
        { status: 402 }
      );
    }

    txn.status = "processed";
    txn.squarePaymentId = payment.id;
    await txn.save();

    return NextResponse.json({
      success: true,
      transactionId: txn._id,
      squarePaymentId: payment.id,
      amount: txn.amount,
      fee: txn.fee,
      totalCharged: txn.totalCharged,
      customerName: txn.customerName,
    });
  } catch (err: unknown) {
    txn.status = "failed";
    await txn.save();

    // Square SDK (v44) throws errors carrying a structured `errors` array
    // (sometimes under `.body`). Pull out the real code/detail so we don't
    // mislabel card declines and validation failures as opaque 500s.
    const e = err as {
      statusCode?: number;
      message?: string;
      errors?: Array<{ category?: string; code?: string; detail?: string }>;
      body?: { errors?: Array<{ category?: string; code?: string; detail?: string }> };
    };
    const sqErrors = e?.errors || e?.body?.errors || [];
    const first = sqErrors[0];
    const code = first?.code || "";
    const detail =
      first?.detail || e?.message || "Square payment failed. Please try again.";

    console.error("[mobile/tip/charge] Square error:", {
      statusCode: e?.statusCode,
      code,
      category: first?.category,
      detail,
    });

    // Expired / revoked OAuth token — recipient must reconnect.
    if (
      e?.statusCode === 401 ||
      /UNAUTHORIZED|ACCESS_TOKEN_EXPIRED|ACCESS_TOKEN_REVOKED|INSUFFICIENT_SCOPES/i.test(
        `${code} ${detail}`
      )
    ) {
      return NextResponse.json(
        {
          error:
            "The recipient's Square connection is no longer valid. Please ask them to reconnect their bank.",
        },
        { status: 401 }
      );
    }

    // Card-side problems (decline, CVV, expiry, postal) are the customer's to
    // fix — surface the specific reason and use 402, not 500, so the app shows
    // it instead of a generic "server error". Map Square's raw codes to clear,
    // actionable messages so tippers don't see cryptic strings like
    // "Authorization error: 'INVALID_EXPIRATION'".
    const cardMessages: Record<string, string> = {
      INVALID_EXPIRATION:
        "The card's expiration date is invalid or has passed. Please check the expiry date and try again.",
      CARD_EXPIRED:
        "This card has expired. Please use a different card.",
      CVV_FAILURE:
        "The security code (CVV) is incorrect. Please re-enter it and try again.",
      VERIFY_CVV_FAILURE:
        "The security code (CVV) is incorrect. Please re-enter it and try again.",
      INVALID_POSTAL_CODE:
        "The postal/ZIP code doesn't match this card. Please check it and try again.",
      ADDRESS_VERIFICATION_FAILURE:
        "The billing ZIP code couldn't be verified. Please check it and try again.",
      VERIFY_AVS_FAILURE:
        "The billing ZIP code couldn't be verified. Please check it and try again.",
      INSUFFICIENT_FUNDS:
        "The card has insufficient funds. Please use a different card.",
      CARD_NOT_SUPPORTED:
        "This type of card isn't supported. Please use a different card.",
      INVALID_CARD:
        "The card details are invalid. Please re-enter your card and try again.",
      CARD_DECLINED:
        "Your card was declined. Please try a different card.",
      GENERIC_DECLINE:
        "Your card was declined. Please try a different card.",
    };
    const upperCode = code.toUpperCase();
    if (upperCode in cardMessages) {
      return NextResponse.json(
        { error: cardMessages[upperCode], code },
        { status: 402 }
      );
    }

    // Anything else: return the real Square detail (not a blank 500).
    return NextResponse.json(
      { error: detail, code },
      { status: e?.statusCode && e.statusCode >= 400 ? e.statusCode : 500 }
    );
  }
}
