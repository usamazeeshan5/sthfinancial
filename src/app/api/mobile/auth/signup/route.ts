import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import Customer from "@/lib/models/Customer";
import NfcChip from "@/lib/models/NfcChip";
import { signToken } from "@/lib/jwt";
import { generateUniqueChipCode } from "@/lib/generateUniqueChipCode";

export async function POST(req: NextRequest) {
  await connectDB();
  const { name, email, phone, password } = await req.json();

  if (!name || !email || !phone || !password) {
    return NextResponse.json(
      { error: "All fields are required" },
      { status: 400 }
    );
  }

  const existing = await Customer.findOne({ email });
  if (existing) {
    return NextResponse.json(
      { error: "Email already registered" },
      { status: 400 }
    );
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const customer = await Customer.create({
    name,
    email,
    phone,
    password: hashedPassword,
  });

  // Auto-generate a chip code for this customer at signup and link it to them.
  // The chip immediately appears (synced) in the admin panel's NFC Chips list.
  const chipUid = await generateUniqueChipCode();
  const chip = await NfcChip.create({
    chipUid,
    customerId: customer._id,
    customerName: customer.name,
    claimed: true,
    claimedAt: new Date(),
    batchId: "signup",
    status: "active",
  });

  const token = signToken({
    id: customer._id.toString(),
    email: customer.email,
    name: customer.name,
  });

  return NextResponse.json({
    token,
    user: {
      id: customer._id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
    },
    chipCode: chip.chipUid,
  });
}
