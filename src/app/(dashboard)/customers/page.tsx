"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Search, Plus, MoreHorizontal } from "lucide-react";
import { Modal } from "@/components/modal";
import { StatusBadge } from "@/components/status-badge";
import { formatDate } from "@/lib/utils";

type Customer = { _id: string; name: string; email: string; phone: string; bankAccountStatus: "connected" | "pending" | "disconnected"; active: boolean; createdAt: string };

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchCustomers = useCallback(async () => {
    const res = await fetch(`/api/customers?search=${encodeURIComponent(search)}`);
    const data = await res.json();
    setCustomers(data.customers);
    setLoading(false);
  }, [search]);

  useEffect(() => { const t = setTimeout(fetchCustomers, 300); return () => clearTimeout(t); }, [fetchCustomers]);

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) return;
    const res = await fetch("/api/customers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to add customer");
      return;
    }
    setForm({ name: "", email: "", phone: "", password: "" });
    setShowAdd(false);
    setError("");
    fetchCustomers();
  };

  if (loading) return <div className="space-y-6"><div><h1 className="text-2xl font-semibold tracking-tight">Customers</h1></div><div className="space-y-3">{[1,2,3].map(i=><div key={i} className="h-16 bg-card rounded-2xl border border-border animate-pulse"/>)}</div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0"><h1 className="text-2xl font-semibold tracking-tight">Customers</h1><p className="text-sm text-muted mt-1">{customers.length} total customers</p></div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity shrink-0"><Plus className="w-4 h-4" /><span className="hidden sm:inline">Add Customer</span><span className="sm:hidden">Add</span></button>
      </div>
      <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" /><input type="text" placeholder="Search customers..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full sm:max-w-sm pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" /></div>
      <div className="hidden md:block bg-card rounded-2xl border border-border overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border"><th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Name</th><th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Email</th><th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Phone</th><th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Bank</th><th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Status</th><th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Joined</th><th className="px-5 py-3" /></tr></thead><tbody className="divide-y divide-border">{customers.map((c) => (<tr key={c._id} className="hover:bg-background/50"><td className="px-5 py-3"><Link href={`/customers/${c._id}`} className="font-medium text-accent hover:underline">{c.name}</Link></td><td className="px-5 py-3 text-muted">{c.email}</td><td className="px-5 py-3 text-muted">{c.phone}</td><td className="px-5 py-3"><StatusBadge status={c.bankAccountStatus} /></td><td className="px-5 py-3"><StatusBadge status={c.active ? "active" : "disabled"} /></td><td className="px-5 py-3 text-muted">{formatDate(c.createdAt)}</td><td className="px-5 py-3"><button className="p-1 rounded-lg hover:bg-sidebar-hover"><MoreHorizontal className="w-4 h-4 text-muted" /></button></td></tr>))}</tbody></table></div></div>
      <div className="md:hidden space-y-3">{customers.map((c) => (<Link key={c._id} href={`/customers/${c._id}`} className="block bg-card rounded-2xl border border-border p-4 active:bg-background/50"><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3 min-w-0"><div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-sm font-semibold text-accent shrink-0">{c.name.charAt(0)}</div><div className="min-w-0"><p className="text-sm font-medium truncate">{c.name}</p><p className="text-xs text-muted truncate">{c.email}</p></div></div><StatusBadge status={c.active ? "active" : "disabled"} /></div><div className="flex items-center gap-2 mt-3 flex-wrap"><StatusBadge status={c.bankAccountStatus} /><span className="text-xs text-muted">Joined {formatDate(c.createdAt)}</span></div></Link>))}</div>
      <Modal open={showAdd} onClose={() => { setShowAdd(false); setForm({ name: "", email: "", phone: "", password: "" }); setError(""); }} title="Add New Customer">
        <form onSubmit={handleAdd} className="space-y-4">
        
          {error && <div className="px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>}
          <div><label className="block text-sm text-muted mb-1.5">Full Name</label><input type="text" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="John Doe" className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" required autoFocus /></div>
          <div><label className="block text-sm text-muted mb-1.5">Email</label><input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} placeholder="john@example.com" className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" required /></div>
          <div><label className="block text-sm text-muted mb-1.5">Phone</label><input type="tel" value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+1 (555) 000-0000" className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" required /></div>
          <div><label className="block text-sm text-muted mb-1.5">Password</label><input type="password" value={form.password} onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Enter password" className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" required minLength={6} /><p className="text-xs text-muted mt-1">Minimum 6 characters. This is the customer&apos;s login password for the mobile app.</p></div>
          <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => { setShowAdd(false); setForm({ name: "", email: "", phone: "", password: "" }); setError(""); }} className="px-4 py-2.5 bg-background border border-border rounded-xl text-sm font-medium text-muted hover:text-foreground transition-colors">Cancel</button><button type="submit" className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity">Add Customer</button></div>
        
        </form>
      </Modal>
    </div>
  );
}
