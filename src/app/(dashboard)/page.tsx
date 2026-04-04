"use client";

import dynamic from "next/dynamic";
import { DollarSign, Users, ArrowLeftRight, Wallet } from "lucide-react";
import { StatsCard } from "@/components/stats-card";
import { StatusBadge } from "@/components/status-badge";
import { getStats, transactions } from "@/lib/mock-data";
import { formatCurrency, formatDateTime } from "@/lib/utils";

const RevenueChart = dynamic(
  () => import("@/components/revenue-chart").then((mod) => mod.RevenueChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-[340px] bg-card rounded-2xl border border-border animate-pulse" />
    ),
  }
);

export default function DashboardPage() {
  const stats = getStats();
  const recentTransactions = transactions.slice(0, 8);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted mt-1">
          Overview of your payment activity
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatsCard
          title="Total Tips"
          value={formatCurrency(stats.totalTips)}
          icon={DollarSign}
          trend={{ value: "12.5%", positive: true }}
        />
        <StatsCard
          title="Fees Collected"
          value={formatCurrency(stats.totalFees)}
          subtitle="Paid by tippers"
          icon={Wallet}
          trend={{ value: "8.2%", positive: true }}
        />
        <StatsCard
          title="Transactions"
          value={stats.totalTransactions.toString()}
          icon={ArrowLeftRight}
          trend={{ value: "15.3%", positive: true }}
        />
        <StatsCard
          title="Active Customers"
          value={stats.activeCustomers.toString()}
          subtitle={`${formatCurrency(stats.pendingPayouts)} pending`}
          icon={Users}
        />
      </div>

      {/* Chart */}
      <RevenueChart />

      {/* Recent Transactions */}
      <div className="bg-card rounded-2xl border border-border">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-medium">Recent Transactions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">
                  Customer
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">
                  Amount
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">
                  Fee
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentTransactions.map((txn) => (
                <tr key={txn.id} className="hover:bg-background/50">
                  <td className="px-5 py-3 font-medium">
                    {txn.customerName}
                  </td>
                  <td className="px-5 py-3">{formatCurrency(txn.amount)}</td>
                  <td className="px-5 py-3 text-muted">
                    {formatCurrency(txn.fee)}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={txn.status} />
                  </td>
                  <td className="px-5 py-3 text-muted">
                    {formatDateTime(txn.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
