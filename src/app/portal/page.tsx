"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getToken, clearToken, api } from "./auth";
import { Card, Field, PrimaryButton, ErrorBox, Footer, Nav } from "./ui";

type Chip = { id: string; chipUid: string; status: string };
type Me = { id: string; name: string; email: string };
const money = (n: number) => `$${(n || 0).toFixed(2)}`;

function HomeInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [me, setMe] = useState<Me | null>(null);
  const [chips, setChips] = useState<Chip[]>([]);
  const [earnings, setEarnings] = useState<{ total: number; count: number } | null>(null);
  const [square, setSquare] = useState<string>("loading");
  const [activationIncomplete, setActivationIncomplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [code, setCode] = useState("");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    const meRes = await api("/api/mobile/portal/me");
    if (meRes.status === 401) {
      router.replace("/portal/login");
      return;
    }
    const meData = await meRes.json();
    setMe(meData.user);
    const [chipsRes, sqRes, dashRes] = await Promise.all([
      api(`/api/mobile/portal/nfc-chips?customerId=${meData.user.id}`),
      api("/api/mobile/portal/square-connect/status"),
      api(`/api/mobile/portal/dashboard?customerId=${meData.user.id}`),
    ]);
    setChips((await chipsRes.json()).chips || []);
    const sqData = await sqRes.json();
    setSquare(sqData.status || "disconnected");
    setActivationIncomplete(!!sqData.activationIncomplete);
    const dash = await dashRes.json().catch(() => null);
    if (dash?.stats)
      setEarnings({
        total: dash.stats.totalEarnings ?? 0,
        count: dash.stats.totalTransactions ?? 0,
      });
    setLoading(false);
  }, [router]);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/portal/login");
      return;
    }
    load();
    if (params.get("claimed")) setNotice("LoveTap added to your account.");
    if (params.get("claim_error")) setError(params.get("claim_error") || "");
    if (params.get("square") === "connected")
      setNotice(
        params.get("activation") === "incomplete"
          ? "Square connected — but finish activating your Square account (identity + bank) before you can receive tips."
          : "Square connected — you're ready to receive tips."
      );
    if (params.get("square") === "error")
      setError("Square couldn't be connected" + (params.get("reason") ? ` (${params.get("reason")})` : "") + ". Please try again.");
  }, [load, router, params]);

  const connectSquare = async () => {
    const res = await api("/api/mobile/portal/square-connect/onboard", {
      method: "POST",
      body: JSON.stringify({ platform: "web" }),
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else setError(data.error || "Couldn't start Square connection.");
  };

  const addChip = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");
    setAdding(true);
    const res = await api("/api/mobile/portal/claim", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    setAdding(false);
    if (!res.ok) {
      setError(data.error || "Couldn't add that chip.");
      return;
    }
    setNotice(`Added ${data.chipUid}.`);
    setCode("");
    setAddOpen(false);
    load();
  };

  const logout = () => {
    clearToken();
    router.replace("/portal/login");
  };

  if (loading) {
    return (
      <Card>
        <p className="text-sm text-[#6B7280]">Loading your account…</p>
      </Card>
    );
  }

  const sqLabel =
    square === "connected" ? "Connected" : square === "pending" ? "Pending" : "Not connected";
  const sqColor =
    square === "connected" ? "#059669" : square === "pending" ? "#B45309" : "#B91C1C";

  return (
    <>
      <Nav active="home" />
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#C4C8CE]">My Account</p>
            <h1 className="text-xl font-extrabold text-[#111827]">{me?.name}</h1>
          </div>
          <button onClick={logout} className="text-sm font-semibold text-[#9CA3AF] hover:text-[#6B7280]">
            Log out
          </button>
        </div>

        {/* Earnings summary */}
        {earnings && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-2xl bg-[#F9FAFB] border border-[#F0F1F3] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#C4C8CE]">Total tips</p>
              <p className="text-2xl font-extrabold text-[#111827] mt-1">{money(earnings.total)}</p>
            </div>
            <div className="rounded-2xl bg-[#F9FAFB] border border-[#F0F1F3] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#C4C8CE]">Tips received</p>
              <p className="text-2xl font-extrabold text-[#111827] mt-1">{earnings.count}</p>
            </div>
          </div>
        )}

        {notice && (
          <div className="mb-3 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] px-3.5 py-2.5 text-sm text-[#047857]">
            {notice}
          </div>
        )}
        <ErrorBox>{error}</ErrorBox>

        {/* Square status */}
        <div className="rounded-2xl bg-[#F9FAFB] border border-[#F0F1F3] p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[#111827]">Square</p>
              <p className="text-xs font-semibold" style={{ color: sqColor }}>{sqLabel}</p>
            </div>
            {square !== "connected" && (
              <button
                onClick={connectSquare}
                className="px-4 py-2 rounded-xl bg-[#111827] text-white text-sm font-semibold"
              >
                Connect Square
              </button>
            )}
          </div>
          {square !== "connected" && (
            <p className="text-xs text-[#6B7280] mt-2">Connect Square to start receiving tips.</p>
          )}
          {square === "connected" && activationIncomplete && (
            <div className="mt-3 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] px-3.5 py-2.5">
              <p className="text-xs font-semibold text-[#92400E]">
                Finish activating your Square account
              </p>
              <p className="text-xs text-[#92400E] mt-1 leading-relaxed">
                Your Square account is linked but not yet activated for card
                payments. Until you complete Square&apos;s setup (identity,
                business details, and bank), you can&apos;t receive tips and
                Apple&nbsp;Pay / Google&nbsp;Pay won&apos;t appear. Open your
                Square dashboard to finish, then reload this page.
              </p>
            </div>
          )}
        </div>

        {/* My LoveTaps */}
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold text-[#111827]">My LoveTaps ({chips.length})</p>
          <button onClick={() => setAddOpen((v) => !v)} className="text-sm font-semibold text-[#E23744]">
            {addOpen ? "Cancel" : "+ Add"}
          </button>
        </div>

        {addOpen && (
          <form onSubmit={addChip} className="mb-3">
            <Field
              label="Chip code"
              placeholder="LT-XXXXXX"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              autoFocus
            />
            <PrimaryButton type="submit" busy={adding} disabled={adding || !code.trim()}>
              {adding ? "Adding…" : "Add this LoveTap"}
            </PrimaryButton>
          </form>
        )}

        {chips.length === 0 ? (
          <p className="text-sm text-[#9CA3AF] italic py-2">No LoveTaps yet. Tap one, or add its code above.</p>
        ) : (
          <div className="space-y-2">
            {chips.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-xl bg-[#F9FAFB] border border-[#F0F1F3] px-4 py-3"
              >
                <span className="font-mono text-sm text-[#111827]">{c.chipUid}</span>
                <span
                  className="text-xs font-semibold capitalize"
                  style={{ color: c.status === "active" ? "#059669" : "#B91C1C" }}
                >
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
      <Footer />
    </>
  );
}

export default function PortalHome() {
  return (
    <Suspense fallback={null}>
      <HomeInner />
    </Suspense>
  );
}
