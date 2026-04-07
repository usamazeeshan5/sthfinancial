"use client";

import { useState, useEffect } from "react";
import { Search, Plus, Link2, Unlink } from "lucide-react";
import { Modal } from "@/components/modal";
import { StatusBadge } from "@/components/status-badge";
import { formatDate } from "@/lib/utils";

type NfcChip = { _id: string; chipUid: string; customerId: string | null; customerName: string | null; status: string; registeredAt: string };
type Customer = { _id: string; name: string; email: string; active: boolean };

export default function NfcChipsPage() {
  const [chips, setChips] = useState<NfcChip[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [showRegister, setShowRegister] = useState(false);
  const [showLink, setShowLink] = useState<string | null>(null);
  const [newUid, setNewUid] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchChips = () => { fetch("/api/nfc-chips").then(r => r.json()).then(d => { setChips(d.chips); setLoading(false); }); };
  useEffect(() => { fetchChips(); fetch("/api/customers").then(r => r.json()).then(d => setCustomers(d.customers)); }, []);

  const filtered = chips.filter(c => c.chipUid.toLowerCase().includes(search.toLowerCase()) || (c.customerName && c.customerName.toLowerCase().includes(search.toLowerCase())));
  const activeCount = chips.filter(c => c.status === "active").length;
  const assignedCount = chips.filter(c => c.customerId).length;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUid.trim()) return;
    await fetch("/api/nfc-chips", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chipUid: newUid.trim() }) });
    setNewUid(""); setShowRegister(false); fetchChips();
  };

  const handleLink = async (chipId: string, customerId: string) => {
    await fetch(`/api/nfc-chips/${chipId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customerId }) });
    setShowLink(null); fetchChips();
  };

  const handleUnlink = async (chipId: string) => {
    await fetch(`/api/nfc-chips/${chipId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customerId: null }) });
    fetchChips();
  };

  if (loading) return <div className="space-y-6"><div><h1 className="text-2xl font-semibold tracking-tight">NFC Chips</h1></div><div className="space-y-3">{[1,2,3].map(i=><div key={i} className="h-16 bg-card rounded-2xl border border-border animate-pulse"/>)}</div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3"><div className="min-w-0"><h1 className="text-2xl font-semibold tracking-tight">NFC Chips</h1><p className="text-sm text-muted mt-1">{chips.length} total &middot; {activeCount} active &middot; {assignedCount} assigned</p></div><button onClick={() => setShowRegister(true)} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity shrink-0"><Plus className="w-4 h-4" /><span className="hidden sm:inline">Register Chip</span><span className="sm:hidden">Register</span></button></div>
      <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" /><input type="text" placeholder="Search by UID or customer..." value={search} onChange={e => setSearch(e.target.value)} className="w-full sm:max-w-sm pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" /></div>
      <div className="hidden md:block bg-card rounded-2xl border border-border overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border"><th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Chip UID</th><th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Customer</th><th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Status</th><th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Registered</th><th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Actions</th></tr></thead><tbody className="divide-y divide-border">{filtered.map(chip => <tr key={chip._id} className="hover:bg-background/50"><td className="px-5 py-3 font-mono text-xs">{chip.chipUid}</td><td className="px-5 py-3">{chip.customerName ? <span className="font-medium">{chip.customerName}</span> : <span className="text-muted italic">Unassigned</span>}</td><td className="px-5 py-3"><StatusBadge status={chip.status} /></td><td className="px-5 py-3 text-muted">{formatDate(chip.registeredAt)}</td><td className="px-5 py-3">{chip.customerId ? <button onClick={() => handleUnlink(chip._id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-background rounded-lg text-xs font-medium text-muted hover:text-foreground transition-colors"><Unlink className="w-3 h-3" />Unlink</button> : <button onClick={() => setShowLink(chip._id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-light rounded-lg text-xs font-medium text-accent hover:opacity-80 transition-opacity"><Link2 className="w-3 h-3" />Link</button>}</td></tr>)}</tbody></table></div></div>
      <div className="md:hidden space-y-3">{filtered.map(chip => <div key={chip._id} className="bg-card rounded-2xl border border-border p-4 space-y-3"><div className="flex items-center justify-between"><span className="font-mono text-xs">{chip.chipUid}</span><StatusBadge status={chip.status} /></div><div className="flex items-center justify-between"><div>{chip.customerName ? <p className="text-sm font-medium">{chip.customerName}</p> : <p className="text-sm text-muted italic">Unassigned</p>}<p className="text-xs text-muted mt-0.5">Registered {formatDate(chip.registeredAt)}</p></div>{chip.customerId ? <button onClick={() => handleUnlink(chip._id)} className="flex items-center gap-1.5 px-3 py-2 bg-background rounded-xl text-xs font-medium text-muted hover:text-foreground transition-colors"><Unlink className="w-3 h-3" />Unlink</button> : <button onClick={() => setShowLink(chip._id)} className="flex items-center gap-1.5 px-3 py-2 bg-accent-light rounded-xl text-xs font-medium text-accent hover:opacity-80 transition-opacity"><Link2 className="w-3 h-3" />Link</button>}</div></div>)}</div>
      <Modal open={showRegister} onClose={() => { setShowRegister(false); setNewUid(""); }} title="Register New Chip"><form onSubmit={handleRegister} className="space-y-4"><div><label className="block text-sm text-muted mb-1.5">Chip UID</label><input type="text" value={newUid} onChange={e => setNewUid(e.target.value)} placeholder="e.g. 04:A2:3B:C1:00:11" className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" required autoFocus /><p className="text-xs text-muted mt-1.5">Enter the unique identifier printed on the NFC chip</p></div><div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => { setShowRegister(false); setNewUid(""); }} className="px-4 py-2.5 bg-background border border-border rounded-xl text-sm font-medium text-muted hover:text-foreground transition-colors">Cancel</button><button type="submit" className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity">Register</button></div></form></Modal>
      <Modal open={showLink !== null} onClose={() => setShowLink(null)} title="Link Chip to Customer"><div className="space-y-2"><p className="text-sm text-muted mb-3">Select a customer to link this chip to:</p>{customers.filter(c => c.active).map(c => <button key={c._id} onClick={() => showLink && handleLink(showLink, c._id)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-background transition-colors text-left"><div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center text-sm font-semibold text-accent shrink-0">{c.name.charAt(0)}</div><div className="min-w-0"><p className="text-sm font-medium truncate">{c.name}</p><p className="text-xs text-muted truncate">{c.email}</p></div></button>)}</div></Modal>
    </div>
  );
}
