import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Customer from "@/lib/models/Customer";
import NfcChip from "@/lib/models/NfcChip";
import Transaction from "@/lib/models/Transaction";
import Payout from "@/lib/models/Payout";
import { verifyToken } from "@/lib/jwt";

function getCustomerIdFromToken(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const payload = verifyToken(auth.slice(7));
  return payload?.id || null;
}

export async function PATCH(req: NextRequest) {
  await connectDB();

  const customerId = getCustomerIdFromToken(req);
  if (!customerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, email, phone } = await req.json();

  if (!name || !email || !phone) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }

  // Check if email is taken by another customer
  const existing = await Customer.findOne({ email, _id: { $ne: customerId } });
  if (existing) {
    return NextResponse.json({ error: "Email already in use" }, { status: 400 });
  }

  const customer = await Customer.findByIdAndUpdate(
    customerId,
    { name, email, phone },
    { new: true }
  ).select("-password");

  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  // Sync name on related records
  await Promise.all([
    NfcChip.updateMany({ customerId }, { customerName: name }),
    Transaction.updateMany({ customerId }, { customerName: name }),
    Payout.updateMany({ customerId }, { customerName: name }),
  ]);

  return NextResponse.json({
    success: true,
    user: {
      id: customer._id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
    },
  });
}
