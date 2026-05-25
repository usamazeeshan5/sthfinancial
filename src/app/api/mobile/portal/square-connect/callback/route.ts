import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Customer from "@/lib/models/Customer";

// Square redirects the seller's browser here after they consent (or cancel)
// on the OAuth authorize page. We exchange the one-time `code` for an
// access/refresh token pair, persist it on the Customer record, then bounce
// the browser back into the mobile app via the `lovetap://` deep link.

const DEEP_LINK = "lovetap://payouts";

function deepLink(params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  return `${DEEP_LINK}?${qs}`;
}

function htmlRedirect(link: string, message: string) {
  // The `<a>` is a fallback in case the JS redirect doesn't fire (some in-app
  // browsers block window.location to custom schemes without a user gesture).
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><title>Returning to app...</title>
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <style>body{font-family:system-ui,sans-serif;padding:24px;color:#111}</style>
    </head><body>
      <p>${message}</p>
      <p><a href="${link}">Tap here if the app doesn't open automatically</a></p>
      <script>window.location.href=${JSON.stringify(link)};</script>
    </body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  if (oauthError) {
    return htmlRedirect(
      deepLink({ connected: "false", error: oauthError }),
      "Authorization was cancelled or denied."
    );
  }
  if (!code || !state) {
    return htmlRedirect(
      deepLink({ connected: "false", error: "missing_params" }),
      "Missing authorization code."
    );
  }

  const applicationId = process.env.SQUARE_APPLICATION_ID;
  const applicationSecret = process.env.SQUARE_APPLICATION_SECRET;
  if (!applicationId || !applicationSecret) {
    return htmlRedirect(
      deepLink({ connected: "false", error: "server_misconfigured" }),
      "Square OAuth is not fully configured on the server."
    );
  }

  const isSandbox = process.env.SQUARE_ENVIRONMENT !== "production";
  const oauthBase = isSandbox
    ? "https://connect.squareupsandbox.com"
    : "https://connect.squareup.com";

  const redirectUri =
    process.env.SQUARE_OAUTH_REDIRECT_URI ||
    `${url.origin}/api/mobile/portal/square-connect/callback`;

  try {
    await connectDB();

    const customer = await Customer.findById(state);
    if (!customer) {
      return htmlRedirect(
        deepLink({ connected: "false", error: "invalid_state" }),
        "Could not find your account. Please try again."
      );
    }

    const tokenResponse = await fetch(`${oauthBase}/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Square-Version": "2024-12-18",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: applicationId,
        client_secret: applicationSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errBody = await tokenResponse.text();
      console.error("[square-connect/callback] token exchange failed:", tokenResponse.status, errBody);
      return htmlRedirect(
        deepLink({ connected: "false", error: "token_exchange_failed" }),
        "Could not complete the Square connection. Please try again."
      );
    }

    const tokenData = (await tokenResponse.json()) as {
      access_token: string;
      refresh_token?: string;
      merchant_id: string;
      expires_at?: string;
      token_type?: string;
    };

    // Fetch the seller's main location. We need its ID to (a) initialize
    // the Web Payments SDK in the tipper flow and (b) attribute the charge
    // to the seller's location when calling Square Payments API.
    let locationId: string | null = null;
    try {
      const locResp = await fetch(`${oauthBase}/v2/locations`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          "Square-Version": "2024-12-18",
          Accept: "application/json",
        },
      });
      if (locResp.ok) {
        const locJson = (await locResp.json()) as {
          locations?: Array<{ id: string; status?: string; type?: string }>;
        };
        const locations = locJson.locations || [];
        // Prefer an active physical location; fall back to whatever's first.
        const preferred =
          locations.find((l) => l.status === "ACTIVE" && l.type === "PHYSICAL") ||
          locations.find((l) => l.status === "ACTIVE") ||
          locations[0];
        locationId = preferred?.id || null;
      } else {
        console.warn("[square-connect/callback] /v2/locations failed:", locResp.status);
      }
    } catch (locErr) {
      console.warn("[square-connect/callback] location fetch threw:", locErr);
    }

    customer.squareAccessToken = tokenData.access_token;
    customer.squareRefreshToken = tokenData.refresh_token || null;
    customer.squareMerchantId = tokenData.merchant_id;
    customer.squareTokenExpiresAt = tokenData.expires_at ? new Date(tokenData.expires_at) : null;
    customer.squareLocationId = locationId;
    customer.bankAccountStatus = "connected";
    await customer.save();

    return htmlRedirect(
      deepLink({ connected: "true" }),
      "Bank connected. Returning to the app..."
    );
  } catch (e: unknown) {
    console.error("[square-connect/callback] unexpected error:", e);
    return htmlRedirect(
      deepLink({ connected: "false", error: "callback_error" }),
      "Something went wrong completing the connection."
    );
  }
}
