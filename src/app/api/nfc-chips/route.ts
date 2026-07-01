import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import NfcChip from "@/lib/models/NfcChip";
import Customer from "@/lib/models/Customer";

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
    claimed: !!customerId,
    claimedAt: customerId ? new Date() : null,
  });

  return NextResponse.json(chip, { status: 201 });
}
