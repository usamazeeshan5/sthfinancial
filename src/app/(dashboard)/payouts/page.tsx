"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { payouts } from "@/lib/mock-data";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

const statusOptions = ["all", "scheduled", "completed", "failed"];

export default function PayoutsPage() {
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = payouts.filter(
    (p) => statusFilter === "all" || p.status === statusFilter
  );

  const totalScheduled = payouts.filter((p) => p.status === "scheduled").reduce((sum, p) => sum + p.amount, 0);
  const totalCompleted = payouts.filter((p) => p.status === "completed").reduce((sum, p) => sum + p.amount, 0);
  const totalFailed = payouts.filter((p) => p.status === "failed").reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Payouts</h1>
        <p className="text-sm text-muted mt-1">Manage customer payouts and deposits</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-card rounded-2xl border border-border p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-muted">Scheduled</p>
          <p className="text-lg sm:text-xl font-semibold mt-1">{formatCurrency(totalScheduled)}</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-muted">Completed</p>
          <p className="text-lg sm:text-xl font-semibold mt-1 text-success">{formatCurrency(totalCompleted)}</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-muted">Failed</p>
          <p className="text-lg sm:text-xl font-semibold mt-1 text-danger">{formatCurrency(totalFailed)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        {statusOptions.map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors whitespace-nowrap shrink-0 ${
              statusFilter === status
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border text-muted hover:text-foreground"
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-card rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Customer</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Amount</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Scheduled</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Completed</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((payout) => (
                <tr key={payout.id} className="hover:bg-background/50">
                  <td className="px-5 py-3 font-medium">{payout.customerName}</td>
                  <td className="px-5 py-3">{formatCurrency(payout.amount)}</td>
                  <td className="px-5 py-3"><StatusBadge status={payout.status} /></td>
                  <td className="px-5 py-3 text-muted">{formatDate(payout.scheduledAt)}</td>
                  <td className="px-5 py-3 text-muted">{payout.completedAt ? formatDateTime(payout.completedAt) : "—"}</td>
                  <td className="px-5 py-3">
                    {payout.status === "failed" && (
                      <button className="flex items-center gap-1.5 px-3 py-1.5 bg-danger-light text-danger rounded-lg text-xs font-medium hover:opacity-80 transition-opacity">
                        <RotateCcw className="w-3 h-3" />Retry
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {filtered.map((payout) => (
          <div key={payout.id} className="bg-card rounded-2xl border border-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">{payout.customerName}</span>
              <StatusBadge status={payout.status} />
            </div>
            <p className="text-lg font-semibold">{formatCurrency(payout.amount)}</p>
            <div className="flex items-center justify-between text-xs text-muted">
              <span>Scheduled: {formatDate(payout.scheduledAt)}</span>
              <span>{payout.completedAt ? formatDateTime(payout.completedAt) : "Pending"}</span>
            </div>
            {payout.status === "failed" && (
              <button className="flex items-center gap-1.5 px-3 py-2 bg-danger-light text-danger rounded-xl text-xs font-medium hover:opacity-80 transition-opacity w-full justify-center">
                <RotateCcw className="w-3 h-3" />Retry Payout
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
