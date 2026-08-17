"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { setToken, api } from "../auth";
import { Card, Field, PrimaryButton, ErrorBox, Footer } from "../ui";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const code = params.get("code"); // optional chip to claim after login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/mobile/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.token) throw new Error(data.error || "Invalid email or password.");
      setToken(data.token);

      if (code) {
        // Claim the tapped chip, then land on the account with it added.
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
        <h1 className="text-xl font-extrabold text-[#111827] mb-1">Log in</h1>
        <p className="text-sm text-[#6B7280] mb-5">
          {code ? "Log in to add this LoveTap to your account." : "Welcome back."}
        </p>
        <ErrorBox>{error}</ErrorBox>
        <form onSubmit={submit}>
          <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          <Field label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <div className="flex justify-end -mt-1 mb-3">
            <Link href="/portal/forgot" className="text-xs font-semibold text-[#E23744]">
              Forgot password?
            </Link>
          </div>
          <PrimaryButton type="submit" busy={busy} disabled={busy}>
            {busy ? "Logging in…" : "Log in"}
          </PrimaryButton>
        </form>
        <p className="text-sm text-[#6B7280] text-center mt-4">
          New here?{" "}
          <Link href={code ? `/portal/signup?code=${code}` : "/portal/signup"} className="font-semibold text-[#E23744]">
            Create an account
          </Link>
        </p>
      </Card>
      <Footer />
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
