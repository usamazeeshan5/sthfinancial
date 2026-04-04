"use client";

import { useState } from "react";
import { Search, Filter } from "lucide-react";
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
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="Search by customer or ref..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted" />
          {statusOptions.map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
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

      {/* Table */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">
                  Ref ID
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">
                  Customer
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">
                  Tip Amount
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">
                  Fee
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">
                  Total Charged
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((txn) => (
                <tr key={txn.id} className="hover:bg-background/50">
                  <td className="px-5 py-3 font-mono text-xs">
                    {txn.luqraRefId}
                  </td>
                  <td className="px-5 py-3 font-medium">
                    {txn.customerName}
                  </td>
                  <td className="px-5 py-3">
                    {formatCurrency(txn.amount)}
                  </td>
                  <td className="px-5 py-3 text-muted">
                    {formatCurrency(txn.fee)}
                  </td>
                  <td className="px-5 py-3 font-medium">
                    {formatCurrency(txn.totalCharged)}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={txn.status} />
                  </td>
                  <td className="px-5 py-3 text-muted">
                    {formatDateTime(txn.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
