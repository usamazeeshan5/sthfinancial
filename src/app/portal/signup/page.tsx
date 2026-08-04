"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { setToken, api } from "../auth";
import { Card, Field, PrimaryButton, ErrorBox, Footer } from "../ui";

function SignupInner() {
  const router = useRouter();
  const params = useSearchParams();
  const code = params.get("code"); // optional chip to claim after signup
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/mobile/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.token) throw new Error(data.error || "Could not create the account.");
      setToken(data.token);

      if (code) {
        const c = await api("/api/mobile/portal/claim", {
          method: "POST",
          body: JSON.stringify({ code }),
        });
        if (!c.ok) {
          const cd = await c.json();
          router.replace(`/portal?claim_error=${encodeURIComponent(cd.error || "Could not add chip")}`);
          return;
        }
        router.replace("/portal?claimed=1");
        return;
      }
      router.replace("/portal");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  };

  return (
    <>
      <Card>
        <h1 className="text-xl font-extrabold text-[#111827] mb-1">Create your account</h1>
        <p className="text-sm text-[#6B7280] mb-5">
          {code ? (
            <>Activating LoveTap <span className="font-mono font-semibold text-[#111827]">{code}</span>.</>
          ) : (
            "Set up your account to start receiving tips."
          )}
        </p>
        <ErrorBox>{error}</ErrorBox>
        <form onSubmit={submit}>
          <Field label="Full name" value={form.name} onChange={set("name")} required autoFocus />
          <Field label="Email" type="email" value={form.email} onChange={set("email")} required />
          <Field label="Mobile number" type="tel" value={form.phone} onChange={set("phone")} required />
          <Field label="Password" type="password" value={form.password} onChange={set("password")} required minLength={6} />
          <PrimaryButton type="submit" busy={busy} disabled={busy}>
            {busy ? "Creating…" : code ? "Create account & activate" : "Create account"}
          </PrimaryButton>
        </form>
        <p className="text-sm text-[#6B7280] text-center mt-4">
          Already have an account?{" "}
          <Link href={code ? `/portal/login?code=${code}` : "/portal/login"} className="font-semibold text-[#E23744]">
            Log in
          </Link>
        </p>
      </Card>
      <Footer />
    </>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupInner />
    </Suspense>
  );
}
