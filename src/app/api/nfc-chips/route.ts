import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import NfcChip from "@/lib/models/NfcChip";
import Customer from "@/lib/models/Customer";

export async function GET() {
  await connectDB();
  const chips = await NfcChip.find().sort({ registeredAt: -1 });
  return NextResponse.json({ chips });
}

export async function POST(req: NextRequest) {
  await connectDB();
  const { chipUid, customerId } = await req.json();

  const existing = await NfcChip.findOne({ chipUid });
  if (existing) {
    return NextResponse.json(
      { error: "Chip UID already registered" },
      { status: 400 }
    );
  }

  let customerName = null;
  if (customerId) {
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }
    customerName = customer.name;
  }

  const chip = await NfcChip.create({
    chipUid,
    customerId: customerId || null,
    customerName,
  });

  return NextResponse.json(chip, { status: 201 });
}
