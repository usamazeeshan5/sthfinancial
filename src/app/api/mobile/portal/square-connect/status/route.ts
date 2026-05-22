import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Customer from "@/lib/models/Customer";
import { verifyToken } from "@/lib/jwt";

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

  const customer = await Customer.findById(payload.id);
  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const hasConnection = !!customer.squareMerchantId;

  return NextResponse.json({
    status: hasConnection ? customer.bankAccountStatus : "disconnected",
    chargesEnabled: hasConnection,
    detailsSubmitted: hasConnection,
  });
}
