"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, Field, PrimaryButton, ErrorBox, Footer } from "../ui";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/mobile/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      // Success is intentionally generic — we never reveal if the email exists.
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Card>
        <h1 className="text-xl font-extrabold text-[#111827] mb-1">
          Reset password
        </h1>
        <p className="text-sm text-[#6B7280] mb-5">
          Enter your email and we&apos;ll send you a link to set a new password.
        </p>

        {sent ? (
          <div className="rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] px-4 py-3 text-sm text-[#047857] leading-relaxed">
            If an account exists for <b>{email}</b>, a reset link is on its way.
            Check your inbox (and spam). The link expires in 15 minutes.
          </div>
        ) : (
          <>
            <ErrorBox>{error}</ErrorBox>
            <form onSubmit={submit}>
              <Field
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
              <PrimaryButton type="submit" busy={busy} disabled={busy}>
                {busy ? "Sending…" : "Send reset link"}
              </PrimaryButton>
            </form>
          </>
        )}

        <p className="text-sm text-[#6B7280] text-center mt-4">
          <Link href="/portal/login" className="font-semibold text-[#E23744]">
            Back to log in
          </Link>
        </p>
      </Card>
      <Footer />
    </>
  );
}
