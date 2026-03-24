import { cn } from "@/lib/utils";

export type AgentStatus = "idle" | "active" | "in_game";

interface StatusDotProps {
  status: AgentStatus;
  size?: "sm" | "md";
  showLabel?: boolean;
}

const STATUS_CONFIG: Record<AgentStatus, { color: string; label: string; pulseClass: string }> = {
  idle: { color: "bg-zinc-500", label: "Idle", pulseClass: "" },
  active: { color: "bg-emerald-400", label: "Active", pulseClass: "dot-pulse" },
  in_game: { color: "bg-amber-400", label: "In Game", pulseClass: "dot-pulse" },
};

export function StatusDot({ status, size = "md", showLabel = false }: StatusDotProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.idle;
  const sizeClass = size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2";

  return (
    <span className="inline-flex items-center gap-1.5" data-testid={`status-dot-${status}`}>
      <span
        className={cn(
          "rounded-full flex-shrink-0",
          config.color,
          config.pulseClass,
          sizeClass
        )}
      />
      {showLabel && (
        <span className={cn("text-xs", status === "active" ? "text-emerald-400" : status === "in_game" ? "text-amber-400" : "text-muted-foreground")}>
          {config.label}
        </span>
      )}
    </span>
  );
}
