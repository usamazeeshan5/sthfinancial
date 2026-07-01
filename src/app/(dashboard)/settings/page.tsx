"use client";

import { useState } from "react";
import { User, Bell, Shield, Mail } from "lucide-react";

const notificationItems = [
  { key: "failedTransactions" as const, label: "Failed Transactions", desc: "Get notified when a transaction fails" },
  { key: "failedPayouts" as const, label: "Failed Payouts", desc: "Get notified when a payout fails" },
  { key: "newCustomers" as const, label: "New Customers", desc: "Get notified when a new customer signs up" },
  { key: "dailySummary" as const, label: "Daily Summary", desc: "Receive a daily summary email" },
];

export default function SettingsPage() {
  const [name, setName] = useState("Admin");
  const [email, setEmail] = useState("admin@lovetap.me");

  const [notifications, setNotifications] = useState({
    failedTransactions: true,
    failedPayouts: true,
    newCustomers: false,
    dailySummary: true,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted mt-1">Manage your account and preferences</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Profile — spans 2 of 3 on wide screens */}
        <div className="xl:col-span-2 bg-card rounded-2xl border border-border overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-border">
            <User className="w-4 h-4 text-accent" />
            <h2 className="text-sm font-semibold">Profile</h2>
          </div>

          <div className="p-6 space-y-6">
            {/* Avatar row */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center text-2xl font-semibold text-accent shrink-0">
                {name.charAt(0).toUpperCase() || "A"}
              </div>
              <div className="min-w-0">
                <p className="text-base font-semibold truncate">{name || "Admin"}</p>
                <p className="text-sm text-muted truncate">{email}</p>
              </div>
            </div>

            {/* Fields — two columns on desktop */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-muted mb-1.5">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-sm text-muted mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-border">
              <div className="flex items-center gap-2 text-sm text-muted">
                <Shield className="w-4 h-4" />
                <span>Password &amp; security</span>
              </div>
              <button className="px-4 py-2.5 bg-background border border-border rounded-xl text-sm font-medium text-muted hover:text-foreground transition-colors">
                Change Password
              </button>
            </div>

            <div className="flex justify-end">
              <button className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity">
                Save Profile
              </button>
            </div>
          </div>
        </div>

        {/* Notifications — 1 of 3 */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-border">
            <Bell className="w-4 h-4 text-accent" />
            <h2 className="text-sm font-semibold">Email Notifications</h2>
          </div>

          <div className="p-4 sm:p-6 divide-y divide-border">
            {notificationItems.map((item) => (
              <div key={item.key} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0 flex items-start gap-2.5">
                  <Mail className="w-4 h-4 text-muted mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted">{item.desc}</p>
                  </div>
                </div>
                <button
                  onClick={() =>
                    setNotifications((prev) => ({ ...prev, [item.key]: !prev[item.key] }))
                  }
                  className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${
                    notifications[item.key] ? "bg-accent" : "bg-border"
                  }`}
                  aria-pressed={notifications[item.key]}
                >
                  <span
                    className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      notifications[item.key] ? "translate-x-4" : ""
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
