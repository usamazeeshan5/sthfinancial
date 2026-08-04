import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import NfcChip from "@/lib/models/NfcChip";
import Customer from "@/lib/models/Customer";
import { normalizeChipCode } from "@/lib/chipCode";

export async function GET(req: NextRequest) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const search = (searchParams.get("search") || "").trim();
  const filter = searchParams.get("filter") || "all";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const query: Record<string, unknown> = {};
  if (search) {
    const rx = { $regex: search, $options: "i" };
    query.$or = [{ chipUid: rx }, { customerName: rx }];
  }
  if (filter === "assigned") query.customerId = { $ne: null };
  else if (filter === "unassigned") query.customerId = null;
  else if (["active", "disabled", "lost"].includes(filter)) query.status = filter;

  const [chips, total, totalCount, activeCount, assignedCount] = await Promise.all([
    NfcChip.find(query)
      .sort({ registeredAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    NfcChip.countDocuments(query),
    NfcChip.countDocuments(),
    NfcChip.countDocuments({ status: "active" }),
    NfcChip.countDocuments({ customerId: { $ne: null } }),
  ]);

  return NextResponse.json({
    chips,
    total,
    page,
    limit,
    stats: { total: totalCount, active: activeCount, assigned: assignedCount },
  });
}

export async function POST(req: NextRequest) {
  await connectDB();
  const body = await req.json();
  const { customerId } = body;

  // Normalize custom/manual codes so they match the generated format and the
  // case-insensitive lookup used everywhere else (LT-XXXXXX, uppercase).
  const chipUid = normalizeChipCode(String(body.chipUid || ""));
  if (!chipUid) {
    return NextResponse.json({ error: "A chip code is required." }, { status: 400 });
  }

  const existing = await NfcChip.findOne({
    chipUid: new RegExp(`^${chipUid.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
  });
  if (existing) {
    return NextResponse.json(
      { error: `Code "${chipUid}" is already registered.` },
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
    claimed: !!customerId,
    claimedAt: customerId ? new Date() : null,
  });

  return NextResponse.json(chip, { status: 201 });
}
