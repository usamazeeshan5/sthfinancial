import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/db";
import Customer from "@/lib/models/Customer";
import { getAppOrigin } from "@/lib/appUrl";
import { emailConfigured, sendEmail, passwordResetEmail } from "@/lib/email";

const JWT_SECRET = process.env.NEXTAUTH_SECRET!;

export async function POST(req: NextRequest) {
  await connectDB();
  const { email } = await req.json();

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const customer = await Customer.findOne({ email: email.toLowerCase().trim() });

  // Always return success — never reveal whether the email exists.
  if (!customer) {
    return NextResponse.json({ success: true });
  }

  // Generate a short-lived reset token (15 minutes).
  const resetToken = jwt.sign(
    { purpose: "reset", email: customer.email, id: customer._id.toString() },
    JWT_SECRET,
    { expiresIn: "15m" }
  );

  // If email is configured, send a reset link and DO NOT return the token
  // (returning it would let anyone reset any account). If email isn't set up
  // yet, fall back to returning the token so the mobile/dev flow still works.
  if (emailConfigured()) {
    const origin = getAppOrigin(req);
    const resetUrl = `${origin}/portal/reset?token=${encodeURIComponent(resetToken)}`;
    const { subject, html, text } = passwordResetEmail(resetUrl);
    const sent = await sendEmail({ to: customer.email, subject, html, text });
    if (!sent.ok) {
      console.error("[forgot-password] email send failed:", sent.error);
      // Don't leak whether the account exists; report a generic failure.
      return NextResponse.json(
        { error: "Couldn't send the reset email. Please try again shortly." },
        { status: 502 }
      );
    }
    return NextResponse.json({ success: true, emailed: true });
  }

  return NextResponse.json({ success: true, resetToken });
}
