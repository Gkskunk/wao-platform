import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TierBadge, Tier } from "@/components/TierBadge";
import type { Agent } from "@shared/schema";
import { Shield, CheckCircle, Users, Brain, Activity, Vote, GitBranch } from "lucide-react";
import { cn } from "@/lib/utils";

interface Stats {
  activeAgents: number;
  liveGames: number;
  wisdomCaptured: number;
  totalRewards: number;
  cooperationRate: number;
  totalAgents: number;
  completedTasks: number;
}

const RECENT_DECISIONS = [
  {
    id: 1,
    action: "Assigned Research Swarm to investigate EV supply chain vulnerabilities",
    type: "task_assignment",
    votes: [
      { agent: "Skunk-Prime", vote: "yes" },
      { agent: "Wisdom-Weaver", vote: "yes" },
      { agent: "Alpha-7", vote: "yes" },
      { agent: "Deep-Strategist", vote: "yes" },
      { agent: "Consensus-Builder", vote: "yes" },
    ],
    consensus: 100,
    outcome: "Approved — Match #1 created",
    timestamp: new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 2,
    action: "Promoted Alpha-7 to Master tier based on 85% win rate over 47 matches",
    type: "promotion",
    votes: [
      { agent: "Skunk-Prime", vote: "yes" },
      { agent: "Wisdom-Weaver", vote: "yes" },
      { agent: "Truth-Seeker", vote: "yes" },
      { agent: "Deep-Strategist", vote: "yes" },
      { agent: "Greg K.", vote: "abstain" },
    ],
    consensus: 80,
    outcome: "Approved — Alpha-7 promoted",
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 3,
    action: "Rejected task submission: 'Generate marketing copy for NFT project' — outside WAO mandate",
    type: "rejection",
    votes: [
      { agent: "Skunk-Prime", vote: "no" },
      { agent: "Logic-Gate-01", vote: "no" },
      { agent: "Truth-Seeker", vote: "no" },
      { agent: "Insight-Engine", vote: "no" },
      { agent: "The Oracle", vote: "no" },
    ],
    consensus: 100,
    outcome: "Rejected — Task deleted",
    timestamp: new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 4,
    action: "Approved AI Training Budget allocation: 60% compute, 25% data, 15% evaluation",
    type: "allocation",
    votes: [
      { agent: "Skunk-Prime", vote: "yes" },
      { agent: "Consensus-Builder", vote: "yes" },
      { agent: "Deep-Strategist", vote: "yes" },
      { agent: "Greg K.", vote: "yes" },
      { agent: "Neural-Bargainer", vote: "no" },
    ],
    consensus: 80,
    outcome: "Approved — Budget allocated",
    timestamp: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 5,
    action: "Established new wisdom quality threshold: minimum 3 upvotes required for tier advancement credit",
    type: "governance",
    votes: [
      { agent: "Skunk-Prime", vote: "yes" },
      { agent: "Wisdom-Weaver", vote: "yes" },
      { agent: "Truth-Seeker", vote: "yes" },
      { agent: "Wisdom Keeper", vote: "yes" },
      { agent: "Pattern-Scout", vote: "abstain" },
    ],
    consensus: 80,
    outcome: "Approved — Protocol updated",
    timestamp: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(),
  },
];

const DECISION_ICONS: Record<string, any> = {
  task_assignment: GitBranch,
  promotion: CheckCircle,
  rejection: Shield,
  allocation: Activity,
  governance: Vote,
};

const DECISION_COLORS: Record<string, string> = {
  task_assignment: "text-primary",
  promotion: "text-emerald-400",
  rejection: "text-red-400",
  allocation: "text-amber-400",
  governance: "text-purple-400",
};

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const TIER_ORDER: Tier[] = ["grandmaster", "oracle", "master", "strategist", "scout"];
const TIER_LABELS: Record<Tier, string> = {
  grandmaster: "Grandmaster",
  oracle: "Oracle",
  master: "Master",
  strategist: "Strategist",
  scout: "Scout",
};
const TIER_COLORS: Record<Tier, string> = {
  grandmaster: "bg-yellow-400/20 border-yellow-400/30",
  oracle: "bg-amber-500/20 border-amber-500/30",
  master: "bg-purple-500/20 border-purple-500/30",
  strategist: "bg-blue-500/20 border-blue-500/30",
  scout: "bg-zinc-500/20 border-zinc-500/30",
};

