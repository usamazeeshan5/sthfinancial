import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import Customer from "@/lib/models/Customer";
import NfcChip from "@/lib/models/NfcChip";
import { generateUniqueChipCode } from "@/lib/generateUniqueChipCode";

export async function GET(req: NextRequest) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");

  const query = search
    ? {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      }
    : {};

  const [customers, total] = await Promise.all([
    Customer.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select("-password"),
    Customer.countDocuments(query),
  ]);

  return NextResponse.json({ customers, total, page, limit });
}

export async function POST(req: NextRequest) {
  await connectDB();
  const body = await req.json();
  const { name, email, phone, password } = body;

  const existing = await Customer.findOne({ email });
  if (existing) {
    return NextResponse.json({ error: "Email already exists" }, { status: 400 });
  }

  const hashedPassword = await bcrypt.hash(password || "default123", 12);
  const customer = await Customer.create({
    name,
    email,
    phone,
    password: hashedPassword,
  });

  // Auto-generate a chip code and link it to the new customer — same behaviour
  // as mobile self-signup, so every customer has a chip from creation.
  const chipUid = await generateUniqueChipCode();
  await NfcChip.create({
    chipUid,
    customerId: customer._id,
    customerName: customer.name,
    claimed: true,
    claimedAt: new Date(),
    batchId: "admin",
    status: "active",
  });

  const { password: _, ...customerData } = customer.toObject();
  return NextResponse.json({ ...customerData, chipCode: chipUid }, { status: 201 });
}
