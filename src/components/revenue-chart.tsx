"use client";

import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

type Point = { date: string; tips: number; fees: number };

const RANGES = [
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
];

type TooltipProps = {
  active?: boolean;
  label?: string;
  payload?: Array<{ name: string; value: number; color: string }>;
};

function ChartTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 shadow-lg">
      <p className="mb-1 text-xs font-medium text-muted">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 text-sm">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: p.color }}
          />
          <span className="capitalize text-muted">{p.name}</span>
          <span className="ml-auto font-semibold">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function RevenueChart() {
  const [chartData, setChartData] = useState<Point[]>([]);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/dashboard?days=${days}`)
      .then((r) => r.json())
      .then((data) => setChartData(data.chartData || []))
      .finally(() => setLoading(false));
  }, [days]);

  const totalTips = chartData.reduce((s, d) => s + d.tips, 0);
  const totalFees = chartData.reduce((s, d) => s + d.fees, 0);
  const hasData = chartData.length > 0;
  // With one or two points a line is invisible, so force dots in sparse ranges.
  const showDots = chartData.length <= 8;

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <TrendingUp className="h-4 w-4" />
            </span>
            <h2 className="text-sm font-medium">Tips Over Time</h2>
          </div>
          <div className="mt-3 flex items-end gap-6">
            <div>
              <p className="text-xs text-muted">Tips</p>
              <p className="text-2xl font-semibold tracking-tight">
                {formatCurrency(totalTips)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted">Fees</p>
              <p className="text-2xl font-semibold tracking-tight text-muted">
                {formatCurrency(totalFees)}
              </p>
            </div>
          </div>
        </div>

        {/* Range toggle */}
        <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-1">
          {RANGES.map((r) => (
            <button
              key={r.days}
              onClick={() => setDays(r.days)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                days === r.days
                  ? "bg-primary text-primary-foreground"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="mt-4 h-[280px]">
        {loading ? (
          <div className="h-full w-full animate-pulse rounded-xl bg-background" />
        ) : !hasData ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-background text-muted">
              <TrendingUp className="h-5 w-5" />
            </span>
            <p className="mt-3 text-sm font-medium">No tips in this period</p>
            <p className="text-xs text-muted">
              Try a wider range or check back after the next tip.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
            >
              <defs>
                <linearGradient id="tipGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="feeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#94a3b8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                vertical={false}
                strokeDasharray="3 3"
                stroke="#f0f0f0"
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
                minTickGap={24}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
                width={48}
                tickFormatter={(v) => `$${v}`}
              />
              <Tooltip
                content={<ChartTooltip />}
                cursor={{ stroke: "#e5e7eb", strokeWidth: 1 }}
              />
              <Area
                type="monotone"
                dataKey="fees"
                stroke="#94a3b8"
                strokeWidth={2}
                fill="url(#feeGradient)"
                name="fees"
                dot={showDots ? { r: 3, fill: "#94a3b8", strokeWidth: 0 } : false}
                activeDot={{ r: 5 }}
              />
              <Area
                type="monotone"
                dataKey="tips"
                stroke="#3b82f6"
                strokeWidth={2.5}
                fill="url(#tipGradient)"
                name="tips"
                dot={showDots ? { r: 3, fill: "#3b82f6", strokeWidth: 0 } : false}
                activeDot={{ r: 6 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Legend */}
      {hasData && !loading && (
        <div className="mt-3 flex items-center gap-5 border-t border-border pt-3">
          <span className="flex items-center gap-2 text-xs text-muted">
            <span className="h-2.5 w-2.5 rounded-full bg-accent" /> Tips
          </span>
          <span className="flex items-center gap-2 text-xs text-muted">
            <span className="h-2.5 w-2.5 rounded-full bg-[#94a3b8]" /> Fees
          </span>
        </div>
      )}
    </div>
  );
}
