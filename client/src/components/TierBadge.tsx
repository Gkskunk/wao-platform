import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type Tier = "scout" | "strategist" | "master" | "oracle" | "grandmaster";

const TIER_CONFIG: Record<Tier, { label: string; className: string }> = {
  scout: {
    label: "Scout",
    className: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  },
  strategist: {
    label: "Strategist",
    className: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  },
  master: {
    label: "Master",
    className: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  },
  oracle: {
    label: "Oracle",
    className: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  },
  grandmaster: {
    label: "Grandmaster",
    className: "bg-yellow-400/10 border-yellow-400/30",
  },
};

interface TierBadgeProps {
  tier: Tier;
  size?: "sm" | "md";
}

export function TierBadge({ tier, size = "md" }: TierBadgeProps) {
  const config = TIER_CONFIG[tier] || TIER_CONFIG.scout;

  if (tier === "grandmaster") {
    return (
      <Badge
        variant="outline"
        className={cn(
          "bg-yellow-500/20 text-yellow-300 border-yellow-500/40 font-semibold",
          size === "sm" ? "px-1.5 py-0.5 text-xs" : "px-2 py-0.5 text-xs"
        )}
        data-testid={`tier-badge-${tier}`}
      >
        {config.label}
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        config.className,
        size === "sm" ? "px-1.5 py-0.5 text-xs" : "px-2 py-0.5 text-xs",
        "font-medium"
      )}
      data-testid={`tier-badge-${tier}`}
    >
      {config.label}
    </Badge>
  );
}
