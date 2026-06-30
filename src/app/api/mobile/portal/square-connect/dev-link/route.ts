import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Customer from "@/lib/models/Customer";
import { verifyToken } from "@/lib/jwt";

// DEV / SANDBOX ONLY shortcut.
//
// Square's Sandbox OAuth authorize page can only be completed by a sandbox
// seller who is signed in IN THE SAME BROWSER that opens the link — which is
// impractical on a physical test device (sandbox sellers have no deliverable
// email, so you can't reset a password to log in on the phone). To unblock
// device testing, this endpoint links the seller directly using the app's
// Sandbox Access Token instead of running the OAuth dance.
//
// It mirrors exactly what the OAuth callback writes to the Customer record, so
// the rest of the app (payouts, balance, charges) behaves identically.
//
// Required env var:
//   SQUARE_SANDBOX_ACCESS_TOKEN — the app's Sandbox Access Token from
//     developer.squareup.com → your app → Sandbox → Credentials.
//
// This route refuses to run when SQUARE_ENVIRONMENT=production.

export async function POST(req: NextRequest) {
  if (process.env.SQUARE_ENVIRONMENT === "production") {
    return NextResponse.json(
      { error: "Not available in production." },
      { status: 403 }
    );
  }

  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const payload = verifyToken(auth.slice(7));
  if (!payload?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessToken = process.env.SQUARE_SANDBOX_ACCESS_TOKEN;
  if (!accessToken) {
    return NextResponse.json(
      {
        error:
          "SQUARE_SANDBOX_ACCESS_TOKEN is not set. Add your app's Sandbox Access Token (Developer Console → your app → Sandbox → Credentials) to the server env.",
      },
      { status: 501 }
    );
  }

  await connectDB();
  const customer = await Customer.findById(payload.id);
  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const oauthBase = "https://connect.squareupsandbox.com";
  const squareHeaders = {
    Authorization: `Bearer ${accessToken}`,
    "Square-Version": "2024-12-18",
    Accept: "application/json",
  };

  // Resolve the merchant the token belongs to.
  let merchantId: string | null = null;
  try {
    const merchResp = await fetch(`${oauthBase}/v2/merchants`, {
      method: "GET",
      headers: squareHeaders,
    });
    if (!merchResp.ok) {
      const body = await merchResp.text();
      console.error("[dev-link] /v2/merchants failed:", merchResp.status, body);
      return NextResponse.json(
        { error: "Sandbox token rejected by Square. Check SQUARE_SANDBOX_ACCESS_TOKEN." },
        { status: 502 }
      );
    }
    const merchJson = (await merchResp.json()) as {
      merchant?: Array<{ id: string }>;
    };
    merchantId = merchJson.merchant?.[0]?.id || null;
  } catch (e) {
    console.error("[dev-link] merchant fetch threw:", e);
    return NextResponse.json({ error: "Could not reach Square." }, { status: 502 });
  }

  // Resolve the seller's main location (same preference logic as the callback).
  let locationId: string | null = null;
  try {
    const locResp = await fetch(`${oauthBase}/v2/locations`, {
      method: "GET",
      headers: squareHeaders,
    });
    if (locResp.ok) {
      const locJson = (await locResp.json()) as {
        locations?: Array<{ id: string; status?: string; type?: string }>;
      };
      const locations = locJson.locations || [];
      const preferred =
        locations.find((l) => l.status === "ACTIVE" && l.type === "PHYSICAL") ||
        locations.find((l) => l.status === "ACTIVE") ||
        locations[0];
      locationId = preferred?.id || null;
    } else {
      console.warn("[dev-link] /v2/locations failed:", locResp.status);
    }
  } catch (e) {
    console.warn("[dev-link] location fetch threw:", e);
  }

  customer.squareAccessToken = accessToken;
  customer.squareRefreshToken = null; // sandbox PAT has no refresh token
  customer.squareMerchantId = merchantId;
  customer.squareTokenExpiresAt = null;
  customer.squareLocationId = locationId;
  customer.bankAccountStatus = "connected";
  await customer.save();

  return NextResponse.json({
    success: true,
    merchantId,
    locationId,
  });
}
