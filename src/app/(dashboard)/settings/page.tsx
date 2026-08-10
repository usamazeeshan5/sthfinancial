"use client";

import { useEffect, useState } from "react";
import {
  User,
  Bell,
  Shield,
  Mail,
  Eye,
  EyeOff,
} from "lucide-react";

const notificationItems = [
  {
    key: "failedTransactions" as const,
    label: "Failed Transactions",
    desc: "Get notified when a transaction fails",
  },
  {
    key: "failedPayouts" as const,
    label: "Failed Payouts",
    desc: "Get notified when a payout fails",
  },
  {
    key: "newCustomers" as const,
    label: "New Customers",
    desc: "Get notified when a new customer signs up",
  },
  {
    key: "dailySummary" as const,
    label: "Daily Summary",
    desc: "Receive a daily summary email",
  },
];

export default function SettingsPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);

  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");
  const [profileErr, setProfileErr] = useState("");

  const [showPw, setShowPw] = useState(false);
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [savingPw, setSavingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState("");
  const [pwErr, setPwErr] = useState("");

  // Password visibility states
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  const [notifications, setNotifications] = useState({
    failedTransactions: true,
    failedPayouts: true,
    newCustomers: false,
    dailySummary: true,
  });

  useEffect(() => {
    fetch("/api/admin/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setName(d.name || "");
          setEmail(d.email || "");
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const saveProfile = async () => {
    setProfileErr("");
    setProfileMsg("");
    setSavingProfile(true);

    const res = await fetch("/api/admin/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email }),
    });

    const d = await res.json();

    setSavingProfile(false);

    if (!res.ok) {
      return setProfileErr(d.error || "Couldn't save.");
    }

    setName(d.name);
    setEmail(d.email);
    setProfileMsg("Profile saved.");
  };

  const changePassword = async () => {
    setPwErr("");
    setPwMsg("");
    setSavingPw(true);

    const res = await fetch("/api/admin/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: curPw,
        newPassword: newPw,
      }),
    });

    const d = await res.json();

    setSavingPw(false);

    if (!res.ok) {
      return setPwErr(d.error || "Couldn't change password.");
    }

    setPwMsg("Password changed.");
    setCurPw("");
    setNewPw("");
    setShowPw(false);

    // Reset password visibility
    setShowCurrentPw(false);
    setShowNewPw(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Settings
        </h1>

        <p className="text-sm text-muted mt-1">
          Manage your account and preferences
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">

        {/* Profile */}
        <div className="xl:col-span-2 bg-card rounded-2xl border border-border overflow-hidden">

          <div className="flex items-center gap-2 px-6 py-4 border-b border-border">
            <User className="w-4 h-4 text-accent" />
            <h2 className="text-sm font-semibold">
              Profile
            </h2>
          </div>

          <div className="p-6 space-y-6">

            {/* Profile Header */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center text-2xl font-semibold text-accent shrink-0">
                {(name.charAt(0) || "A").toUpperCase()}
              </div>

              <div className="min-w-0">
                <p className="text-base font-semibold truncate">
                  {name || "Admin"}
                </p>

                <p className="text-sm text-muted truncate">
                  {email}
                </p>
              </div>
            </div>

            {/* Profile Messages */}
            {profileMsg && (
              <div className="px-4 py-2.5 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
                {profileMsg}
              </div>
            )}

            {profileErr && (
              <div className="px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                {profileErr}
              </div>
            )}

            {/* Name / Email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <div>
                <label className="block text-sm text-muted mb-1.5">
                  Name
                </label>

                <input
                  type="text"
                  value={name}
                  disabled={loading}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-sm text-muted mb-1.5">
                  Email
                </label>

                <input
                  type="email"
                  value={email}
                  disabled={loading}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                />
              </div>

            </div>

            {/* Password & Security */}
            <div className="pt-2 border-t border-border">

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">

                <div className="flex items-center gap-2 text-sm text-muted">
                  <Shield className="w-4 h-4" />
                  <span>Password &amp; security</span>
                </div>

                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="px-4 py-2.5 bg-background border border-border rounded-xl text-sm font-medium text-muted hover:text-foreground transition-colors"
                >
                  {showPw ? "Cancel" : "Change Password"}
                </button>

              </div>

              {showPw && (
                <div className="mt-4 space-y-3">

                  {/* Password Messages */}
                  {pwMsg && (
                    <div className="px-4 py-2.5 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
                      {pwMsg}
                    </div>
                  )}

                  {pwErr && (
                    <div className="px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                      {pwErr}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    {/* Current Password */}
                    <div>
                      <label className="block text-sm text-muted mb-1.5">
                        Current password
                      </label>

                      <div className="relative">

                        <input
                          type={showCurrentPw ? "text" : "password"}
                          value={curPw}
                          onChange={(e) => setCurPw(e.target.value)}
                          className="w-full px-4 py-2.5 pr-12 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            setShowCurrentPw((v) => !v)
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center text-muted hover:text-foreground transition-colors"
                          aria-label={
                            showCurrentPw
                              ? "Hide current password"
                              : "Show current password"
                          }
                        >
                          {showCurrentPw ? (
                            <EyeOff className="w-5 h-5" />
                          ) : (
                            <Eye className="w-5 h-5" />
                          )}
                        </button>

                      </div>
                    </div>

                    {/* New Password */}
                    <div>
                      <label className="block text-sm text-muted mb-1.5">
                        New password
                      </label>

                      <div className="relative">

                        <input
                          type={showNewPw ? "text" : "password"}
                          value={newPw}
                          minLength={6}
                          onChange={(e) => setNewPw(e.target.value)}
                          className="w-full px-4 py-2.5 pr-12 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            setShowNewPw((v) => !v)
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center text-muted hover:text-foreground transition-colors"
                          aria-label={
                            showNewPw
                              ? "Hide new password"
                              : "Show new password"
                          }
                        >
                          {showNewPw ? (
                            <EyeOff className="w-5 h-5" />
                          ) : (
                            <Eye className="w-5 h-5" />
                          )}
                        </button>

                      </div>
                    </div>

                  </div>

                  {/* Update Password */}
                  <div className="flex justify-end">

                    <button
                      type="button"
                      onClick={changePassword}
                      disabled={savingPw || !curPw || !newPw}
                      className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {savingPw
                        ? "Updating…"
                        : "Update Password"}
                    </button>

                  </div>

                </div>
              )}
            </div>

            {/* Save Profile */}
            <div className="flex justify-end">

              <button
                type="button"
                onClick={saveProfile}
                disabled={savingProfile || loading}
                className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {savingProfile
                  ? "Saving…"
                  : "Save Profile"}
              </button>

            </div>

          </div>
        </div>

        {/* Notifications */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">

          <div className="flex items-center gap-2 px-6 py-4 border-b border-border">
            <Bell className="w-4 h-4 text-accent" />
            <h2 className="text-sm font-semibold">
              Email Notifications
            </h2>
          </div>

          <div className="p-4 sm:p-6 divide-y divide-border">

            {notificationItems.map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >

                <div className="min-w-0 flex items-start gap-2.5">

                  <Mail className="w-4 h-4 text-muted mt-0.5 shrink-0" />

                  <div>
                    <p className="text-sm font-medium">
                      {item.label}
                    </p>

                    <p className="text-xs text-muted">
                      {item.desc}
                    </p>
                  </div>

                </div>

                <button
                  type="button"
                  onClick={() =>
                    setNotifications((prev) => ({
                      ...prev,
                      [item.key]: !prev[item.key],
                    }))
                  }
                  className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${
                    notifications[item.key]
                      ? "bg-accent"
                      : "bg-border"
                  }`}
                  aria-pressed={notifications[item.key]}
                >
                  <span
                    className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      notifications[item.key]
                        ? "translate-x-4"
                        : ""
                    }`}
                  />
                </button>

              </div>
            ))}

          </div>
        </div>

      </div>
    </div>
  );
}