import { cn } from "@/lib/utils";

const variants: Record<string, string> = {
  deposited: "bg-success-light text-success",
  completed: "bg-success-light text-success",
  connected: "bg-success-light text-success",
  active: "bg-success-light text-success",
  processed: "bg-accent-light text-accent",
  pending: "bg-warning-light text-warning",
  scheduled: "bg-warning-light text-warning",
  failed: "bg-danger-light text-danger",
  disabled: "bg-danger-light text-danger",
  disconnected: "bg-danger-light text-danger",
  lost: "bg-danger-light text-danger",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize",
        variants[status] || "bg-gray-100 text-gray-600"
      )}
    >
      {status}
    </span>
  );
}
