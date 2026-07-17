import { NextRequest, NextResponse } from "next/server";

// CORS for the mobile API so the web build of the mobile app (hosted on
// EAS Hosting at *.expo.app) can call it from the browser. Native apps don't
// enforce CORS, so this only matters for the web deployment. Auth is via
// Bearer token (no cookies), so we reflect a small allowlist of origins.
const ALLOWED_ORIGIN_PATTERNS: RegExp[] = [
  /^https?:\/\/localhost(:\d+)?$/,
  /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
  // EAS Hosting production + preview deployments for this project
  /^https:\/\/sth-financial-mobile-app(--[a-z0-9]+)?\.expo\.app$/,
  /^https:\/\/lovetap\.me$/,
];

function allowedOrigin(origin: string | null): string | null {
  if (!origin) return null;
  return ALLOWED_ORIGIN_PATTERNS.some((re) => re.test(origin)) ? origin : null;
}

function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
  const allow = allowedOrigin(origin);
  if (allow) headers["Access-Control-Allow-Origin"] = allow;
  return headers;
}

export function middleware(req: NextRequest) {
  const origin = req.headers.get("origin");

  // Preflight
  if (req.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
  }

  const res = NextResponse.next();
  for (const [key, value] of Object.entries(corsHeaders(origin))) {
    res.headers.set(key, value);
  }
  return res;
}

export const config = {
  matcher: "/api/:path*",
};
