import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import Customer from "@/lib/models/Customer";

const JWT_SECRET = process.env.NEXTAUTH_SECRET!;

export async function POST(req: NextRequest) {
  await connectDB();
  const { resetToken, newPassword } = await req.json();

  if (!resetToken || !newPassword) {
    return NextResponse.json(
      { error: "Reset token and new password are required" },
      { status: 400 }
    );
  }

  if (newPassword.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters" },
      { status: 400 }
    );
  }

  let payload: any;
  try {
    payload = jwt.verify(resetToken, JWT_SECRET);
  } catch {
    return NextResponse.json(
      { error: "Reset link has expired. Please request a new one." },
      { status: 400 }
    );
  }

  if (payload.purpose !== "reset") {
    return NextResponse.json({ error: "Invalid reset token" }, { status: 400 });
  }

  const customer = await Customer.findById(payload.id);
  if (!customer) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  customer.password = await bcrypt.hash(newPassword, 12);
  await customer.save();

  return NextResponse.json({ success: true, message: "Password updated successfully." });
}
