import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Customer from "@/lib/models/Customer";
import { verifyToken } from "@/lib/jwt";

export async function POST(req: NextRequest) {
  await connectDB();

  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = verifyToken(auth.slice(7));
  if (!payload?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { accountHolder, routingNumber, accountNumber } = await req.json();

  if (!accountHolder || !routingNumber || !accountNumber) {
    return NextResponse.json({ error: "All bank account fields are required" }, { status: 400 });
  }

  const customer = await Customer.findByIdAndUpdate(
    payload.id,
    {
      bankAccount: { accountHolder, routingNumber, accountNumber },
      bankAccountStatus: "connected",
    },
    { new: true }
  ).select("-password");

  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, bankAccountStatus: customer.bankAccountStatus });
}

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

  const customer = await Customer.findById(payload.id).select("bankAccount bankAccountStatus");
  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  return NextResponse.json({
    bankAccountStatus: customer.bankAccountStatus,
    hasBankAccount: customer.bankAccountStatus === "connected",
  });
}
