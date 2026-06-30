import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import NfcChip from "@/lib/models/NfcChip";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
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
