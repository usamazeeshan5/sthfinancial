"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken, api } from "../auth";
import { Card, Footer, Nav } from "../ui";

type Txn = {
  _id: string;
  amount: number;
  fee: number;
  totalCharged: number;
  status: string;
  createdAt: string;
};

const money = (n: number) => `$${(n || 0).toFixed(2)}`;
const statusColor: Record<string, string> = {
  processed: "#059669",
  deposited: "#059669",
  pending: "#B45309",
  quoted: "#9CA3AF",
  failed: "#B91C1C",
  refunded: "#B91C1C",
  disputed: "#B91C1C",
};

export default function PortalTransactions() {
  const router = useRouter();
  const [txns, setTxns] = useState<Txn[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const meRes = await api("/api/mobile/portal/me");
    if (meRes.status === 401) {
      router.replace("/portal/login");
      return;
    }
    const me = (await meRes.json()).user;
    const res = await api(`/api/mobile/portal/transactions?customerId=${me.id}`);
    setTxns((await res.json()).transactions || []);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/portal/login");
      return;
    }
    load();
  }, [load, router]);

  return (
    <>
      <Nav active="activity" />
      <Card>
        <h1 className="text-xl font-extrabold text-[#111827] mb-4">Activity</h1>
        {loading ? (
          <p className="text-sm text-[#6B7280]">Loading…</p>
        ) : txns.length === 0 ? (
          <p className="text-sm text-[#9CA3AF] italic py-2">No tips yet.</p>
        ) : (
          <div className="space-y-2">
            {txns.map((t) => (
              <div
                key={t._id}
                className="flex items-center justify-between rounded-xl bg-[#F9FAFB] border border-[#F0F1F3] px-4 py-3"
              >
                <div>
                  <p className="text-[15px] font-bold text-[#111827]">{money(t.amount)}</p>
                  <p className="text-xs text-[#9CA3AF]">
                    {new Date(t.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <span
                  className="text-xs font-semibold capitalize"
                  style={{ color: statusColor[t.status] || "#6B7280" }}
                >
                  {t.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
      <Footer />
    </>
  );
}
