"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, MoreHorizontal, Eye, Copy, ChevronLeft, ChevronRight } from "lucide-react";
import { Modal } from "@/components/modal";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDateTime } from "@/lib/utils";

const statusOptions = ["all", "pending", "processed", "deposited", "failed"];
type Transaction = { _id: string; customerName: string; amount: number; fee: number; totalCharged: number; status: string; quoteId?: string; squarePaymentId?: string; createdAt: string };

const PAGE_SIZE = 20;

function getRefId(t: Transaction) {
  return t.squarePaymentId || t.quoteId || t._id;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [totalFees, setTotalFees] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [detail, setDetail] = useState<Transaction | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ status: statusFilter, search, page: String(page), limit: String(PAGE_SIZE) });
    const res = await fetch(`/api/transactions?${params}`);
    const d = await res.json();
    setTransactions(d.transactions || []);
    setTotal(d.total || 0);
    setTotalAmount(d.totalAmount || 0);
    setTotalFees(d.totalFees || 0);
    setLoading(false);
  }, [statusFilter, search, page]);

  // Debounce so typing in search doesn't fire a request per keystroke.
  useEffect(() => { const t = setTimeout(fetchTransactions, 300); return () => clearTimeout(t); }, [fetchTransactions]);

  useEffect(() => {
    if (!openMenu) return;
    const close = () => setOpenMenu(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [openMenu]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);

  const copyId = (id: string) => {
    navigator.clipboard?.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
        <p className="text-sm text-muted mt-1">{total} transactions &middot; {formatCurrency(totalAmount)} total &middot; {formatCurrency(totalFees)} in fees</p>
      </div>

      <div className="space-y-3">
        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" /><input type="text" placeholder="Search by customer or ID..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="w-full sm:max-w-sm pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" /></div>
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">{statusOptions.map(s => <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }} className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors whitespace-nowrap shrink-0 ${statusFilter === s ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted hover:text-foreground"}`}>{s}</button>)}</div>
      </div>

      {loading ? <div className="space-y-3">{[1,2,3,4,5].map(i=><div key={i} className="h-16 bg-card rounded-2xl border border-border animate-pulse"/>)}</div> : total === 0 ? (
        <div className="bg-card rounded-2xl border border-border py-16 text-center"><p className="text-sm text-muted">No transactions found</p></div>
      ) : <>
        {/* Desktop table */}
        <div className="hidden md:block bg-card rounded-2xl border border-border overflow-hidden">
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-background/50">
              <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Reference ID</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Customer</th>
              <th className="text-right px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Tip Amount</th>
              <th className="text-right px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Fee</th>
              <th className="text-right px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Total Charged</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Status</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Date</th>
              <th className="px-5 py-3" />
            </tr></thead>
            <tbody className="divide-y divide-border">{transactions.map(t => (
              <tr key={t._id} className="hover:bg-background/50 transition-colors">
                <td className="px-5 py-3 font-mono text-xs text-muted max-w-[160px] truncate" title={getRefId(t)}>{getRefId(t)}</td>
                <td className="px-5 py-3 font-medium">{t.customerName}</td>
                <td className="px-5 py-3 text-right font-medium tabular-nums">{formatCurrency(t.amount)}</td>
                <td className="px-5 py-3 text-right text-muted tabular-nums">{formatCurrency(t.fee)}</td>
                <td className="px-5 py-3 text-right font-semibold tabular-nums">{formatCurrency(t.totalCharged)}</td>
                <td className="px-5 py-3"><StatusBadge status={t.status} /></td>
                <td className="px-5 py-3 text-muted whitespace-nowrap">{formatDateTime(t.createdAt)}</td>
                <td className="px-5 py-3">
                  <div className="relative">
                    <button onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === t._id ? null : t._id); }} className="p-1 rounded-lg hover:bg-sidebar-hover"><MoreHorizontal className="w-4 h-4 text-muted" /></button>
                    {openMenu === t._id && (
                      <div onClick={(e) => e.stopPropagation()} className="absolute right-0 top-8 z-20 w-44 bg-card border border-border rounded-xl shadow-lg py-1">
                        <button onClick={() => { setOpenMenu(null); setDetail(t); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-background transition-colors"><Eye className="w-4 h-4 text-muted" />View details</button>
                        <button onClick={() => { setOpenMenu(null); copyId(getRefId(t)); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-background transition-colors"><Copy className="w-4 h-4 text-muted" />Copy reference ID</button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}</tbody>
          </table></div>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-3">{transactions.map(t => (
          <button key={t._id} onClick={() => setDetail(t)} className="w-full text-left bg-card rounded-2xl border border-border p-4 space-y-3 active:bg-background/50">
            <div className="flex items-center justify-between"><span className="font-medium text-sm">{t.customerName}</span><StatusBadge status={t.status} /></div>
            <div className="grid grid-cols-3 gap-2 text-sm"><div><p className="text-xs text-muted">Tip</p><p className="font-medium tabular-nums">{formatCurrency(t.amount)}</p></div><div><p className="text-xs text-muted">Fee</p><p className="tabular-nums">{formatCurrency(t.fee)}</p></div><div><p className="text-xs text-muted">Total</p><p className="font-medium tabular-nums">{formatCurrency(t.totalCharged)}</p></div></div>
            <div className="flex items-center justify-between text-xs text-muted"><span className="font-mono truncate max-w-[200px]" title={getRefId(t)}>{getRefId(t)}</span><span>{formatDateTime(t.createdAt)}</span></div>
          </button>
        ))}</div>

        {/* Pagination */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-xs text-muted">Showing {rangeStart}&ndash;{rangeEnd} of {total}</p>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium bg-card border border-border text-muted hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"><ChevronLeft className="w-4 h-4" />Prev</button>
            <span className="px-3 py-2 text-sm text-muted">Page {page} of {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium bg-card border border-border text-muted hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Next<ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      </>}

      {/* Details modal */}
      <Modal open={detail !== null} onClose={() => setDetail(null)} title="Transaction Details">
        {detail && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <StatusBadge status={detail.status} />
              <span className="text-xs text-muted">{formatDateTime(detail.createdAt)}</span>
            </div>
            <div className="bg-background border border-border rounded-2xl divide-y divide-border">
              <Row label="Customer" value={detail.customerName} />
              <Row label="Tip amount" value={formatCurrency(detail.amount)} />
              <Row label="Fee" value={formatCurrency(detail.fee)} />
              <Row label="Total charged" value={formatCurrency(detail.totalCharged)} bold />
              {detail.squarePaymentId && <Row label="Square payment ID" value={detail.squarePaymentId} mono />}
              {detail.quoteId && <Row label="Quote ID" value={detail.quoteId} mono />}
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => copyId(getRefId(detail))} className="flex items-center gap-2 px-4 py-2.5 bg-background border border-border rounded-xl text-sm font-medium text-muted hover:text-foreground transition-colors"><Copy className="w-4 h-4" />{copied ? "Copied!" : "Copy reference ID"}</button>
              <button onClick={() => setDetail(null)} className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity">Close</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Row({ label, value, mono, bold }: { label: string; value: string; mono?: boolean; bold?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <span className="text-sm text-muted shrink-0">{label}</span>
      <span className={`text-sm text-right break-all ${mono ? "font-mono text-xs" : ""} ${bold ? "font-semibold" : "font-medium"}`}>{value}</span>
    </div>
  );
}
