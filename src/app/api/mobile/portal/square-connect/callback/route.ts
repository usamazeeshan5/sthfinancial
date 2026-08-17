import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Customer from "@/lib/models/Customer";
import { pickBestLocation } from "@/lib/squareCapabilities";

// Square redirects the seller's browser here after they consent (or cancel)
// on the OAuth authorize page. We exchange the one-time `code` for an
// access/refresh token pair, persist it on the Customer record, then bounce
// the browser back into the mobile app via the `lovetap://` deep link.

const DEEP_LINK = "lovetap://payouts";
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://app.lovetap.me").replace(/\/+$/, "");

function deepLink(params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  return `${DEEP_LINK}?${qs}`;
}

// Parses the OAuth state: "<customerId>" (mobile, legacy) or
// "<customerId>.web" / "<customerId>.app".
function parseState(state: string): { customerId: string; platform: "web" | "app" } {
  const [customerId, plat] = state.split(".");
  return { customerId, platform: plat === "web" ? "web" : "app" };
}

// Finishes the OAuth flow: web flows get a real redirect to the worker portal;
// mobile flows get the deep-link bounce page.
function finish(
  platform: "web" | "app",
  params: Record<string, string>,
  message: string
): Response {
  if (platform === "web") {
    const dest = `${APP_URL}/portal?${new URLSearchParams({
      square: params.connected === "true" ? "connected" : "error",
      ...(params.error ? { reason: params.error } : {}),
    }).toString()}`;
    return Response.redirect(dest, 302);
  }
  return htmlRedirect(deepLink(params), message);
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

  const platform = state ? parseState(state).platform : "app";

  if (oauthError) {
    return finish(
      platform,
      { connected: "false", error: oauthError },
      "Authorization was cancelled or denied."
    );
  }
  if (!code || !state) {
    return finish(
      platform,
      { connected: "false", error: "missing_params" },
      "Missing authorization code."
    );
  }

  const { customerId } = parseState(state);

  const applicationId = process.env.SQUARE_APPLICATION_ID;
  const applicationSecret = process.env.SQUARE_APPLICATION_SECRET;
  if (!applicationId || !applicationSecret) {
    return finish(
      platform,
      { connected: "false", error: "server_misconfigured" },
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

    const customer = await Customer.findById(customerId);
    if (!customer) {
      return finish(
        platform,
        { connected: "false", error: "invalid_state" },
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
      return finish(
        platform,
        { connected: "false", error: "token_exchange_failed" },
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

    // Fetch the seller's locations and pick the best one for taking tips —
    // preferring an ACTIVE location that can actually process cards. We also
    // record whether card processing is available: a brand-new seller who
    // hasn't finished Square activation only has AUTOMATIC_TRANSFERS, which
    // means no card / Apple Pay / Google Pay works yet.
    const best = await pickBestLocation(tokenData.access_token);

    customer.squareAccessToken = tokenData.access_token;
    customer.squareRefreshToken = tokenData.refresh_token || null;
    customer.squareMerchantId = tokenData.merchant_id;
    customer.squareTokenExpiresAt = tokenData.expires_at ? new Date(tokenData.expires_at) : null;
    customer.squareLocationId = best.locationId;
    customer.squareCardProcessing = best.cardProcessing;
    customer.squareLocationCountry = best.country;
    customer.squareLocationCurrency = best.currency;
    customer.bankAccountStatus = "connected";
    await customer.save();

    return finish(
      platform,
      {
        connected: "true",
        // Signal that Square is linked but not yet able to take payments, so
        // the portal can prompt the worker to finish activation.
        ...(best.cardProcessing ? {} : { activation: "incomplete" }),
      },
      best.cardProcessing
        ? "Bank connected. Returning to the app..."
        : "Square connected — finish activating your Square account to start receiving tips."
    );
  } catch (e: unknown) {
    console.error("[square-connect/callback] unexpected error:", e);
    return finish(
      platform,
      { connected: "false", error: "callback_error" },
      "Something went wrong completing the connection."
    );
  }
}
