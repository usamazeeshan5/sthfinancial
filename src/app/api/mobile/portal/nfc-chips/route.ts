import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import NfcChip from "@/lib/models/NfcChip";

export async function GET(req: NextRequest) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get("customerId");

  if (!customerId || !mongoose.Types.ObjectId.isValid(customerId)) {
    return NextResponse.json(
      { error: "A valid customerId is required" },
      { status: 400 }
    );
  }

  const chips = await NfcChip.find({ customerId })
    .sort({ registeredAt: -1 })
    .lean();

  // Normalize to the shape the mobile client expects (id, not _id) so every
  // field renders instead of showing blank.
  const shaped = chips.map((c) => ({
    id: String(c._id),
    chipUid: c.chipUid,
    customerId: c.customerId ? String(c.customerId) : null,
    customerName: c.customerName ?? null,
    status: c.status,
    claimed: c.claimed ?? false,
    batchId: c.batchId ?? null,
    registeredAt: c.registeredAt,
  }));

  return NextResponse.json({ chips: shaped });
}
