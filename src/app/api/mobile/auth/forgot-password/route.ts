import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/db";
import Customer from "@/lib/models/Customer";

const JWT_SECRET = process.env.NEXTAUTH_SECRET!;

export async function POST(req: NextRequest) {
  await connectDB();
  const { email } = await req.json();

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const customer = await Customer.findOne({ email: email.toLowerCase().trim() });

  // Always return success — never reveal whether the email exists
  if (!customer) {
    return NextResponse.json({ success: true });
  }

  // Generate a short-lived reset token (15 minutes)
  const resetToken = jwt.sign(
    { purpose: "reset", email: customer.email, id: customer._id.toString() },
    JWT_SECRET,
    { expiresIn: "15m" }
  );

  // Return token directly (no email service configured yet)
  return NextResponse.json({ success: true, resetToken });
}
