"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Plus, MoreHorizontal } from "lucide-react";
import { Modal } from "@/components/modal";
import { StatusBadge } from "@/components/status-badge";
import { customers as initialCustomers, type Customer } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";

export default function CustomersPage() {
  const [customerList, setCustomerList] = useState<Customer[]>(initialCustomers);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });

  const filtered = customerList.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return;
    const newCustomer: Customer = {
      id: `cust_${Date.now()}`,
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      bankAccountStatus: "pending",
      active: true,
      createdAt: new Date().toISOString(),
    };
    setCustomerList((prev) => [newCustomer, ...prev]);
    setForm({ name: "", email: "", phone: "" });
    setShowAdd(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
          <p className="text-sm text-muted mt-1">
            {customerList.length} total customers
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Customer</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <input
          type="text"
          placeholder="Search customers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:max-w-sm pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
        />
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-card rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Name</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Email</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Phone</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Bank</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">Joined</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((customer) => (
                <tr key={customer.id} className="hover:bg-background/50">
                  <td className="px-5 py-3">
                    <Link href={`/customers/${customer.id}`} className="font-medium text-accent hover:underline">
                      {customer.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-muted">{customer.email}</td>
                  <td className="px-5 py-3 text-muted">{customer.phone}</td>
                  <td className="px-5 py-3"><StatusBadge status={customer.bankAccountStatus} /></td>
                  <td className="px-5 py-3"><StatusBadge status={customer.active ? "active" : "disabled"} /></td>
                  <td className="px-5 py-3 text-muted">{formatDate(customer.createdAt)}</td>
                  <td className="px-5 py-3">
                    <button className="p-1 rounded-lg hover:bg-sidebar-hover">
                      <MoreHorizontal className="w-4 h-4 text-muted" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {filtered.map((customer) => (
          <Link
            key={customer.id}
            href={`/customers/${customer.id}`}
            className="block bg-card rounded-2xl border border-border p-4 active:bg-background/50"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-sm font-semibold text-accent shrink-0">
                  {customer.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{customer.name}</p>
                  <p className="text-xs text-muted truncate">{customer.email}</p>
                </div>
              </div>
              <StatusBadge status={customer.active ? "active" : "disabled"} />
            </div>
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <StatusBadge status={customer.bankAccountStatus} />
              <span className="text-xs text-muted">Joined {formatDate(customer.createdAt)}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Add Customer Modal */}
      <Modal
        open={showAdd}
        onClose={() => { setShowAdd(false); setForm({ name: "", email: "", phone: "" }); }}
        title="Add New Customer"
      >
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="block text-sm text-muted mb-1.5">Full Name</label>
            <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="John Doe" className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" required autoFocus />
          </div>
          <div>
            <label className="block text-sm text-muted mb-1.5">Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="john@example.com" className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" required />
          </div>
          <div>
            <label className="block text-sm text-muted mb-1.5">Phone</label>
            <input type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+1 (555) 000-0000" className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => { setShowAdd(false); setForm({ name: "", email: "", phone: "" }); }} className="px-4 py-2.5 bg-background border border-border rounded-xl text-sm font-medium text-muted hover:text-foreground transition-colors">Cancel</button>
            <button type="submit" className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity">Add Customer</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
