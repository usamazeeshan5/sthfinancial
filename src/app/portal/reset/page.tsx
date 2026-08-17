"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, Field, PrimaryButton, ErrorBox, Footer } from "../ui";

function ResetInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/mobile/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetToken: token, newPassword: password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't reset your password.");
      setDone(true);
      setTimeout(() => router.replace("/portal/login"), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <Card>
        <h1 className="text-xl font-extrabold text-[#111827] mb-1">Invalid link</h1>
        <p className="text-sm text-[#6B7280] mb-5">
          This reset link is missing or malformed. Please request a new one.
        </p>
        <p className="text-sm text-center">
          <Link href="/portal/forgot" className="font-semibold text-[#E23744]">
            Request a new link
          </Link>
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <h1 className="text-xl font-extrabold text-[#111827] mb-1">
        Set a new password
      </h1>
      <p className="text-sm text-[#6B7280] mb-5">
        Choose a new password for your LoveTap account.
      </p>

      {done ? (
        <div className="rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] px-4 py-3 text-sm text-[#047857]">
          Password updated. Taking you to log in…
        </div>
      ) : (
        <>
          <ErrorBox>{error}</ErrorBox>
          <form onSubmit={submit}>
            <Field
              label="New password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
            />
            <Field
              label="Confirm new password"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
            <PrimaryButton type="submit" busy={busy} disabled={busy}>
              {busy ? "Updating…" : "Update password"}
            </PrimaryButton>
          </form>
        </>
      )}
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetInner />
      <Footer />
    </Suspense>
  );
}
