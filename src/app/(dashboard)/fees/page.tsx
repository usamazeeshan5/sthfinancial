"use client";

import { useState, useEffect } from "react";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export default function FeesPage() {
  const [flatFee, setFlatFee] = useState("0.30");
  const [percentageFee, setPercentageFee] = useState("3.9");
  const [lastUpdated, setLastUpdated] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/fees").then(r => r.json()).then(d => {
      setFlatFee(d.flatFee.toString());
      setPercentageFee(d.percentageFee.toString());
      setLastUpdated(d.updatedAt);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch("/api/fees", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ flatFee: parseFloat(flatFee), percentageFee: parseFloat(percentageFee) }) });
    const d = await res.json();
    setLastUpdated(d.updatedAt);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const previewAmount = 25.0;
  const calculatedFee = parseFloat(flatFee || "0") + (previewAmount * parseFloat(percentageFee || "0")) / 100;
  const totalCharged = previewAmount + calculatedFee;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold tracking-tight">Fee Configuration</h1><p className="text-sm text-muted mt-1">Set the fees that tippers pay on each transaction</p></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-2xl border border-border p-6 space-y-5">
          <h2 className="text-sm font-medium">Fee Structure</h2>
          <div className="space-y-4">
            <div><label className="block text-sm text-muted mb-1.5">Flat Fee (per transaction)</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">$</span><input type="number" step="0.01" min="0" value={flatFee} onChange={e => setFlatFee(e.target.value)} className="w-full pl-7 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" /></div></div>
            <div><label className="block text-sm text-muted mb-1.5">Percentage Fee</label><div className="relative"><input type="number" step="0.1" min="0" max="100" value={percentageFee} onChange={e => setPercentageFee(e.target.value)} className="w-full pl-4 pr-8 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">%</span></div></div>
          </div>
          <button onClick={handleSave} disabled={saving} className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">{saved ? "Saved!" : saving ? "Saving..." : "Save Changes"}</button>
          {lastUpdated && <p className="text-xs text-muted">Last updated: {formatDateTime(lastUpdated)}</p>}
        </div>
        <div className="bg-card rounded-2xl border border-border p-6 space-y-5">
          <h2 className="text-sm font-medium">Tipper Preview</h2>
          <p className="text-sm text-muted">This is what the tipper sees when they tip {formatCurrency(previewAmount)}</p>
          <div className="bg-background rounded-2xl p-6 space-y-4">
            <div className="text-center"><p className="text-sm text-muted">Tip Amount</p><p className="text-3xl font-semibold mt-1">{formatCurrency(previewAmount)}</p></div>
            <div className="border-t border-border pt-4 space-y-2">
              <div className="flex items-center justify-between text-sm"><span className="text-muted">Tip</span><span>{formatCurrency(previewAmount)}</span></div>
              <div className="flex items-center justify-between text-sm"><span className="text-muted">Processing Fee</span><span>{formatCurrency(calculatedFee)}</span></div>
              <div className="flex items-center justify-between text-sm font-semibold pt-2 border-t border-border"><span>Total Charged</span><span>{formatCurrency(totalCharged)}</span></div>
            </div>
            <div className="text-center"><p className="text-xs text-muted">{formatCurrency(previewAmount)} goes to the recipient &middot; Fees paid by tipper</p></div>
          </div>
        </div>
      </div>
    </div>
  );
}
