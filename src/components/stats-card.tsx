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
    <div className="bg-card rounded-2xl border border-border p-3.5 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 sm:space-y-2 min-w-0">
          <p className="text-xs sm:text-sm text-muted">{title}</p>
          <p className="text-lg sm:text-2xl font-semibold tracking-tight truncate">{value}</p>
          {subtitle && <p className="text-[10px] sm:text-xs text-muted truncate">{subtitle}</p>}
          {trend && (
            <p
              className={cn(
                "text-[10px] sm:text-xs font-medium",
                trend.positive ? "text-success" : "text-danger"
              )}
            >
              {trend.positive ? "+" : ""}
              {trend.value} <span className="hidden sm:inline">vs last week</span>
            </p>
          )}
        </div>
        <div className="p-2 sm:p-2.5 rounded-xl bg-background shrink-0">
          <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-muted" />
        </div>
      </div>
    </div>
  );
}
