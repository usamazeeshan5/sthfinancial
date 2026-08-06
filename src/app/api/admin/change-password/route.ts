import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import AdminUser from "@/lib/models/AdminUser";

// POST /api/admin/change-password { currentPassword, newPassword }
export async function POST(req: NextRequest) {
  const session = await auth();
  const email = session?.user?.email;
  const id = (session?.user as { id?: string } | undefined)?.id;
  if (!id && !email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { currentPassword, newPassword } = await req.json();
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Both passwords are required." }, { status: 400 });
  }
  if (String(newPassword).length < 6) {
    return NextResponse.json({ error: "New password must be at least 6 characters." }, { status: 400 });
  }

  await connectDB();
  const admin = id
    ? (await AdminUser.findById(id).catch(() => null)) || (await AdminUser.findOne({ email }))
    : await AdminUser.findOne({ email });
  if (!admin) return NextResponse.json({ error: "Admin not found." }, { status: 404 });

  const valid = await bcrypt.compare(currentPassword, admin.password);
  if (!valid) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
  }

  admin.password = await bcrypt.hash(newPassword, 12);
  await admin.save();
  return NextResponse.json({ success: true });
}
