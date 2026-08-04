import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import NfcChip from "@/lib/models/NfcChip";
import { rateLimit, clientIp } from "@/lib/rateLimit";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  // Throttle code lookups so codes can't be brute-force enumerated.
  const rl = rateLimit(`chip:${clientIp(req)}`, 30, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  await connectDB();
  const { uid } = await params;
  // Normalize: NFC reads and manual entry can vary in case/whitespace, so match
  // the stored chipUid case-insensitively against the trimmed input.
  const decodedUid = decodeURIComponent(uid).trim();

  const chip = await NfcChip.findOne({
    chipUid: new RegExp(`^${escapeRegex(decodedUid)}$`, "i"),
    status: "active",
  });
  if (!chip || !chip.customerId) {
    return NextResponse.json(
      { error: "Chip not found or not linked to a customer" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    id: chip._id,
    chipUid: chip.chipUid,
    customerId: chip.customerId,
    customerName: chip.customerName,
    status: chip.status,
  });
}
