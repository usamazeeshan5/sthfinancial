"use client";

import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDateTime } from "@/lib/utils";

const statusOptions = ["all", "pending", "processed", "deposited", "failed"];
type Transaction = { _id: string; customerName: string; amount: number; fee: number; totalCharged: number; status: string; luqraRefId?: string; stripePaymentIntentId?: string; createdAt: string };

function getRefId(t: Transaction) {
  return t.stripePaymentIntentId || t.luqraRefId || t._id;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetch(`/api/transactions?status=${statusFilter}`).then(r => r.json()).then(d => { setTransactions(d.transactions); setLoading(false); }); }, [statusFilter]);

  const filtered = transactions.filter(t => t.customerName.toLowerCase().includes(search.toLowerCase()) || getRefId(t).toLowerCase().includes(search.toLowerCase()));
  const totalAmount = filtered.reduce((s, t) => s + t.amount, 0);
  const totalFees = filtered.reduce((s, t) => s + t.fee, 0);

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold tracking-tight">Transactions</h1><p className="text-sm text-muted mt-1">{filtered.length} transactions &middot; {formatCurrency(totalAmount)} total &middot; {formatCurrency(totalFees)} in fees</p></div>
      <div className="space-y-3">
        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" /><input type="text" placeholder="Search by customer or ID..." value={search} onChange={e => setSearch(e.target.value)} className="w-full sm:max-w-sm pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" /></div>
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">{statusOptions.map(s => <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors whitespace-nowrap shrink-0 ${statusFilter === s ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted hover:text-foreground"}`}>{s}</button>)}</div>
      </div>
      {loading ? <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="h-16 bg-card rounded-2xl border border-border animate-pulse"/>)}</div> : <>
        <div className="hidden md:block bg-card rounded-2xl border border-border overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border"><th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">ID</th><th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Customer</th><th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Tip Amount</th><th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Fee</th><th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Total Charged</th><th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Status</th><th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Date</th></tr></thead><tbody className="divide-y divide-border">{filtered.map(t => <tr key={t._id} className="hover:bg-background/50"><td className="px-5 py-3 font-mono text-xs max-w-[180px] truncate" title={getRefId(t)}>{getRefId(t)}</td><td className="px-5 py-3 font-medium">{t.customerName}</td><td className="px-5 py-3">{formatCurrency(t.amount)}</td><td className="px-5 py-3 text-muted">{formatCurrency(t.fee)}</td><td className="px-5 py-3 font-medium">{formatCurrency(t.totalCharged)}</td><td className="px-5 py-3"><StatusBadge status={t.status} /></td><td className="px-5 py-3 text-muted">{formatDateTime(t.createdAt)}</td></tr>)}</tbody></table></div></div>
        <div className="md:hidden space-y-3">{filtered.map(t => <div key={t._id} className="bg-card rounded-2xl border border-border p-4 space-y-3"><div className="flex items-center justify-between"><span className="font-medium text-sm">{t.customerName}</span><StatusBadge status={t.status} /></div><div className="grid grid-cols-3 gap-2 text-sm"><div><p className="text-xs text-muted">Tip</p><p className="font-medium">{formatCurrency(t.amount)}</p></div><div><p className="text-xs text-muted">Fee</p><p>{formatCurrency(t.fee)}</p></div><div><p className="text-xs text-muted">Total</p><p className="font-medium">{formatCurrency(t.totalCharged)}</p></div></div><div className="flex items-center justify-between text-xs text-muted"><span className="font-mono truncate max-w-[200px]" title={getRefId(t)}>{getRefId(t)}</span><span>{formatDateTime(t.createdAt)}</span></div></div>)}</div>
      </>}
    </div>
  );
}
