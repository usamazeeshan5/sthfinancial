import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import AdminUser from "@/lib/models/AdminUser";

// Resolves the signed-in admin from the session (by id, falling back to email).
async function currentAdmin() {
  const session = await auth();
  const email = session?.user?.email;
  const id = (session?.user as { id?: string } | undefined)?.id;
  if (!id && !email) return null;
  await connectDB();
  if (id) {
    const byId = await AdminUser.findById(id).catch(() => null);
    if (byId) return byId;
  }
  return email ? AdminUser.findOne({ email }) : null;
}

// GET /api/admin/profile — current admin's name + email.
export async function GET() {
  const admin = await currentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ name: admin.name, email: admin.email });
}

// PATCH /api/admin/profile { name?, email? } — update name and/or email.
export async function PATCH(req: NextRequest) {
  const admin = await currentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, email } = await req.json();
  if (email && email !== admin.email) {
    const taken = await AdminUser.findOne({ email, _id: { $ne: admin._id } });
    if (taken) {
      return NextResponse.json({ error: "That email is already in use." }, { status: 400 });
    }
    admin.email = email;
  }
  if (typeof name === "string" && name.trim()) admin.name = name.trim();
  await admin.save();

  return NextResponse.json({ name: admin.name, email: admin.email });
}
