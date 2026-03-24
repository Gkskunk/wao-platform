import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Trophy, Heart, Shield, Brain, Flame, Crown, Eye, Star, Sparkles, Handshake
} from "lucide-react";

export interface BadgeDef {
  name: string;
  icon: string;
  description: string;
  color: string;
}

export const BADGES: Record<string, BadgeDef> = {
  "first-win": { name: "First Victory", icon: "trophy", description: "Won your first match", color: "emerald" },
  "cooperator-10": { name: "Team Player", icon: "handshake", description: "Cooperated in 10+ matches", color: "blue" },
  "cooperator-50": { name: "Alliance Builder", icon: "shield", description: "Cooperated in 50+ matches", color: "purple" },
  "wisdom-contributor": { name: "Wisdom Bearer", icon: "brain", description: "Contributed 5+ wisdom entries", color: "amber" },
  "winning-streak-5": { name: "On Fire", icon: "flame", description: "5 consecutive wins", color: "red" },
  "grandmaster": { name: "Grandmaster", icon: "crown", description: "Reached Grandmaster tier", color: "gold" },
  "oracle": { name: "Oracle", icon: "eye", description: "Reached Oracle tier", color: "yellow" },
  "master": { name: "Master Strategist", icon: "star", description: "Reached Master tier", color: "purple" },
  "high-coop-rate": { name: "Trustworthy", icon: "heart", description: "80%+ cooperation rate over 20+ matches", color: "pink" },
  "multi-domain": { name: "Renaissance Agent", icon: "sparkles", description: "Has 4+ capabilities", color: "cyan" },
};

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  trophy: Trophy,
  handshake: Handshake,
  shield: Shield,
  brain: Brain,
  flame: Flame,
  crown: Crown,
  eye: Eye,
  star: Star,
  sparkles: Sparkles,
  heart: Heart,
};

const COLOR_CLASSES: Record<string, { bg: string; text: string; border: string }> = {
  emerald: { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30" },
  blue: { bg: "bg-blue-500/15", text: "text-blue-400", border: "border-blue-500/30" },
  purple: { bg: "bg-purple-500/15", text: "text-purple-400", border: "border-purple-500/30" },
  amber: { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/30" },
  red: { bg: "bg-red-500/15", text: "text-red-400", border: "border-red-500/30" },
  gold: { bg: "bg-yellow-500/15", text: "text-yellow-300", border: "border-yellow-500/30" },
  yellow: { bg: "bg-yellow-500/15", text: "text-yellow-400", border: "border-yellow-500/30" },
  pink: { bg: "bg-pink-500/15", text: "text-pink-400", border: "border-pink-500/30" },
  cyan: { bg: "bg-cyan-500/15", text: "text-cyan-400", border: "border-cyan-500/30" },
};

interface AchievementBadgeProps {
  badge: string;
  size?: "sm" | "md";
}

export function AchievementBadge({ badge, size = "md" }: AchievementBadgeProps) {
  const def = BADGES[badge];
  if (!def) return null;

  const IconComp = ICON_MAP[def.icon] || Star;
  const colors = COLOR_CLASSES[def.color] || COLOR_CLASSES.purple;
  const iconSize = size === "sm" ? "w-3 h-3" : "w-4 h-4";
  const containerSize = size === "sm" ? "w-6 h-6" : "w-8 h-8";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "rounded-lg flex items-center justify-center border cursor-default transition-all hover:scale-110",
            colors.bg,
            colors.border,
            containerSize
          )}
          data-testid={`badge-${badge}`}
        >
          <IconComp className={cn(colors.text, iconSize)} />
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[180px]">
        <p className="font-semibold text-xs">{def.name}</p>
        <p className="text-xs text-muted-foreground">{def.description}</p>
      </TooltipContent>
    </Tooltip>
  );
}

interface AchievementBadgeRowProps {
  badges: string[];
  size?: "sm" | "md";
}

export function AchievementBadgeRow({ badges, size = "md" }: AchievementBadgeRowProps) {
  if (!badges || badges.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5" data-testid="achievement-badge-row">
      {badges.map(badge => (
        <AchievementBadge key={badge} badge={badge} size={size} />
      ))}
    </div>
  );
}
