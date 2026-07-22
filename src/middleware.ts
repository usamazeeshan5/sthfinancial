import { NextRequest, NextResponse } from "next/server";

// This middleware does two jobs:
//  1. CORS for the mobile API (/api/*) — so the web build of the mobile app
//     (EAS Hosting on *.expo.app) can call it from the browser.
//  2. Hostname routing for the two web faces of the single deployment:
//       app.lovetap.me        → the public tip page (/t/<code>) only
//       adminpanel.lovetap.me → the admin panel only
//       lovetap.me (apex)     → unchanged; still serves everything + the API,
//                               so existing links and the mobile app keep working.

// --- CORS (mobile API) ---
const ALLOWED_ORIGIN_PATTERNS: RegExp[] = [
  /^https?:\/\/localhost(:\d+)?$/,
  /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
  // EAS Hosting production + preview deployments for this project
  /^https:\/\/sth-financial-mobile-app(--[a-z0-9]+)?\.expo\.app$/,
  /^https:\/\/lovetap\.me$/,
  /^https:\/\/(app|adminpanel)\.lovetap\.me$/,
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

function handleApiCors(req: NextRequest): NextResponse {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
  }
  const res = NextResponse.next();
  for (const [key, value] of Object.entries(corsHeaders(origin))) {
    res.headers.set(key, value);
  }
  return res;
}

// --- Hostname routing (web) ---
const APP_HOST = "app.lovetap.me";
const ADMIN_HOST = "adminpanel.lovetap.me";

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // API keeps its CORS behaviour and stays reachable on every host.
  if (pathname.startsWith("/api")) {
    return handleApiCors(req);
  }

  const host = (req.headers.get("host") || "").toLowerCase().split(":")[0];
  const isTip = pathname === "/t" || pathname.startsWith("/t/");

  if (host === APP_HOST && !isTip) {
    // Webview host: admin/other paths belong on the admin host.
    return NextResponse.redirect(
      new URL(`https://${ADMIN_HOST}${pathname}${search}`)
    );
  }
  if (host === ADMIN_HOST && isTip) {
    // Admin host: tip links belong on the webview host.
    return NextResponse.redirect(
      new URL(`https://${APP_HOST}${pathname}${search}`)
    );
  }

  return NextResponse.next();
}

export const config = {
  // Run on the API (for CORS) and on page routes (for host routing), but skip
  // Next internals and any file with an extension (logo.jpeg, favicon.ico…).
  matcher: ["/((?!_next|.*\\..*).*)"],
};
