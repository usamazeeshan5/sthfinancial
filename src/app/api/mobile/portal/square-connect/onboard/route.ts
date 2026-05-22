import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Customer from "@/lib/models/Customer";
import { verifyToken } from "@/lib/jwt";

// NOTE: Square's multi-merchant model uses OAuth (not API-created "merchant accounts"
// like Stripe Connect). To finish this endpoint you need to:
//   1. Set SQUARE_APPLICATION_ID and SQUARE_APPLICATION_SECRET in env
//   2. Add OAuth callback at /api/mobile/portal/square-connect/callback that
//      calls squareClient.oAuth.obtainToken({ code, grantType: "authorization_code" })
//      and stores the seller's access_token + merchant_id on the Customer record
//   3. Add fields squareAccessToken + squareRefreshToken to the Customer model
//   4. Use the seller's access_token (not the platform's) when charging tips destined
//      for that seller, so funds settle to the seller's own Square balance
//
// Docs: https://developer.squareup.com/docs/oauth-api/overview

export async function POST(req: NextRequest) {
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

  const applicationId = process.env.SQUARE_APPLICATION_ID;
  if (!applicationId) {
    return NextResponse.json(
      { error: "Square OAuth not yet configured. See route comment for setup steps." },
      { status: 501 }
    );
  }

  const isSandbox = process.env.SQUARE_ENVIRONMENT !== "production";
  const oauthBase = isSandbox
    ? "https://connect.squareupsandbox.com"
    : "https://connect.squareup.com";

  const scope = [
    "MERCHANT_PROFILE_READ",
    "PAYMENTS_WRITE",
    "PAYMENTS_READ",
    "PAYOUTS_READ",
    "BANK_ACCOUNTS_READ",
  ].join(" ");

  const state = customer._id.toString();
  const url = `${oauthBase}/oauth2/authorize?client_id=${applicationId}&scope=${encodeURIComponent(scope)}&session=false&state=${state}`;

  return NextResponse.json({ url });
}

export async function GET() {
  return new Response(
    `<html><body><p>Returning to app...</p><script>window.location.href="lovetap://payouts";</script></body></html>`,
    { headers: { "Content-Type": "text/html" } }
  );
}
