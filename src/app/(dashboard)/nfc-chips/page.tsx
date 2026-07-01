"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Link2, Unlink, Layers, Download, MoreHorizontal, Eye, Trash2, Power, ChevronLeft, ChevronRight } from "lucide-react";
import { Modal } from "@/components/modal";
import { StatusBadge } from "@/components/status-badge";
import { formatDate } from "@/lib/utils";

type NfcChip = { _id: string; chipUid: string; customerId: string | null; customerName: string | null; status: string; claimed?: boolean; batchId?: string | null; registeredAt: string };
type Customer = { _id: string; name: string; email: string; active: boolean };
type Batch = { batchId: string; total: number; claimed: number; unclaimed: number; createdAt: string };

const filterOptions = ["all", "active", "unassigned", "assigned", "disabled"];
const PAGE_SIZE = 20;

export default function NfcChipsPage() {
  const router = useRouter();
  const [chips, setChips] = useState<NfcChip[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, assigned: 0 });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [showRegister, setShowRegister] = useState(false);
  const [showLink, setShowLink] = useState<string | null>(null);
  const [showBatch, setShowBatch] = useState(false);
  const [batchCount, setBatchCount] = useState("100");
  const [generating, setGenerating] = useState(false);
  const [newUid, setNewUid] = useState("");
  const [loading, setLoading] = useState(true);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<NfcChip | null>(null);

  const fetchChips = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ search, filter, page: String(page), limit: String(PAGE_SIZE) });
    const res = await fetch(`/api/nfc-chips?${params}`);
    const d = await res.json();
    setChips(d.chips || []);
    setTotal(d.total || 0);
    if (d.stats) setStats(d.stats);
    setLoading(false);
  }, [search, filter, page]);

  const fetchBatches = () => { fetch("/api/nfc-chips/batch").then(r => r.json()).then(d => setBatches(d.batches || [])); };

  useEffect(() => { const t = setTimeout(fetchChips, 300); return () => clearTimeout(t); }, [fetchChips]);
  useEffect(() => { fetchBatches(); fetch("/api/customers").then(r => r.json()).then(d => setCustomers(d.customers)); }, []);

  useEffect(() => {
    if (!openMenu) return;
    const close = () => setOpenMenu(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [openMenu]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUid.trim()) return;
    await fetch("/api/nfc-chips", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chipUid: newUid.trim() }) });
    setNewUid(""); setShowRegister(false); fetchChips();
  };

  const handleGenerateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    const count = parseInt(batchCount, 10);
    if (!count || count < 1) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/nfc-chips/batch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ count }) });
      const data = await res.json();
      if (data.batchId) {
        window.location.href = `/api/nfc-chips/batch?batchId=${data.batchId}&format=csv`;
        setShowBatch(false); setBatchCount("100");
        fetchChips(); fetchBatches();
      }
    } finally {
      setGenerating(false);
    }
  };

  const downloadBatch = (batchId: string) => { window.location.href = `/api/nfc-chips/batch?batchId=${batchId}&format=csv`; };

  const handleLink = async (chipId: string, customerId: string) => {
    await fetch(`/api/nfc-chips/${chipId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customerId }) });
    setShowLink(null); fetchChips();
  };

  const handleUnlink = async (chipId: string) => {
    await fetch(`/api/nfc-chips/${chipId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customerId: null }) });
    fetchChips();
  };

  const toggleStatus = async (chip: NfcChip) => {
    setOpenMenu(null);
    const status = chip.status === "active" ? "disabled" : "active";
    await fetch(`/api/nfc-chips/${chip._id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    fetchChips();
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    await fetch(`/api/nfc-chips/${confirmDelete._id}`, { method: "DELETE" });
    setConfirmDelete(null);
    fetchChips(); fetchBatches();
  };

  const actionsMenu = (chip: NfcChip) => (
    <div className="relative">
      <button onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === chip._id ? null : chip._id); }} className="p-1 rounded-lg hover:bg-sidebar-hover"><MoreHorizontal className="w-4 h-4 text-muted" /></button>
      {openMenu === chip._id && (
        <div onClick={(e) => e.stopPropagation()} className="absolute right-0 top-8 z-20 w-44 bg-card border border-border rounded-xl shadow-lg py-1">
          {chip.customerId && <button onClick={() => { setOpenMenu(null); router.push(`/customers/${chip.customerId}`); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-background transition-colors"><Eye className="w-4 h-4 text-muted" />View customer</button>}
          {chip.customerId ? <button onClick={() => { setOpenMenu(null); handleUnlink(chip._id); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-background transition-colors"><Unlink className="w-4 h-4 text-muted" />Unlink</button> : <button onClick={() => { setOpenMenu(null); setShowLink(chip._id); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-background transition-colors"><Link2 className="w-4 h-4 text-muted" />Link to customer</button>}
          <button onClick={() => toggleStatus(chip)} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-background transition-colors"><Power className="w-4 h-4 text-muted" />{chip.status === "active" ? "Disable" : "Activate"}</button>
          <button onClick={() => { setOpenMenu(null); setConfirmDelete(chip); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4" />Delete</button>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0"><h1 className="text-2xl font-semibold tracking-tight">NFC Chips</h1><p className="text-sm text-muted mt-1">{stats.total} total &middot; {stats.active} active &middot; {stats.assigned} assigned</p></div>
        <div className="flex items-center gap-2 shrink-0"><button onClick={() => setShowBatch(true)} className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-xl text-sm font-medium hover:bg-background transition-colors"><Layers className="w-4 h-4" /><span className="hidden sm:inline">Generate Batch</span><span className="sm:hidden">Batch</span></button><button onClick={() => setShowRegister(true)} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"><Plus className="w-4 h-4" /><span className="hidden sm:inline">Register Chip</span><span className="sm:hidden">Register</span></button></div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card rounded-2xl border border-border p-4"><p className="text-xs text-muted uppercase tracking-wider">Total</p><p className="text-2xl font-semibold mt-1 tabular-nums">{stats.total}</p></div>
        <div className="bg-card rounded-2xl border border-border p-4"><p className="text-xs text-muted uppercase tracking-wider">Active</p><p className="text-2xl font-semibold mt-1 tabular-nums text-success">{stats.active}</p></div>
        <div className="bg-card rounded-2xl border border-border p-4"><p className="text-xs text-muted uppercase tracking-wider">Assigned</p><p className="text-2xl font-semibold mt-1 tabular-nums text-accent">{stats.assigned}</p></div>
      </div>

      {batches.length > 0 && <div className="bg-card rounded-2xl border border-border p-4"><div className="flex items-center justify-between mb-3"><h2 className="text-sm font-semibold">Code Batches</h2><span className="text-xs text-muted">{batches.length} batch{batches.length === 1 ? "" : "es"}</span></div><div className="space-y-2">{batches.map(b => <div key={b.batchId} className="flex items-center justify-between gap-3 py-2 border-b border-border last:border-0"><div className="min-w-0"><p className="font-mono text-xs truncate">{b.batchId}</p><p className="text-xs text-muted mt-0.5">{b.total} codes &middot; {b.claimed} claimed &middot; {b.unclaimed} unclaimed &middot; {formatDate(b.createdAt)}</p></div><button onClick={() => downloadBatch(b.batchId)} className="flex items-center gap-1.5 px-3 py-1.5 bg-background rounded-lg text-xs font-medium text-muted hover:text-foreground transition-colors shrink-0"><Download className="w-3 h-3" />CSV</button></div>)}</div></div>}

      {/* Search + filters */}
      <div className="space-y-3">
        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" /><input type="text" placeholder="Search by UID or customer..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="w-full sm:max-w-sm pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" /></div>
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">{filterOptions.map(f => <button key={f} onClick={() => { setFilter(f); setPage(1); }} className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors whitespace-nowrap shrink-0 ${filter === f ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted hover:text-foreground"}`}>{f}</button>)}</div>
      </div>

      {loading ? <div className="space-y-3">{[1,2,3,4,5].map(i=><div key={i} className="h-16 bg-card rounded-2xl border border-border animate-pulse"/>)}</div> : total === 0 ? (
        <div className="bg-card rounded-2xl border border-border py-16 text-center"><p className="text-sm text-muted">No chips found</p></div>
      ) : <>
        {/* Desktop table */}
        <div className="hidden md:block bg-card rounded-2xl border border-border overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="border-b border-border bg-background/50">
            <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Chip UID</th>
            <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Customer</th>
            <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Status</th>
            <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Registered</th>
            <th className="px-5 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">Actions</th>
          </tr></thead>
          <tbody className="divide-y divide-border">{chips.map(chip => (
            <tr key={chip._id} className="hover:bg-background/50 transition-colors">
              <td className="px-5 py-3 font-mono text-xs">{chip.chipUid}</td>
              <td className="px-5 py-3">{chip.customerName ? <span className="font-medium">{chip.customerName}</span> : <span className="text-muted italic">Unassigned</span>}</td>
              <td className="px-5 py-3"><StatusBadge status={chip.status} /></td>
              <td className="px-5 py-3 text-muted whitespace-nowrap">{formatDate(chip.registeredAt)}</td>
              <td className="px-5 py-3"><div className="flex justify-end">{actionsMenu(chip)}</div></td>
            </tr>
          ))}</tbody>
        </table></div></div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-3">{chips.map(chip => <div key={chip._id} className="bg-card rounded-2xl border border-border p-4 space-y-3"><div className="flex items-center justify-between"><span className="font-mono text-xs">{chip.chipUid}</span><StatusBadge status={chip.status} /></div><div className="flex items-center justify-between"><div>{chip.customerName ? <p className="text-sm font-medium">{chip.customerName}</p> : <p className="text-sm text-muted italic">Unassigned</p>}<p className="text-xs text-muted mt-0.5">Registered {formatDate(chip.registeredAt)}</p></div>{actionsMenu(chip)}</div></div>)}</div>

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

      <Modal open={showRegister} onClose={() => { setShowRegister(false); setNewUid(""); }} title="Register New Chip"><form onSubmit={handleRegister} className="space-y-4"><div><label className="block text-sm text-muted mb-1.5">Chip UID</label><input type="text" value={newUid} onChange={e => setNewUid(e.target.value)} placeholder="e.g. 04:A2:3B:C1:00:11" className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" required autoFocus /><p className="text-xs text-muted mt-1.5">Enter the unique identifier printed on the NFC chip</p></div><div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => { setShowRegister(false); setNewUid(""); }} className="px-4 py-2.5 bg-background border border-border rounded-xl text-sm font-medium text-muted hover:text-foreground transition-colors">Cancel</button><button type="submit" className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity">Register</button></div></form></Modal>
      <Modal open={showBatch} onClose={() => { setShowBatch(false); setBatchCount("100"); }} title="Generate Code Batch"><form onSubmit={handleGenerateBatch} className="space-y-4"><div><label className="block text-sm text-muted mb-1.5">Number of codes</label><input type="number" min={1} max={5000} value={batchCount} onChange={e => setBatchCount(e.target.value)} className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" required autoFocus /><p className="text-xs text-muted mt-1.5">Generates unclaimed codes (format <span className="font-mono">LT-XXXX-XXXX</span>) and downloads them as a CSV. Use these when programming the chips — buyers claim a code during sign-up.</p></div><div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => { setShowBatch(false); setBatchCount("100"); }} className="px-4 py-2.5 bg-background border border-border rounded-xl text-sm font-medium text-muted hover:text-foreground transition-colors">Cancel</button><button type="submit" disabled={generating} className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60">{generating ? "Generating..." : "Generate & Download"}</button></div></form></Modal>
      <Modal open={confirmDelete !== null} onClose={() => setConfirmDelete(null)} title="Delete Chip"><div className="space-y-4"><p className="text-sm text-muted">Delete chip <span className="font-mono text-foreground">{confirmDelete?.chipUid}</span>{confirmDelete?.customerName ? <> (assigned to <span className="font-medium text-foreground">{confirmDelete.customerName}</span>)</> : null}? This cannot be undone.</p><div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setConfirmDelete(null)} className="px-4 py-2.5 bg-background border border-border rounded-xl text-sm font-medium text-muted hover:text-foreground transition-colors">Cancel</button><button type="button" onClick={handleDelete} className="px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity">Delete</button></div></div></Modal>
      <Modal open={showLink !== null} onClose={() => setShowLink(null)} title="Link Chip to Customer"><div className="space-y-2"><p className="text-sm text-muted mb-3">Select a customer to link this chip to:</p>{customers.filter(c => c.active).map(c => <button key={c._id} onClick={() => showLink && handleLink(showLink, c._id)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-background transition-colors text-left"><div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center text-sm font-semibold text-accent shrink-0">{c.name.charAt(0)}</div><div className="min-w-0"><p className="text-sm font-medium truncate">{c.name}</p><p className="text-xs text-muted truncate">{c.email}</p></div></button>)}</div></Modal>
    </div>
  );
}
