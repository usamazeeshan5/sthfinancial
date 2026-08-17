// Helpers for inspecting a connected seller's Square location capabilities.
//
// Apple Pay, Google Pay, and plain card payments all require the seller's
// location to have the CREDIT_CARD_PROCESSING capability. New sellers who
// connect via OAuth but haven't finished Square's account activation only get
// AUTOMATIC_TRANSFERS, so we must detect this and avoid presenting a tip page
// that can't actually take money.

function squareBase(): string {
  return process.env.SQUARE_ENVIRONMENT === "production"
    ? "https://connect.squareup.com"
    : "https://connect.squareupsandbox.com";
}

export interface LocationCapability {
  ok: boolean;
  cardProcessing: boolean;
  status?: string;
  country?: string | null;
  currency?: string | null;
  error?: string;
}

// Fetches a single location and reports whether it can process cards.
export async function getLocationCapability(
  accessToken: string,
  locationId: string
): Promise<LocationCapability> {
  try {
    const resp = await fetch(`${squareBase()}/v2/locations/${locationId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Square-Version": "2024-12-18",
        Accept: "application/json",
      },
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      return {
        ok: false,
        cardProcessing: false,
        error: `http_${resp.status}`,
      };
    }
    const loc = data.location || {};
    const caps: string[] = loc.capabilities || [];
    return {
      ok: true,
      cardProcessing: caps.includes("CREDIT_CARD_PROCESSING"),
      status: loc.status,
      country: loc.country ?? null,
      currency: loc.currency ?? null,
    };
  } catch (e) {
    return {
      ok: false,
      cardProcessing: false,
      error: e instanceof Error ? e.message : "fetch_failed",
    };
  }
}

// Lists all locations and returns the best one for taking tips: an ACTIVE
// location that can process cards, if any; otherwise the first ACTIVE
// location; otherwise the first location. Also reports whether the chosen
// location can process cards, so the caller can persist it.
export async function pickBestLocation(accessToken: string): Promise<{
  locationId: string | null;
  cardProcessing: boolean;
  country: string | null;
  currency: string | null;
}> {
  try {
    const resp = await fetch(`${squareBase()}/v2/locations`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Square-Version": "2024-12-18",
        Accept: "application/json",
      },
    });
    if (!resp.ok) {
      return { locationId: null, cardProcessing: false, country: null, currency: null };
    }
    const json = (await resp.json()) as {
      locations?: Array<{
        id: string;
        status?: string;
        type?: string;
        country?: string;
        currency?: string;
        capabilities?: string[];
      }>;
    };
    const locations = json.locations || [];
    const canCard = (l: { capabilities?: string[] }) =>
      (l.capabilities || []).includes("CREDIT_CARD_PROCESSING");

    const preferred =
      locations.find((l) => l.status === "ACTIVE" && canCard(l)) ||
      locations.find((l) => l.status === "ACTIVE" && l.type === "PHYSICAL") ||
      locations.find((l) => l.status === "ACTIVE") ||
      locations[0];

    if (!preferred) {
      return { locationId: null, cardProcessing: false, country: null, currency: null };
    }
    return {
      locationId: preferred.id,
      cardProcessing: canCard(preferred),
      country: preferred.country ?? null,
      currency: preferred.currency ?? null,
    };
  } catch {
    return { locationId: null, cardProcessing: false, country: null, currency: null };
  }
}
