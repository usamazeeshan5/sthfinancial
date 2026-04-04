"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { getChartData } from "@/lib/mock-data";

export function RevenueChart() {
  const chartData = getChartData();

  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <h2 className="text-sm font-medium mb-4">Tips Over Time</h2>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="tipGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `$${v}`}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "12px",
                border: "1px solid #e5e7eb",
                boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                fontSize: "13px",
              }}
              formatter={(value) => [`$${Number(value).toFixed(2)}`, ""]}
            />
            <Area
              type="monotone"
              dataKey="tips"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#tipGradient)"
              name="Tips"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
