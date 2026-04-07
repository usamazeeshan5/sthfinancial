import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import NfcChip from "@/lib/models/NfcChip";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  await connectDB();
  const { uid } = await params;
  const decodedUid = decodeURIComponent(uid);

  const chip = await NfcChip.findOne({ chipUid: decodedUid, status: "active" });
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
