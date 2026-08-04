import Customer from "@/lib/models/Customer";

// Square OAuth token maintenance.
//
// Access tokens expire after 30 days; Square recommends refreshing them every
// 7 days or less. Refresh is done server-side with the app's client secret and
// the seller's stored refresh token. Tokens never appear in URLs or the client.

function oauthBase(): string {
  return process.env.SQUARE_ENVIRONMENT === "production"
    ? "https://connect.squareup.com"
    : "https://connect.squareupsandbox.com";
}

export interface RefreshResult {
  ok: boolean;
  error?: string;
}

// Refreshes one customer's Square access token using their refresh token.
// Expects a Customer document loaded with +squareAccessToken +squareRefreshToken.
export async function refreshCustomerSquareToken(
  customer: {
    _id: unknown;
    squareRefreshToken?: string | null;
    save: () => Promise<unknown>;
    squareAccessToken?: string | null;
    squareTokenExpiresAt?: Date | null;
  }
): Promise<RefreshResult> {
  const applicationId = process.env.SQUARE_APPLICATION_ID;
  const applicationSecret = process.env.SQUARE_APPLICATION_SECRET;
  if (!applicationId || !applicationSecret) {
    return { ok: false, error: "Square OAuth is not configured on the server." };
  }
  if (!customer.squareRefreshToken) {
    return { ok: false, error: "No refresh token on file — worker must reconnect Square." };
  }

  const res = await fetch(`${oauthBase()}/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Square-Version": "2024-12-18",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: applicationId,
      client_secret: applicationSecret,
      grant_type: "refresh_token",
      refresh_token: customer.squareRefreshToken,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("[squareOAuth] refresh failed:", res.status, body);
    return { ok: false, error: `Refresh failed (${res.status}).` };
  }

  const data = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_at?: string;
  };
  customer.squareAccessToken = data.access_token;
  if (data.refresh_token) customer.squareRefreshToken = data.refresh_token;
  customer.squareTokenExpiresAt = data.expires_at ? new Date(data.expires_at) : null;
  await customer.save();
  return { ok: true };
}

// Best-effort lazy refresh: if the token expires within `withinDays`, refresh it
// now. Called before charging so an active seller's token never lapses mid-use.
export async function ensureFreshToken(
  customer: {
    _id: unknown;
    squareRefreshToken?: string | null;
    squareTokenExpiresAt?: Date | null;
    squareAccessToken?: string | null;
    save: () => Promise<unknown>;
  },
  withinDays = 7
): Promise<void> {
  const exp = customer.squareTokenExpiresAt
    ? new Date(customer.squareTokenExpiresAt).getTime()
    : 0;
  if (!exp) return; // unknown expiry — leave as-is
  const threshold = Date.now() + withinDays * 24 * 60 * 60 * 1000;
  if (exp <= threshold && customer.squareRefreshToken) {
    await refreshCustomerSquareToken(customer);
  }
}

// Refreshes every connected seller whose token expires within `withinDays`.
// Returns counts + the list of failures for alerting. Used by the cron endpoint.
export async function refreshExpiringTokens(withinDays = 7) {
  const cutoff = new Date(Date.now() + withinDays * 24 * 60 * 60 * 1000);
  const customers = await Customer.find({
    squareRefreshToken: { $ne: null },
    squareTokenExpiresAt: { $ne: null, $lte: cutoff },
  }).select("+squareAccessToken +squareRefreshToken squareTokenExpiresAt name email");

  let refreshed = 0;
  const failures: Array<{ id: string; name: string; error: string }> = [];
  for (const c of customers) {
    const r = await refreshCustomerSquareToken(c);
    if (r.ok) refreshed++;
    else failures.push({ id: String(c._id), name: c.name, error: r.error || "unknown" });
  }
  if (failures.length) {
    console.error("[squareOAuth] token refresh failures:", failures);
  }
  return { checked: customers.length, refreshed, failures };
}

// Revokes a seller's Square OAuth authorization (used by "Disconnect Square").
// After this, LoveTap can no longer charge for the worker until they reconnect.
export async function revokeCustomerSquareToken(accessToken: string): Promise<RefreshResult> {
  const applicationId = process.env.SQUARE_APPLICATION_ID;
  const applicationSecret = process.env.SQUARE_APPLICATION_SECRET;
  if (!applicationId || !applicationSecret) {
    return { ok: false, error: "Square OAuth is not configured on the server." };
  }
  try {
    const res = await fetch(`${oauthBase()}/oauth2/revoke`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Square-Version": "2024-12-18",
        Accept: "application/json",
        Authorization: `Client ${applicationSecret}`,
      },
      body: JSON.stringify({ client_id: applicationId, access_token: accessToken }),
    });
    // Even if Square rejects (already-revoked/expired), we still clear locally.
    if (!res.ok) {
      const body = await res.text();
      console.warn("[squareOAuth] revoke non-OK:", res.status, body);
    }
    return { ok: true };
  } catch (e) {
    console.warn("[squareOAuth] revoke error:", e);
    return { ok: true }; // clear locally regardless
  }
}
