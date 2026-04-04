"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, CreditCard } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { customers, transactions, payouts, nfcChips } from "@/lib/mock-data";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

export default function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const customer = customers.find((c) => c.id === id);

  if (!customer) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted">Customer not found</p>
      </div>
    );
  }

  const customerTxns = transactions.filter((t) => t.customerId === id);
  const customerPayouts = payouts.filter((p) => p.customerId === id);
  const customerChips = nfcChips.filter((n) => n.customerId === id);
  const totalEarnings = customerTxns.reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-6">
      <Link
        href="/customers"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to customers
      </Link>

      {/* Customer Info Card */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center text-xl font-semibold text-accent">
              {customer.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-xl font-semibold">{customer.name}</h1>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  {customer.email}
                </span>
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" />
                  {customer.phone}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <StatusBadge
                  status={customer.active ? "active" : "disabled"}
                />
                <StatusBadge status={customer.bankAccountStatus} />
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted">Total Earnings</p>
            <p className="text-2xl font-semibold">
              {formatCurrency(totalEarnings)}
            </p>
            <p className="text-xs text-muted mt-1">
              Joined {formatDate(customer.createdAt)}
            </p>
          </div>
        </div>
      </div>

      {/* NFC Chips */}
      {customerChips.length > 0 && (
        <div className="bg-card rounded-2xl border border-border">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-muted" />
            <h2 className="text-sm font-medium">
              NFC Chips ({customerChips.length})
            </h2>
          </div>
          <div className="p-5 flex flex-wrap gap-3">
            {customerChips.map((chip) => (
              <div
                key={chip.id}
                className="flex items-center gap-2 px-3 py-2 bg-background rounded-xl text-sm"
              >
                <span className="font-mono text-xs">{chip.chipUid}</span>
                <StatusBadge status={chip.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transactions */}
      <div className="bg-card rounded-2xl border border-border">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-medium">
            Transactions ({customerTxns.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">
                  Ref
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">
                  Amount
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
              {customerTxns.map((txn) => (
                <tr key={txn.id} className="hover:bg-background/50">
                  <td className="px-5 py-3 font-mono text-xs">
                    {txn.luqraRefId}
                  </td>
                  <td className="px-5 py-3 font-medium">
                    {formatCurrency(txn.amount)}
                  </td>
                  <td className="px-5 py-3 text-muted">
                    {formatCurrency(txn.fee)}
                  </td>
                  <td className="px-5 py-3">
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

      {/* Payouts */}
      <div className="bg-card rounded-2xl border border-border">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-medium">
            Payouts ({customerPayouts.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">
                  Amount
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">
                  Scheduled
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">
                  Completed
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {customerPayouts.map((p) => (
                <tr key={p.id} className="hover:bg-background/50">
                  <td className="px-5 py-3 font-medium">
                    {formatCurrency(p.amount)}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-5 py-3 text-muted">
                    {formatDate(p.scheduledAt)}
                  </td>
                  <td className="px-5 py-3 text-muted">
                    {p.completedAt ? formatDateTime(p.completedAt) : "—"}
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
