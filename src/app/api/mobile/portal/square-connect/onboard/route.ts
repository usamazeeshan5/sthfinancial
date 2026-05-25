import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Customer from "@/lib/models/Customer";
import { verifyToken } from "@/lib/jwt";

// Returns a Square OAuth authorize URL the mobile app should open in the
// device browser. After the seller consents, Square redirects back to the
// callback route in this folder, which exchanges the code for tokens.
//
// Required env vars:
//   SQUARE_APPLICATION_ID     — app ID from the Square Developer Dashboard
//   SQUARE_APPLICATION_SECRET — app secret (used by the callback)
//   SQUARE_OAUTH_REDIRECT_URI — must match the redirect URI registered in
//                               the Square Developer Dashboard EXACTLY.
//                               Defaults to <vercel-host>/api/mobile/portal/square-connect/callback
//                               based on the request, but should be set explicitly in prod.

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
      { error: "Square OAuth not configured: SQUARE_APPLICATION_ID is missing." },
      { status: 501 }
    );
  }

  const isSandbox = process.env.SQUARE_ENVIRONMENT !== "production";
  const oauthBase = isSandbox
    ? "https://connect.squareupsandbox.com"
    : "https://connect.squareup.com";

  // Resolve the redirect URI. Prefer an explicit env var so it matches the
  // value registered in Square's Developer Dashboard exactly; otherwise
  // derive it from the request host as a sensible default.
  const origin =
    req.headers.get("x-forwarded-host")
      ? `https://${req.headers.get("x-forwarded-host")}`
      : new URL(req.url).origin;
  const redirectUri =
    process.env.SQUARE_OAUTH_REDIRECT_URI ||
    `${origin}/api/mobile/portal/square-connect/callback`;

  const scope = [
    "MERCHANT_PROFILE_READ",
    "PAYMENTS_WRITE",
    "PAYMENTS_READ",
    "PAYOUTS_READ",
    "BANK_ACCOUNTS_READ",
  ].join(" ");

  const state = customer._id.toString();
  const params = new URLSearchParams({
    client_id: applicationId,
    scope,
    session: "false",
    state,
    redirect_uri: redirectUri,
  });
  const url = `${oauthBase}/oauth2/authorize?${params.toString()}`;

  // Mark onboarding as in-flight so the status endpoint can show "pending"
  // until the callback completes.
  if (customer.bankAccountStatus !== "connected") {
    customer.bankAccountStatus = "pending";
    await customer.save();
  }

  return NextResponse.json({ url });
}
