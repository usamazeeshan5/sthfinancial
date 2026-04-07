"use client";

import { useState } from "react";
import { Key, User, Bell } from "lucide-react";

export default function SettingsPage() {
  const [name, setName] = useState("Admin");
  const [email, setEmail] = useState("admin@lovetap.me");
  const [apiKey, setApiKey] = useState("lq_live_••••••••••••••••");
  const [notifications, setNotifications] = useState({
    failedTransactions: true,
    failedPayouts: true,
    newCustomers: false,
    dailySummary: true,
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted mt-1">
          Manage your account and preferences
        </p>
      </div>

      {/* Profile */}
      <div className="bg-card rounded-2xl border border-border p-6 space-y-5">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-muted" />
          <h2 className="text-sm font-medium">Profile</h2>
        </div>

        <div className="space-y-4">
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
          <div>
            <label className="block text-sm text-muted mb-1.5">
              Password
            </label>
            <button className="px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-muted hover:text-foreground transition-colors">
              Change Password
            </button>
          </div>
        </div>

        <button className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity">
          Save Profile
        </button>
      </div>

      {/* API Key */}
      <div className="bg-card rounded-2xl border border-border p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-muted" />
          <h2 className="text-sm font-medium">Luqra API</h2>
        </div>

        <div>
          <label className="block text-sm text-muted mb-1.5">API Key</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-background border border-border rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            />
            <button className="px-4 py-2.5 bg-background border border-border rounded-xl text-sm font-medium text-muted hover:text-foreground transition-colors">
              Reveal
            </button>
          </div>
          <p className="text-xs text-muted mt-2">
            Your Luqra API key is used to process payments. Keep it secret.
          </p>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-card rounded-2xl border border-border p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-muted" />
          <h2 className="text-sm font-medium">Email Notifications</h2>
        </div>

        <div className="space-y-3">
          {[
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
          ].map((item) => (
            <label
              key={item.key}
              className="flex items-center justify-between py-2 cursor-pointer"
            >
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted">{item.desc}</p>
              </div>
              <button
                onClick={() =>
                  setNotifications((prev) => ({
                    ...prev,
                    [item.key]: !prev[item.key],
                  }))
                }
                className={`relative w-10 h-6 rounded-full transition-colors ${
                  notifications[item.key] ? "bg-accent" : "bg-border"
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    notifications[item.key] ? "translate-x-4" : ""
                  }`}
                />
              </button>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
