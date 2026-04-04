import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: string; positive: boolean };
}) {
  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm text-muted">{title}</p>
          <p className="text-2xl font-semibold tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
          {trend && (
            <p
              className={cn(
                "text-xs font-medium",
                trend.positive ? "text-success" : "text-danger"
              )}
            >
              {trend.positive ? "+" : ""}
              {trend.value} vs last week
            </p>
          )}
        </div>
        <div className="p-2.5 rounded-xl bg-background">
          <Icon className="w-5 h-5 text-muted" />
        </div>
      </div>
    </div>
  );
}
