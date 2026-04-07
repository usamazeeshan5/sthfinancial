"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, CreditCard } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

type CustomerData = {
  customer: { _id: string; name: string; email: string; phone: string; bankAccountStatus: string; active: boolean; createdAt: string };
  transactions: Array<{ _id: string; luqraRefId: string; amount: number; fee: number; totalCharged: number; status: string; createdAt: string }>;
  payouts: Array<{ _id: string; amount: number; status: string; scheduledAt: string; completedAt: string | null }>;
  nfcChips: Array<{ _id: string; chipUid: string; status: string }>;
};

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<CustomerData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/customers/${id}`).then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(setData).catch(() => setError(true));
  }, [id]);

  if (error) return <div className="flex items-center justify-center h-64"><p className="text-muted">Customer not found</p></div>;
  if (!data) return <div className="space-y-6"><div className="h-32 bg-card rounded-2xl border border-border animate-pulse" /></div>;

  const { customer, transactions: txns, payouts: pays, nfcChips: chips } = data;
  const totalEarnings = txns.reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-6">
      <Link href="/customers" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"><ArrowLeft className="w-4 h-4" />Back to customers</Link>
      <div className="bg-card rounded-2xl border border-border p-4 sm:p-6"><div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"><div className="flex items-start gap-3 sm:gap-4"><div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-accent/10 flex items-center justify-center text-lg sm:text-xl font-semibold text-accent shrink-0">{customer.name.charAt(0)}</div><div className="min-w-0"><h1 className="text-lg sm:text-xl font-semibold">{customer.name}</h1><div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-1 sm:gap-3 mt-1.5 text-sm text-muted"><span className="flex items-center gap-1.5 truncate"><Mail className="w-3.5 h-3.5 shrink-0" />{customer.email}</span><span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 shrink-0" />{customer.phone}</span></div><div className="flex items-center gap-2 mt-3"><StatusBadge status={customer.active ? "active" : "disabled"} /><StatusBadge status={customer.bankAccountStatus} /></div></div></div><div className="sm:text-right pl-15 sm:pl-0"><p className="text-sm text-muted">Total Earnings</p><p className="text-2xl font-semibold">{formatCurrency(totalEarnings)}</p><p className="text-xs text-muted mt-1">Joined {formatDate(customer.createdAt)}</p></div></div></div>
      {chips.length > 0 && <div className="bg-card rounded-2xl border border-border"><div className="px-4 sm:px-5 py-4 border-b border-border flex items-center gap-2"><CreditCard className="w-4 h-4 text-muted" /><h2 className="text-sm font-medium">NFC Chips ({chips.length})</h2></div><div className="p-4 sm:p-5 flex flex-wrap gap-3">{chips.map(c => <div key={c._id} className="flex items-center gap-2 px-3 py-2 bg-background rounded-xl text-sm"><span className="font-mono text-xs">{c.chipUid}</span><StatusBadge status={c.status} /></div>)}</div></div>}
      <div className="bg-card rounded-2xl border border-border"><div className="px-4 sm:px-5 py-4 border-b border-border"><h2 className="text-sm font-medium">Transactions ({txns.length})</h2></div><div className="hidden md:block overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border"><th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Ref</th><th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Amount</th><th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Fee</th><th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Total</th><th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Status</th><th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Date</th></tr></thead><tbody className="divide-y divide-border">{txns.map(t => <tr key={t._id} className="hover:bg-background/50"><td className="px-5 py-3 font-mono text-xs">{t.luqraRefId}</td><td className="px-5 py-3 font-medium">{formatCurrency(t.amount)}</td><td className="px-5 py-3 text-muted">{formatCurrency(t.fee)}</td><td className="px-5 py-3">{formatCurrency(t.totalCharged)}</td><td className="px-5 py-3"><StatusBadge status={t.status} /></td><td className="px-5 py-3 text-muted">{formatDateTime(t.createdAt)}</td></tr>)}</tbody></table></div><div className="md:hidden divide-y divide-border">{txns.map(t => <div key={t._id} className="px-4 py-3 space-y-2"><div className="flex items-center justify-between"><span className="font-mono text-xs text-muted">{t.luqraRefId}</span><StatusBadge status={t.status} /></div><div className="grid grid-cols-3 gap-2 text-sm"><div><p className="text-xs text-muted">Amount</p><p className="font-medium">{formatCurrency(t.amount)}</p></div><div><p className="text-xs text-muted">Fee</p><p>{formatCurrency(t.fee)}</p></div><div><p className="text-xs text-muted">Total</p><p>{formatCurrency(t.totalCharged)}</p></div></div><p className="text-xs text-muted">{formatDateTime(t.createdAt)}</p></div>)}</div></div>
      <div className="bg-card rounded-2xl border border-border"><div className="px-4 sm:px-5 py-4 border-b border-border"><h2 className="text-sm font-medium">Payouts ({pays.length})</h2></div><div className="hidden md:block overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border"><th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Amount</th><th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Status</th><th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Scheduled</th><th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Completed</th></tr></thead><tbody className="divide-y divide-border">{pays.map(p => <tr key={p._id} className="hover:bg-background/50"><td className="px-5 py-3 font-medium">{formatCurrency(p.amount)}</td><td className="px-5 py-3"><StatusBadge status={p.status} /></td><td className="px-5 py-3 text-muted">{formatDate(p.scheduledAt)}</td><td className="px-5 py-3 text-muted">{p.completedAt ? formatDateTime(p.completedAt) : "—"}</td></tr>)}</tbody></table></div><div className="md:hidden divide-y divide-border">{pays.map(p => <div key={p._id} className="px-4 py-3 space-y-1"><div className="flex items-center justify-between"><span className="font-medium text-sm">{formatCurrency(p.amount)}</span><StatusBadge status={p.status} /></div><div className="flex items-center justify-between text-xs text-muted"><span>Scheduled: {formatDate(p.scheduledAt)}</span><span>{p.completedAt ? formatDateTime(p.completedAt) : "Pending"}</span></div></div>)}</div></div>
    </div>
  );
}