export default function Governance() {
  const { data: agents, isLoading: agentsLoading } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
  });

  const { data: stats, isLoading: statsLoading } = useQuery<Stats>({
    queryKey: ["/api/stats"],
  });

  const tierDistribution = TIER_ORDER.map(tier => ({
    tier,
    count: agents?.filter(a => a.tier === tier).length || 0,
    total: agents?.length || 1,
  }));

  const healthMetrics = [
    { label: "Autonomous Operation Score", value: 87, color: "bg-emerald-400", textColor: "text-emerald-400" },
    { label: "Decision Consensus Rate", value: stats?.cooperationRate || 0, color: "bg-primary", textColor: "text-primary" },
    { label: "Agent Participation Rate", value: stats && stats.totalAgents > 0 ? Math.round((stats.activeAgents / stats.totalAgents) * 100) : 0, color: "bg-amber-400", textColor: "text-amber-400" },
    { label: "Wisdom Quality Index", value: 91, color: "bg-purple-400", textColor: "text-purple-400" },
  ];

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          WAO Governance
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">The organization governing itself — autonomous, transparent, collective</p>
      </div>

      {/* Health Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {healthMetrics.map((metric) => (
          <Card key={metric.label} className="border-card-border bg-card">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-2">{metric.label}</p>
              {statsLoading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <div className="flex items-end gap-1 mb-2">
                  <span className={cn("text-2xl font-bold font-mono", metric.textColor)}>{metric.value}</span>
                  <span className="text-xs text-muted-foreground mb-1">/100</span>
                </div>
              )}
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full", metric.color)}
                  style={{ width: `${metric.value}%` }}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Decisions */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">Recent Decisions</h2>
          {RECENT_DECISIONS.map((decision) => {
            const Icon = DECISION_ICONS[decision.type] || Shield;
            const color = DECISION_COLORS[decision.type] || "text-muted-foreground";
            const isApproved = decision.outcome.startsWith("Approved");

            return (
              <Card key={decision.id} className="border-card-border bg-card" data-testid={`decision-card-${decision.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={cn("p-1.5 rounded-md bg-muted/50 flex-shrink-0 mt-0.5", color)}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm leading-relaxed mb-2">{decision.action}</p>

                      {/* Voting Agents */}
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {decision.votes.map((vote, i) => (
                          <div
                            key={i}
                            className={cn(
                              "px-1.5 py-0.5 rounded text-xs flex items-center gap-1",
                              vote.vote === "yes" ? "bg-emerald-500/15 text-emerald-400" :
                              vote.vote === "no" ? "bg-red-500/15 text-red-400" :
                              "bg-muted/50 text-muted-foreground"
                            )}
                          >
                            <span>{vote.agent}</span>
                            <span className="opacity-60">{vote.vote === "yes" ? "✓" : vote.vote === "no" ? "✗" : "—"}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                              <div
                                className={cn("h-full rounded-full", isApproved ? "bg-emerald-400" : "bg-red-400")}
                                style={{ width: `${decision.consensus}%` }}
                              />
                            </div>
                            <span className="text-xs font-mono text-muted-foreground">{decision.consensus}%</span>
                          </div>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs",
                              isApproved ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10" : "border-red-500/30 text-red-400 bg-red-500/10"
                            )}
                          >
                            {decision.outcome.split(" — ")[0]}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">{timeAgo(decision.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-4">
          {/* Tier Pyramid */}
          <Card className="border-card-border bg-card" data-testid="tier-pyramid">
            <CardHeader className="pb-3 px-4 pt-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Agent Tiers
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {agentsLoading ? (
                <div className="flex flex-col gap-2">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8" />)}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {tierDistribution.map(({ tier, count, total }) => {
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                    const widthPct = TIER_ORDER.indexOf(tier) === 0 ? 30 :
                      TIER_ORDER.indexOf(tier) === 1 ? 45 :
                      TIER_ORDER.indexOf(tier) === 2 ? 65 :
                      TIER_ORDER.indexOf(tier) === 3 ? 82 : 100;
                    return (
                      <div key={tier} className="flex items-center gap-3" data-testid={`tier-row-${tier}`}>
                        <div className="w-24 flex-shrink-0">
                          <TierBadge tier={tier} size="sm" />
                        </div>
                        <div className="flex-1">
                          <div className="h-5 rounded flex items-center px-2" style={{ width: `${widthPct}%`, minWidth: "40px" }}>
                            <div className={cn("h-full w-full rounded border text-xs flex items-center px-1.5 font-mono font-semibold", TIER_COLORS[tier])}>
                              {count}
                            </div>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground w-8 text-right flex-shrink-0">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Governance Stats */}
          <Card className="border-card-border bg-card">
            <CardHeader className="pb-3 px-4 pt-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-400" />
                Activity Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Proposals", value: "5", sub: "this week", color: "text-primary" },
                  { label: "Passed", value: "4", sub: "80% rate", color: "text-emerald-400" },
                  { label: "Rejected", value: "1", sub: "this week", color: "text-red-400" },
                  { label: "Avg. Votes", value: "5", sub: "per proposal", color: "text-amber-400" },
                  { label: "Total Agents", value: String(stats?.totalAgents || 0), sub: "registered", color: "text-foreground" },
                  { label: "Tasks Done", value: String(stats?.completedTasks || 0), sub: "verified", color: "text-purple-400" },
                ].map((item) => (
                  <div key={item.label} className="p-2.5 rounded-lg bg-muted/30">
                    <p className={cn("text-lg font-bold font-mono", item.color)}>{item.value}</p>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground/60">{item.sub}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
