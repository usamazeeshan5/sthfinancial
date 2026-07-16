import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import Customer from "@/lib/models/Customer";
import NfcChip from "@/lib/models/NfcChip";
import { generateUniqueChipCode } from "@/lib/generateUniqueChipCode";
import { assignChipCode } from "@/lib/assignChipCode";

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
  const { name, email, phone, password, chipCode } = body;

  const existing = await Customer.findOne({ email });
  if (existing) {
    return NextResponse.json({ error: "Email already exists" }, { status: 400 });
  }

  // When an explicit code is supplied, validate it BEFORE creating the customer
  // so a bad/taken code doesn't leave a half-created account behind.
  const wantedCode = typeof chipCode === "string" ? chipCode.trim() : "";
  if (wantedCode) {
    const target = await NfcChip.findOne({
      chipUid: new RegExp(`^${wantedCode.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
    });
    if (!target) {
      return NextResponse.json(
        { error: `No chip found with code "${wantedCode}". Generate it in a batch first.` },
        { status: 404 }
      );
    }
    if (target.customerId) {
      return NextResponse.json(
        { error: `Chip "${target.chipUid}" is already assigned.` },
        { status: 409 }
      );
    }
  }

  const hashedPassword = await bcrypt.hash(password || "default123", 12);
  const customer = await Customer.create({
    name,
    email,
    phone,
    password: hashedPassword,
  });

  let chipUid: string;
  if (wantedCode) {
    // Claim the requested batch code for this customer.
    const result = await assignChipCode(wantedCode, customer._id.toString(), customer.name);
    if (!result.ok) {
      // Extremely unlikely (validated above) — roll back the customer so we
      // don't strand an account with no chip.
      await customer.deleteOne();
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    chipUid = result.chipUid;
  } else {
    // No code supplied — auto-generate one, same as mobile self-signup, so
    // every customer still has a chip from creation.
    chipUid = await generateUniqueChipCode();
    await NfcChip.create({
      chipUid,
      customerId: customer._id,
      customerName: customer.name,
      claimed: true,
      claimedAt: new Date(),
      batchId: "admin",
      status: "active",
    });
  }

  const { password: _, ...customerData } = customer.toObject();
  return NextResponse.json({ ...customerData, chipCode: chipUid }, { status: 201 });
}
