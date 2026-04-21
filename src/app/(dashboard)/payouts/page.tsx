"use client";

import { useState, useEffect } from "react";
import { RotateCcw, Play } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

const statusOptions = ["all", "scheduled", "completed", "failed"];
type Payout = { _id: string; customerName: string; amount: number; status: string; luqraTransferId?: string; scheduledAt: string; completedAt: string | null };

export default function PayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchPayouts = () => { fetch(`/api/payouts?status=${statusFilter}`).then(r => r.json()).then(d => { setPayouts(d.payouts); setLoading(false); }); };
  useEffect(fetchPayouts, [statusFilter]);

  const handleRetry = async (id: string) => {
    await fetch(`/api/payouts/${id}/retry`, { method: "POST" });
    fetchPayouts();
  };

  const handleProcess = async (id: string) => {
    setProcessingId(id);
    try {
      const res = await fetch(`/api/payouts/${id}/process`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to process payout");
      }
    } catch {
      alert("Failed to process payout. Please try again.");
    }
    setProcessingId(null);
    fetchPayouts();
  };

  const totalScheduled = payouts.filter(p => p.status === "scheduled").reduce((s, p) => s + p.amount, 0);
  const totalCompleted = payouts.filter(p => p.status === "completed").reduce((s, p) => s + p.amount, 0);
  const totalFailed = payouts.filter(p => p.status === "failed").reduce((s, p) => s + p.amount, 0);
  const filtered = statusFilter === "all" ? payouts : payouts.filter(p => p.status === statusFilter);

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold tracking-tight">Payouts</h1><p className="text-sm text-muted mt-1">Manage customer payouts and deposits</p></div>
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-card rounded-2xl border border-border p-3 sm:p-4"><p className="text-xs sm:text-sm text-muted">Scheduled</p><p className="text-lg sm:text-xl font-semibold mt-1">{formatCurrency(totalScheduled)}</p></div>
        <div className="bg-card rounded-2xl border border-border p-3 sm:p-4"><p className="text-xs sm:text-sm text-muted">Completed</p><p className="text-lg sm:text-xl font-semibold mt-1 text-success">{formatCurrency(totalCompleted)}</p></div>
        <div className="bg-card rounded-2xl border border-border p-3 sm:p-4"><p className="text-xs sm:text-sm text-muted">Failed</p><p className="text-lg sm:text-xl font-semibold mt-1 text-danger">{formatCurrency(totalFailed)}</p></div>
      </div>
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">{statusOptions.map(s => <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors whitespace-nowrap shrink-0 ${statusFilter === s ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted hover:text-foreground"}`}>{s}</button>)}</div>
      {loading ? <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="h-16 bg-card rounded-2xl border border-border animate-pulse"/>)}</div> : <>
        {/* Desktop Table */}
        <div className="hidden md:block bg-card rounded-2xl border border-border overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border"><th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Customer</th><th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Amount</th><th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Status</th><th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Scheduled</th><th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Completed</th><th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Actions</th></tr></thead><tbody className="divide-y divide-border">{filtered.map(p => <tr key={p._id} className="hover:bg-background/50">
          <td className="px-5 py-3 font-medium">{p.customerName}</td>
          <td className="px-5 py-3">{formatCurrency(p.amount)}</td>
          <td className="px-5 py-3"><StatusBadge status={p.status} /></td>
          <td className="px-5 py-3 text-muted">{formatDate(p.scheduledAt)}</td>
          <td className="px-5 py-3 text-muted">{p.completedAt ? formatDateTime(p.completedAt) : "—"}</td>
          <td className="px-5 py-3">
            <div className="flex gap-2">
              {p.status === "scheduled" && <button onClick={() => handleProcess(p._id)} disabled={processingId === p._id} className="flex items-center gap-1.5 px-3 py-1.5 bg-accent/10 text-accent rounded-lg text-xs font-medium hover:opacity-80 transition-opacity disabled:opacity-50"><Play className="w-3 h-3" />{processingId === p._id ? "Processing..." : "Process"}</button>}
              {p.status === "failed" && <button onClick={() => handleRetry(p._id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-danger-light text-danger rounded-lg text-xs font-medium hover:opacity-80 transition-opacity"><RotateCcw className="w-3 h-3" />Retry</button>}
            </div>
          </td>
        </tr>)}</tbody></table></div></div>
        {/* Mobile Cards */}
        <div className="md:hidden space-y-3">{filtered.map(p => <div key={p._id} className="bg-card rounded-2xl border border-border p-4 space-y-3"><div className="flex items-center justify-between"><span className="font-medium text-sm">{p.customerName}</span><StatusBadge status={p.status} /></div><p className="text-lg font-semibold">{formatCurrency(p.amount)}</p><div className="flex items-center justify-between text-xs text-muted"><span>Scheduled: {formatDate(p.scheduledAt)}</span><span>{p.completedAt ? formatDateTime(p.completedAt) : "Pending"}</span></div>
          <div className="flex gap-2">
            {p.status === "scheduled" && <button onClick={() => handleProcess(p._id)} disabled={processingId === p._id} className="flex items-center gap-1.5 px-3 py-2 bg-accent/10 text-accent rounded-xl text-xs font-medium hover:opacity-80 transition-opacity w-full justify-center disabled:opacity-50"><Play className="w-3 h-3" />{processingId === p._id ? "Processing..." : "Process Payout"}</button>}
            {p.status === "failed" && <button onClick={() => handleRetry(p._id)} className="flex items-center gap-1.5 px-3 py-2 bg-danger-light text-danger rounded-xl text-xs font-medium hover:opacity-80 transition-opacity w-full justify-center"><RotateCcw className="w-3 h-3" />Retry Payout</button>}
          </div>
        </div>)}</div>
      </>}
    </div>
  );
}
