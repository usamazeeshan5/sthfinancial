"use client";

import { useState } from "react";
import { Search, Plus, Link2, Unlink } from "lucide-react";
import { Modal } from "@/components/modal";
import { StatusBadge } from "@/components/status-badge";
import { nfcChips as initialChips, customers, type NfcChip } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";

export default function NfcChipsPage() {
  const [chips, setChips] = useState<NfcChip[]>(initialChips);
  const [search, setSearch] = useState("");
  const [showRegister, setShowRegister] = useState(false);
  const [showLink, setShowLink] = useState<string | null>(null);
  const [newUid, setNewUid] = useState("");

  const filtered = chips.filter(
    (c) =>
      c.chipUid.toLowerCase().includes(search.toLowerCase()) ||
      (c.customerName &&
        c.customerName.toLowerCase().includes(search.toLowerCase()))
  );

  const activeCount = chips.filter((c) => c.status === "active").length;
  const assignedCount = chips.filter((c) => c.customerId).length;

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUid.trim()) return;
    const newChip: NfcChip = {
      id: `nfc_${Date.now()}`,
      chipUid: newUid.trim(),
      customerId: null,
      customerName: null,
      status: "active",
      registeredAt: new Date().toISOString(),
    };
    setChips((prev) => [newChip, ...prev]);
    setNewUid("");
    setShowRegister(false);
  };

  const handleLink = (chipId: string, customerId: string) => {
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) return;
    setChips((prev) =>
      prev.map((c) =>
        c.id === chipId
          ? { ...c, customerId, customerName: customer.name }
          : c
      )
    );
    setShowLink(null);
  };

  const handleUnlink = (chipId: string) => {
    setChips((prev) =>
      prev.map((c) =>
        c.id === chipId ? { ...c, customerId: null, customerName: null } : c
      )
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">NFC Chips</h1>
          <p className="text-sm text-muted mt-1">
            {chips.length} total &middot; {activeCount} active &middot;{" "}
            {assignedCount} assigned
          </p>
        </div>
        <button
          onClick={() => setShowRegister(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Register Chip
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <input
          type="text"
          placeholder="Search by UID or customer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
        />
      </div>

      {/* Table */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">
                  Chip UID
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">
                  Customer
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">
                  Registered
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((chip) => (
                <tr key={chip.id} className="hover:bg-background/50">
                  <td className="px-5 py-3 font-mono text-xs">
                    {chip.chipUid}
                  </td>
                  <td className="px-5 py-3">
                    {chip.customerName ? (
                      <span className="font-medium">{chip.customerName}</span>
                    ) : (
                      <span className="text-muted italic">Unassigned</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={chip.status} />
                  </td>
                  <td className="px-5 py-3 text-muted">
                    {formatDate(chip.registeredAt)}
                  </td>
                  <td className="px-5 py-3">
                    {chip.customerId ? (
                      <button
                        onClick={() => handleUnlink(chip.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-background rounded-lg text-xs font-medium text-muted hover:text-foreground transition-colors"
                      >
                        <Unlink className="w-3 h-3" />
                        Unlink
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowLink(chip.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-light rounded-lg text-xs font-medium text-accent hover:opacity-80 transition-opacity"
                      >
                        <Link2 className="w-3 h-3" />
                        Link
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register Chip Modal */}
      <Modal
        open={showRegister}
        onClose={() => {
          setShowRegister(false);
          setNewUid("");
        }}
        title="Register New Chip"
      >
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm text-muted mb-1.5">
              Chip UID
            </label>
            <input
              type="text"
              value={newUid}
              onChange={(e) => setNewUid(e.target.value)}
              placeholder="e.g. 04:A2:3B:C1:00:11"
              className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
              required
              autoFocus
            />
            <p className="text-xs text-muted mt-1.5">
              Enter the unique identifier printed on the NFC chip
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowRegister(false);
                setNewUid("");
              }}
              className="px-4 py-2.5 bg-background border border-border rounded-xl text-sm font-medium text-muted hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Register
            </button>
          </div>
        </form>
      </Modal>

      {/* Link to Customer Modal */}
      <Modal
        open={showLink !== null}
        onClose={() => setShowLink(null)}
        title="Link Chip to Customer"
      >
        <div className="space-y-2">
          <p className="text-sm text-muted mb-3">Select a customer to link this chip to:</p>
          {customers
            .filter((c) => c.active)
            .map((customer) => (
              <button
                key={customer.id}
                onClick={() => showLink && handleLink(showLink, customer.id)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-background transition-colors text-left"
              >
                <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center text-sm font-semibold text-accent">
                  {customer.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium">{customer.name}</p>
                  <p className="text-xs text-muted">{customer.email}</p>
                </div>
              </button>
            ))}
        </div>
      </Modal>
    </div>
  );
}
