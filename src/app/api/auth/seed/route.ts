import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import AdminUser from "@/lib/models/AdminUser";

export async function POST() {
  await connectDB();

  const existing = await AdminUser.findOne({ email: "admin@lovetap.me" });
  if (existing) {
    return NextResponse.json({ message: "Admin user already exists" });
  }

  const hashedPassword = await bcrypt.hash("admin123", 12);
  await AdminUser.create({
    name: "Admin",
    email: "admin@lovetap.me",
    password: hashedPassword,
  });

  return NextResponse.json({ message: "Admin user created successfully" });
}
