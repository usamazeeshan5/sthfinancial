"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { transactions } from "@/lib/mock-data";
import { formatCurrency, formatDateTime } from "@/lib/utils";

const statusOptions = ["all", "pending", "processed", "deposited", "failed"];

export default function TransactionsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = transactions.filter((t) => {
    const matchesSearch =
      t.customerName.toLowerCase().includes(search.toLowerCase()) ||
      t.luqraRefId.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalAmount = filtered.reduce((sum, t) => sum + t.amount, 0);
  const totalFees = filtered.reduce((sum, t) => sum + t.fee, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
        <p className="text-sm text-muted mt-1">
          {filtered.length} transactions &middot;{" "}
          {formatCurrency(totalAmount)} total &middot;{" "}
          {formatCurrency(totalFees)} in fees
        </p>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="Search by customer or ref..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:max-w-sm pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
          />
        </div>
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
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-card rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Ref ID</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Customer</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Tip Amount</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Fee</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Total Charged</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((txn) => (
                <tr key={txn.id} className="hover:bg-background/50">
                  <td className="px-5 py-3 font-mono text-xs">{txn.luqraRefId}</td>
                  <td className="px-5 py-3 font-medium">{txn.customerName}</td>
                  <td className="px-5 py-3">{formatCurrency(txn.amount)}</td>
                  <td className="px-5 py-3 text-muted">{formatCurrency(txn.fee)}</td>
                  <td className="px-5 py-3 font-medium">{formatCurrency(txn.totalCharged)}</td>
                  <td className="px-5 py-3"><StatusBadge status={txn.status} /></td>
                  <td className="px-5 py-3 text-muted">{formatDateTime(txn.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {filtered.map((txn) => (
          <div key={txn.id} className="bg-card rounded-2xl border border-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">{txn.customerName}</span>
              <StatusBadge status={txn.status} />
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <p className="text-xs text-muted">Tip</p>
                <p className="font-medium">{formatCurrency(txn.amount)}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Fee</p>
                <p>{formatCurrency(txn.fee)}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Total</p>
                <p className="font-medium">{formatCurrency(txn.totalCharged)}</p>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-muted">
              <span className="font-mono">{txn.luqraRefId}</span>
              <span>{formatDateTime(txn.createdAt)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
