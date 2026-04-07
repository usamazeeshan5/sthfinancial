import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import Customer from "@/lib/models/Customer";
import { signToken } from "@/lib/jwt";

export async function POST(req: NextRequest) {
  await connectDB();
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  const customer = await Customer.findOne({ email });
  if (!customer) {
    return NextResponse.json(
      { error: "Invalid credentials" },
      { status: 401 }
    );
  }

  const isValid = await bcrypt.compare(password, customer.password);
  if (!isValid) {
    return NextResponse.json(
      { error: "Invalid credentials" },
      { status: 401 }
    );
  }

  const token = signToken({
    id: customer._id.toString(),
    email: customer.email,
    name: customer.name,
  });

  return NextResponse.json({
    token,
    user: {
      id: customer._id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
    },
  });
}
