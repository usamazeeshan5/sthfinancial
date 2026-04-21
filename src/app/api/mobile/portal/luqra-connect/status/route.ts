import { NextRequest, NextResponse } from "next/server";
import { merchantAccounts } from "@/lib/luqra";
import { connectDB } from "@/lib/db";
import Customer from "@/lib/models/Customer";
import { verifyToken } from "@/lib/jwt";

export async function GET(req: NextRequest) {
  await connectDB();

  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = verifyToken(auth.slice(7));
  if (!payload?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const customer = await Customer.findById(payload.id);
  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  if (!customer.luqraMerchantAccountId) {
    return NextResponse.json({
      status: "disconnected",
      chargesEnabled: false,
      detailsSubmitted: false,
    });
  }

  // Check the account status on Luqra
  const account = await merchantAccounts.retrieve(customer.luqraMerchantAccountId);

  const chargesEnabled = account.charges_enabled ?? false;
  const detailsSubmitted = account.details_submitted ?? false;

  // Update local status based on Luqra's response
  if (chargesEnabled) {
    customer.bankAccountStatus = "connected";
  } else if (detailsSubmitted) {
    customer.bankAccountStatus = "pending";
  }
  await customer.save();

  return NextResponse.json({
    status: customer.bankAccountStatus,
    chargesEnabled,
    detailsSubmitted,
  });
}
