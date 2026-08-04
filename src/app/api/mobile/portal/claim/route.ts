import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Customer from "@/lib/models/Customer";
import { verifyToken } from "@/lib/jwt";
import { assignChipCode } from "@/lib/assignChipCode";
import { rateLimit, clientIp } from "@/lib/rateLimit";

// POST /api/mobile/portal/claim  { code }
// The logged-in worker claims an unclaimed chip code and adds it to their
// account. Used by the web activation flow ("Add this LoveTap to your account").
export async function POST(req: NextRequest) {
  // Throttle activation attempts so codes can't be brute-force claimed.
  const rl = rateLimit(`claim:${clientIp(req)}`, 10, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
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

  const { code } = await req.json();
  if (!code || typeof code !== "string") {
    return NextResponse.json({ error: "A chip code is required." }, { status: 400 });
  }

  await connectDB();
  const customer = await Customer.findById(payload.id).select("name");
  if (!customer) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  const result = await assignChipCode(code, payload.id, customer.name);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ success: true, chipUid: result.chipUid });
}
