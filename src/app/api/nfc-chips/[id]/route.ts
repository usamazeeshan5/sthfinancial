import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import NfcChip from "@/lib/models/NfcChip";
import Customer from "@/lib/models/Customer";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDB();
  const { id } = await params;
  const body = await req.json();

  // If linking to a customer, resolve the customer name
  if (body.customerId) {
    const customer = await Customer.findById(body.customerId);
    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }
    body.customerName = customer.name;
  } else if (body.customerId === null) {
    body.customerName = null;
  }

  const chip = await NfcChip.findByIdAndUpdate(id, body, { new: true });
  if (!chip) {
    return NextResponse.json({ error: "Chip not found" }, { status: 404 });
  }

  return NextResponse.json(chip);
}
