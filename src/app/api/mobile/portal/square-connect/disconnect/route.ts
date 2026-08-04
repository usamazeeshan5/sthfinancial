import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Customer from "@/lib/models/Customer";
import { verifyToken } from "@/lib/jwt";
import { revokeCustomerSquareToken } from "@/lib/squareOAuth";

// POST /api/mobile/portal/square-connect/disconnect
// The worker revokes LoveTap's Square authorization. Their account immediately
// stops accepting tips (bankAccountStatus -> disconnected, tokens cleared).
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const payload = verifyToken(auth.slice(7));
  if (!payload?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const customer = await Customer.findById(payload.id).select(
    "+squareAccessToken +squareRefreshToken bankAccountStatus"
  );
  if (!customer) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  if (customer.squareAccessToken) {
    await revokeCustomerSquareToken(customer.squareAccessToken);
  }

  customer.squareAccessToken = null;
  customer.squareRefreshToken = null;
  customer.squareTokenExpiresAt = null;
  customer.squareLocationId = null;
  customer.squareMerchantId = null;
  customer.bankAccountStatus = "disconnected";
  await customer.save();

  return NextResponse.json({ success: true, status: "disconnected" });
}
