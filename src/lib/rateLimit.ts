import { NextRequest } from "next/server";

// Lightweight in-memory rate limiter. Per serverless instance, this is a
// best-effort baseline against code-guessing / brute-force claiming (a full
// distributed limiter would use Redis; this covers the common abuse case).
const buckets = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitResult {
  ok: boolean;
  retryAfterSec: number;
}

// Allows `max` requests per `windowMs` for a given key. Returns ok:false when
// the caller has exceeded the limit in the current window.
export function rateLimit(key: string, max: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0 };
  }
  if (b.count >= max) {
    return { ok: false, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) };
  }
  b.count += 1;
  return { ok: true, retryAfterSec: 0 };

  // (Old buckets are overwritten on next use after resetAt; the map stays small
  // for typical traffic. A periodic sweep could be added if needed.)
}

// Best-effort client IP from common proxy headers (Vercel sets x-forwarded-for).
export function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}
