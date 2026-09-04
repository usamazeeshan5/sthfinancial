"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken, setToken, clearToken, api } from "../auth";
import { Card, Field, PrimaryButton, ErrorBox, Footer, Nav } from "../ui";
import { SOCIAL_PLATFORMS } from "@/lib/socials";

type Socials = { tiktok: string; instagram: string; facebook: string; x: string };
const EMPTY_SOCIALS: Socials = { tiktok: "", instagram: "", facebook: "", x: "" };

export default function PortalProfile() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [square, setSquare] = useState("disconnected");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [socials, setSocials] = useState<Socials>(EMPTY_SOCIALS);
  const [savedMsg, setSavedMsg] = useState("");
  const [error, setError] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwMsg, setPwMsg] = useState("");
  const [pwError, setPwError] = useState("");
  const [savingPw, setSavingPw] = useState(false);

  const [disconnecting, setDisconnecting] = useState(false);

  const load = useCallback(async () => {
    const meRes = await api("/api/mobile/portal/me");
    if (meRes.status === 401) {
      router.replace("/portal/login");
      return;
    }
    const me = (await meRes.json()).user;
    setName(me.name || "");
    setEmail(me.email || "");
    setPhone(me.phone || "");
    setSocials({ ...EMPTY_SOCIALS, ...(me.socials || {}) });
    const sq = await api("/api/mobile/portal/square-connect/status");
    setSquare((await sq.json()).status || "disconnected");
    setLoading(false);
  }, [router]);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/portal/login");
      return;
    }
    load();
  }, [load, router]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSavedMsg("");
    setSavingProfile(true);
    const res = await api("/api/mobile/portal/profile", {
      method: "PATCH",
      body: JSON.stringify({ name, email, phone, socials }),
    });
    const data = await res.json();
    setSavingProfile(false);
    if (!res.ok) return setError(data.error || "Couldn't save.");
    setSavedMsg("Profile saved.");
  };

  const changePw = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError("");
    setPwMsg("");
    setSavingPw(true);
    const res = await api("/api/mobile/portal/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword: curPw, newPassword: newPw }),
    });
    const data = await res.json();
    setSavingPw(false);
    if (!res.ok) return setPwError(data.error || "Couldn't change password.");
    if (data.token) setToken(data.token);
    setPwMsg("Password changed.");
    setCurPw("");
    setNewPw("");
  };

  const disconnectSquare = async () => {
    if (!confirm("Disconnect Square? Your LoveTaps will stop accepting tips until you reconnect.")) return;
    setDisconnecting(true);
    await api("/api/mobile/portal/square-connect/disconnect", { method: "POST" });
    setDisconnecting(false);
    setSquare("disconnected");
  };

  const logout = () => {
    clearToken();
    router.replace("/portal/login");
  };

  if (loading)
    return (
      <>
        <Nav active="profile" />
        <Card>
          <p className="text-sm text-[#6B7280]">Loading…</p>
        </Card>
      </>
    );

  return (
    <>
      <Nav active="profile" />
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-extrabold text-[#111827]">Profile</h1>
          <button onClick={logout} className="text-sm font-semibold text-[#9CA3AF] hover:text-[#6B7280]">
            Log out
          </button>
        </div>

        {savedMsg && (
          <div className="mb-3 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] px-3.5 py-2.5 text-sm text-[#047857]">
            {savedMsg}
          </div>
        )}
        <ErrorBox>{error}</ErrorBox>

        <form onSubmit={saveProfile}>
          <Field label="Full name" value={name} onChange={(e) => setName(e.target.value)} required />
          <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Field label="Mobile number" value={phone} onChange={(e) => setPhone(e.target.value)} required />

          <div className="mt-4 pt-4 border-t border-[#F0F1F3]">
            <p className="text-sm font-bold text-[#111827]">Social links</p>
            <p className="text-xs text-[#6B7280] mt-0.5 mb-3">
              Shown to tippers after they pay, so they can follow you. Add any you like — leave the rest blank.
            </p>
            {SOCIAL_PLATFORMS.map((p) => (
              <Field
                key={p.key}
                label={p.label}
                placeholder={p.placeholder}
                value={socials[p.key]}
                onChange={(e) => setSocials((s) => ({ ...s, [p.key]: e.target.value }))}
              />
            ))}
          </div>

          <PrimaryButton type="submit" busy={savingProfile} disabled={savingProfile}>
            Save changes
          </PrimaryButton>
        </form>
      </Card>

      {/* Square */}
      <div className="mt-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[#111827]">Square</p>
              <p
                className="text-xs font-semibold capitalize"
                style={{ color: square === "connected" ? "#059669" : "#B91C1C" }}
              >
                {square === "connected" ? "Connected" : "Not connected"}
              </p>
            </div>
            {square === "connected" ? (
              <button
                onClick={disconnectSquare}
                disabled={disconnecting}
                className="px-4 py-2 rounded-xl border border-[#FECACA] text-[#B91C1C] text-sm font-semibold disabled:opacity-50"
              >
                {disconnecting ? "Disconnecting…" : "Disconnect"}
              </button>
            ) : (
              <a
                href="/portal"
                className="px-4 py-2 rounded-xl bg-[#111827] text-white text-sm font-semibold"
              >
                Reconnect
              </a>
            )}
          </div>
        </Card>
      </div>

      {/* Change password */}
      <div className="mt-4">
        <Card>
          <p className="text-sm font-bold text-[#111827] mb-3">Change password</p>
          {pwMsg && (
            <div className="mb-3 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] px-3.5 py-2.5 text-sm text-[#047857]">
              {pwMsg}
            </div>
          )}
          <ErrorBox>{pwError}</ErrorBox>
          <form onSubmit={changePw}>
            <Field
              label="Current password"
              type="password"
              value={curPw}
              onChange={(e) => setCurPw(e.target.value)}
              required
            />
            <Field
              label="New password"
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              required
              minLength={6}
            />
            <PrimaryButton type="submit" busy={savingPw} disabled={savingPw || !curPw || !newPw}>
              Update password
            </PrimaryButton>
          </form>
        </Card>
      </div>
      <Footer />
    </>
  );
}
