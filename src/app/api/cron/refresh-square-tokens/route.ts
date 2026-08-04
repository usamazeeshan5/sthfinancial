import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { refreshExpiringTokens } from "@/lib/squareOAuth";

// Scheduled by Vercel Cron (see vercel.json) to refresh Square OAuth tokens
// well before their 30-day expiry — Square recommends every 7 days or less.
// Protected by CRON_SECRET so it can't be triggered by the public.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  // Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`.
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const result = await refreshExpiringTokens(7);
  return NextResponse.json({ ok: true, ...result });
}
