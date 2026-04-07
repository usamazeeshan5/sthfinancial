import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import NfcChip from "@/lib/models/NfcChip";

export async function GET(req: NextRequest) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get("customerId");

  if (!customerId) {
    return NextResponse.json(
      { error: "customerId is required" },
      { status: 400 }
    );
  }

  const chips = await NfcChip.find({ customerId });
  return NextResponse.json({ chips });
}
