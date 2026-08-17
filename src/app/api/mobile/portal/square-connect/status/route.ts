import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Customer from "@/lib/models/Customer";
import { verifyToken } from "@/lib/jwt";
import { getLocationCapability } from "@/lib/squareCapabilities";

// Returns the current Square seller-connection state for the authed customer.
// "connected" = we hold a valid OAuth access token for this seller.
//
// Once the OAuth flow is implemented (see square-connect/onboard/route.ts),
// extend this to call squareClient.merchants.retrieveMerchant(merchantId)
// using the seller's stored access token to verify it's still valid.

export async function GET(req: NextRequest) {
  await connectDB();

  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const payload = verifyToken(auth.slice(7));
  if (!payload?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Need to explicitly select the access token since it's `select: false`
  // on the schema — without it, hasConnection would always be false.
  const customer = await Customer.findById(payload.id).select(
    "+squareAccessToken bankAccountStatus squareMerchantId squareLocationId squareCardProcessing"
  );
  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const hasConnection = !!customer.squareMerchantId && !!customer.squareAccessToken;

  // Whether the seller can actually take card / Apple Pay / Google Pay yet.
  // If they're connected but our stored flag says "no", re-check live once so
  // an account that has since finished Square activation heals automatically.
  let cardProcessing = !!customer.squareCardProcessing;
  if (hasConnection && !cardProcessing && customer.squareLocationId && customer.squareAccessToken) {
    const cap = await getLocationCapability(
      customer.squareAccessToken,
      customer.squareLocationId
    );
    if (cap.ok && cap.cardProcessing) {
      cardProcessing = true;
      customer.squareCardProcessing = true;
      if (cap.country) customer.squareLocationCountry = cap.country;
      if (cap.currency) customer.squareLocationCurrency = cap.currency;
      await customer.save();
    }
  }

  return NextResponse.json({
    status: hasConnection
      ? customer.bankAccountStatus
      : customer.bankAccountStatus === "pending"
      ? "pending"
      : "disconnected",
    chargesEnabled: hasConnection && cardProcessing,
    detailsSubmitted: hasConnection,
    // True once Square can actually process card/Apple Pay/Google Pay.
    cardProcessing,
    // Connected to Square but activation not finished — worker must complete
    // identity/business/bank details in Square before they can receive tips.
    activationIncomplete: hasConnection && !cardProcessing,
  });
}
