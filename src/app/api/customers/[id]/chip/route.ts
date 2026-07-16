import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Customer from "@/lib/models/Customer";
import { assignChipCode } from "@/lib/assignChipCode";

// POST /api/customers/[id]/chip  { chipCode }
// Reassigns a customer to a different (batch-generated) chip code, releasing
// their current chip. Used by the "change code" action on the customer page.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDB();
  const { id } = await params;
  const { chipCode } = await req.json();

  const customer = await Customer.findById(id).select("name");
  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const result = await assignChipCode(
    typeof chipCode === "string" ? chipCode : "",
    id,
    customer.name
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ success: true, chipUid: result.chipUid });
}
