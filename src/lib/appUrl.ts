import type { NextRequest } from "next/server";

// Resolves the public origin this app is served from — used to build the tap
// URLs that get programmed onto physical NFC chips.
//
// Prefer NEXT_PUBLIC_APP_URL so the URL stays stable and branded (lovetap.me)
// regardless of which host actually served the request (vercel.app preview
// deployments, custom domains, localhost). Chips are locked read-only once
// programmed, so the URL they carry must never depend on request context.
export function getAppOrigin(req: NextRequest): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) return explicit.trim().replace(/\/+$/, "");

  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (host) {
    const proto = req.headers.get("x-forwarded-proto") || "https";
    return `${proto}://${host}`;
  }
  return new URL(req.url).origin;
}

// The exact URL to encode onto the chip carrying `chipUid`.
export function tapUrl(origin: string, chipUid: string): string {
  return `${origin}/t/${encodeURIComponent(chipUid)}`;
}
