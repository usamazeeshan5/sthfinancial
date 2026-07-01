"use client";

import { useState, useEffect } from "react";
import { MoreHorizontal, Eye, Play, RotateCw } from "lucide-react";
import { Modal } from "@/components/modal";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

const statusOptions = ["all", "scheduled", "completed", "failed", "canceled"];

type Payout = {
  _id: string;
  customerId: string;
  customerName: string;
  amount: number;
  status: string;
  squarePayoutId: string;
  scheduledAt: string;
  completedAt: string | null;
  destination: string;
};

export default function PayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [detail, setDetail] = useState<Payout | null>(null);

  const fetchPayouts = () => {
    setLoading(true);
    setError(null);
    fetch(`/api/payouts?status=${statusFilter}`)
      .then((r) => r.json())
      .then((d) => {
        setPayouts(d.payouts ?? []);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load payouts.");
        setLoading(false);
      });
  };
  useEffect(fetchPayouts, [statusFilter]);

  // Close the row actions menu when clicking elsewhere.
  useEffect(() => {
    if (!openMenu) return;
    const close = () => setOpenMenu(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [openMenu]);

  const act = async (id: string, action: "process" | "retry") => {
    setActingId(id);
    setError(null);
    try {
      const r = await fetch(`/api/payouts/${id}/${action}`, { method: "POST" });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setError(d.error || `Failed to ${action} payout.`);
      } else {
        fetchPayouts();
      }
    } catch {
      setError(`Failed to ${action} payout.`);
    } finally {
      setActingId(null);
    }
  };

  const totalScheduled = payouts.filter((p) => p.status === "scheduled").reduce((s, p) => s + p.amount, 0);
  const totalCompleted = payouts.filter((p) => p.status === "completed").reduce((s, p) => s + p.amount, 0);
  const totalFailed = payouts.filter((p) => p.status === "failed").reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Payouts</h1>
        <p className="text-sm text-muted mt-1">
          Payout requests from workers. Tap Process to approve a scheduled request — this marks the worker&apos;s tips as deposited. (Square still auto-deposits their Square balance to their bank on its own schedule.)
        </p>
      </div>

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

      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        {statusOptions.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors whitespace-nowrap shrink-0 ${
              statusFilter === s
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border text-muted hover:text-foreground"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-danger-light border border-danger/20 text-danger text-sm rounded-2xl p-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-card rounded-2xl border border-border animate-pulse" />
          ))}
        </div>
      ) : payouts.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-8 text-center text-sm text-muted">
          No payout requests yet. They&apos;ll appear here when a worker requests a payout from the app.
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-card rounded-2xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Worker</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Amount</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Status</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Destination</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Requested</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Completed</th>
                    <th className="text-right px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {payouts.map((p) => (
                    <tr key={p._id} className="hover:bg-background/50">
                      <td className="px-5 py-3 font-medium">{p.customerName}</td>
                      <td className="px-5 py-3">{formatCurrency(p.amount)}</td>
                      <td className="px-5 py-3"><StatusBadge status={p.status} /></td>
                      <td className="px-5 py-3 text-muted">{p.destination}</td>
                      <td className="px-5 py-3 text-muted">{formatDate(p.scheduledAt)}</td>
                      <td className="px-5 py-3 text-muted">{p.completedAt ? formatDateTime(p.completedAt) : "—"}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {p.status === "scheduled" && (
                            <button
                              onClick={() => act(p._id, "process")}
                              disabled={actingId === p._id}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground disabled:opacity-50"
                            >
                              {actingId === p._id ? "Processing..." : "Process"}
                            </button>
                          )}
                          {p.status === "failed" && (
                            <button
                              onClick={() => act(p._id, "retry")}
                              disabled={actingId === p._id}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-card border border-border disabled:opacity-50"
                            >
                              {actingId === p._id ? "Retrying..." : "Retry"}
                            </button>
                          )}
                          <div className="relative">
                            <button onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === p._id ? null : p._id); }} className="p-1 rounded-lg hover:bg-sidebar-hover"><MoreHorizontal className="w-4 h-4 text-muted" /></button>
                            {openMenu === p._id && (
                              <div onClick={(e) => e.stopPropagation()} className="absolute right-0 top-8 z-20 w-44 bg-card border border-border rounded-xl shadow-lg py-1">
                                <button onClick={() => { setOpenMenu(null); setDetail(p); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-background transition-colors"><Eye className="w-4 h-4 text-muted" />View details</button>
                                {p.status === "scheduled" && <button onClick={() => { setOpenMenu(null); act(p._id, "process"); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-background transition-colors"><Play className="w-4 h-4 text-muted" />Process</button>}
                                {p.status === "failed" && <button onClick={() => { setOpenMenu(null); act(p._id, "retry"); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-background transition-colors"><RotateCw className="w-4 h-4 text-muted" />Retry</button>}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {payouts.map((p) => (
              <div key={p._id} className="bg-card rounded-2xl border border-border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{p.customerName}</span>
                  <StatusBadge status={p.status} />
                </div>
                <p className="text-lg font-semibold">{formatCurrency(p.amount)}</p>
                <div className="text-xs text-muted">
                  <p>Destination: {p.destination}</p>
                  <p>Requested: {formatDate(p.scheduledAt)}</p>
                  {p.completedAt && <p>Completed: {formatDateTime(p.completedAt)}</p>}
                </div>
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={() => setDetail(p)}
                    className="flex-1 px-3 py-2 rounded-lg text-xs font-medium bg-card border border-border text-muted hover:text-foreground transition-colors"
                  >
                    View details
                  </button>
                  {p.status === "scheduled" && (
                    <button
                      onClick={() => act(p._id, "process")}
                      disabled={actingId === p._id}
                      className="flex-1 px-3 py-2 rounded-lg text-xs font-medium bg-primary text-primary-foreground disabled:opacity-50"
                    >
                      {actingId === p._id ? "Processing..." : "Process"}
                    </button>
                  )}
                  {p.status === "failed" && (
                    <button
                      onClick={() => act(p._id, "retry")}
                      disabled={actingId === p._id}
                      className="flex-1 px-3 py-2 rounded-lg text-xs font-medium bg-card border border-border disabled:opacity-50"
                    >
                      {actingId === p._id ? "Retrying..." : "Retry"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Details modal */}
      <Modal open={detail !== null} onClose={() => setDetail(null)} title="Payout Details">
        {detail && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <StatusBadge status={detail.status} />
              <span className="text-lg font-semibold">{formatCurrency(detail.amount)}</span>
            </div>
            <div className="bg-background border border-border rounded-2xl divide-y divide-border">
              <DetailRow label="Worker" value={detail.customerName} />
              <DetailRow label="Amount" value={formatCurrency(detail.amount)} bold />
              <DetailRow label="Destination" value={detail.destination} />
              <DetailRow label="Requested" value={formatDate(detail.scheduledAt)} />
              <DetailRow label="Completed" value={detail.completedAt ? formatDateTime(detail.completedAt) : "—"} />
              {detail.squarePayoutId && <DetailRow label="Square payout ID" value={detail.squarePayoutId} mono />}
              <DetailRow label="Payout ID" value={detail._id} mono />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              {detail.status === "scheduled" && (
                <button onClick={() => { act(detail._id, "process"); setDetail(null); }} className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity">Process</button>
              )}
              {detail.status === "failed" && (
                <button onClick={() => { act(detail._id, "retry"); setDetail(null); }} className="px-4 py-2.5 bg-card border border-border rounded-xl text-sm font-medium hover:bg-background transition-colors">Retry</button>
              )}
              <button onClick={() => setDetail(null)} className="px-4 py-2.5 bg-background border border-border rounded-xl text-sm font-medium text-muted hover:text-foreground transition-colors">Close</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function DetailRow({ label, value, mono, bold }: { label: string; value: string; mono?: boolean; bold?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <span className="text-sm text-muted shrink-0">{label}</span>
      <span className={`text-sm text-right break-all ${mono ? "font-mono text-xs" : ""} ${bold ? "font-semibold" : "font-medium"}`}>{value}</span>
    </div>
  );
}
