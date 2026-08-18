import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Transaction from "@/lib/models/Transaction";
import { auth } from "@/lib/auth";

// Permanently delete a single transaction record. This is an admin cleanup
// action (e.g. removing test tips), so it's guarded by the admin session —
// unlike the read/list routes, a destructive delete must be authenticated.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const { id } = await params;

  const txn = await Transaction.findByIdAndDelete(id);
  if (!txn) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
