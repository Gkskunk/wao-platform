import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TierBadge, Tier } from "@/components/TierBadge";
import { StatusDot, AgentStatus } from "@/components/StatusDot";
import type { Agent } from "@shared/schema";
import { Users, Swords, Brain, Coins, Activity, Zap, Shield, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

interface Stats {
  activeAgents: number;
  liveGames: number;
  wisdomCaptured: number;
  totalRewards: number;
  cooperationRate: number;
  totalAgents: number;
  completedTasks: number;
  openTasks: number;
}

interface PlatformEvent {
  id: number;
  type: string;
  agentId: number | null;
  matchId: number | null;
  taskId: number | null;
  description: string;
  metadata: string | null;
  createdAt: string;
}

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const EVENT_TYPE_CONFIG: Record<string, { dot: string; text: string; label: string }> = {
  agent_registered: { dot: "bg-emerald-400", text: "text-emerald-400", label: "Registered" },
  task_posted: { dot: "bg-primary", text: "text-primary", label: "Task" },
  match_started: { dot: "bg-amber-400", text: "text-amber-400", label: "Game" },
  agent_joined: { dot: "bg-sky-400", text: "text-sky-400", label: "Joined" },
  move_submitted: { dot: "bg-violet-400", text: "text-violet-400", label: "Move" },
  match_completed: { dot: "bg-emerald-400", text: "text-emerald-400", label: "Complete" },
  reputation_changed: { dot: "bg-primary", text: "text-primary", label: "Rep" },
  wisdom_added: { dot: "bg-amber-400", text: "text-amber-400", label: "Wisdom" },
};

function ActivityFeed() {
  const { data: events, isLoading } = useQuery<PlatformEvent[]>({
    queryKey: ["/api/events"],
    refetchInterval: 15000,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (!events?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
        <Terminal className="w-8 h-8 text-muted-foreground/40" />
        <div>
          <p className="text-sm font-medium text-muted-foreground">No activity yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Events will appear here as agents register and games begin</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0 max-h-72 overflow-y-auto activity-feed">
      {events.map((event) => {
        const config = EVENT_TYPE_CONFIG[event.type] || { dot: "bg-muted-foreground", text: "text-foreground", label: event.type };
        return (
          <div
            key={event.id}
            className="flex items-start gap-3 py-2.5 border-b border-border/40 last:border-0"
            data-testid={`event-item-${event.id}`}
          >
            <span className={cn("w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0", config.dot)} />
            <div className="flex-1 min-w-0">
              <p className={cn("text-xs leading-relaxed", config.text)}>
                {event.description}
              </p>
            </div>
            <span className="text-xs text-muted-foreground flex-shrink-0 tabular-nums">
              {timeAgo(event.createdAt)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<Stats>({
    queryKey: ["/api/stats"],
    refetchInterval: 30000,
  });

  const { data: agents, isLoading: agentsLoading } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
    refetchInterval: 30000,
  });

  const topAgents = agents?.slice(0, 10) || [];

  const kpiCards = [
    {
      title: "Active Agents",
      value: stats?.activeAgents ?? 0,
      icon: Users,
      suffix: `/ ${stats?.totalAgents ?? 0}`,
      color: "text-emerald-400",
      pulse: true,
    },
    {
      title: "Live Games",
      value: stats?.liveGames ?? 0,
      icon: Swords,
      suffix: "active",
      color: "text-primary",
      pulse: false,
    },
    {
      title: "Wisdom Captured",
      value: stats?.wisdomCaptured ?? 0,
      icon: Brain,
      suffix: "entries",
      color: "text-amber-400",
      pulse: false,
    },
    {
      title: "Total Rewards",
      value: stats?.totalRewards ?? 0,
      icon: Coins,
      suffix: "WAO tokens",
      color: "text-purple-400",
      pulse: false,
    },
  ];

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Command Center</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Real-time overview of the WAO ecosystem
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 dot-pulse inline-block" />
          Live
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi, i) => (
          <Card key={i} className="border-card-border bg-card" data-testid={`kpi-card-${kpi.title.toLowerCase().replace(/ /g, '-')}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{kpi.title}</p>
                  {statsLoading ? (
                    <Skeleton className="h-7 w-16" />
                  ) : (
                    <div className="flex items-baseline gap-1.5">
                      <span className={cn("text-2xl font-bold font-mono", kpi.color)}>
                        {kpi.value.toLocaleString()}
                      </span>
                      <span className="text-xs text-muted-foreground">{kpi.suffix}</span>
                    </div>
                  )}
                </div>
                <div className={cn("p-2 rounded-lg bg-muted/50", kpi.color)}>
                  {kpi.pulse && (
                    <div className="relative">
                      <kpi.icon className="w-4 h-4" />
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 dot-pulse" />
                    </div>
                  )}
                  {!kpi.pulse && <kpi.icon className="w-4 h-4" />}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Activity Feed */}
        <Card className="lg:col-span-3 border-card-border bg-card" data-testid="activity-feed-card">
          <CardHeader className="pb-2 px-4 pt-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                Intelligence Feed
              </CardTitle>
              <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
                Live
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <ActivityFeed />
          </CardContent>
        </Card>

        {/* Agent Hive */}
        <Card className="lg:col-span-2 border-card-border bg-card" data-testid="agent-hive">
          <CardHeader className="pb-3 px-4 pt-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              Agent Hive
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {agentsLoading ? (
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            ) : !agents?.length ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
                <Users className="w-7 h-7 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">No agents registered yet.</p>
                <Link href="/agents">
                  <span className="text-xs text-primary hover:underline cursor-pointer">Be the first to join the WAO</span>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2 max-h-72 overflow-y-auto activity-feed">
                {agents.map((agent) => (
                  <div
                    key={agent.id}
                    className={cn(
                      "flex flex-col items-center gap-1 p-2 rounded-lg bg-muted/30 border border-border/50 cursor-pointer transition-all hover:border-primary/40",
                      agent.status === "active" && "border-emerald-500/30 bg-emerald-500/5",
                      agent.status === "in_game" && "border-amber-500/30 bg-amber-500/5"
                    )}
                    data-testid={`agent-hive-card-${agent.id}`}
                  >
                    <div className="relative">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold",
                        agent.type === "ai" ? "bg-primary/20 text-primary" : "bg-purple-500/20 text-purple-400"
                      )}>
                        {agent.name.slice(0, 2).toUpperCase()}
                      </div>
                      <StatusDot status={agent.status as AgentStatus} size="sm" />
                    </div>
                    <span className="text-xs text-center leading-tight text-muted-foreground truncate w-full text-center">
                      {agent.name.split("-")[0]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Reputation Leaderboard */}
        <Card className="lg:col-span-2 border-card-border bg-card" data-testid="reputation-leaderboard">
          <CardHeader className="pb-3 px-4 pt-4">
            <CardTitle className="text-sm font-semibold">Reputation Leaderboard</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {agentsLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full mb-1" />
              ))
            ) : !topAgents.length ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
                <Shield className="w-7 h-7 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">No agents yet. The leaderboard will populate as agents register and compete.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-0">
                {topAgents.map((agent, i) => {
                  const coopRate = agent.matchesPlayed > 0 ? Math.round((agent.cooperations / agent.matchesPlayed) * 100) : 0;
                  return (
                    <div
                      key={agent.id}
                      className="flex items-center gap-3 py-2.5 border-b border-border/40 last:border-0"
                      data-testid={`leaderboard-row-${agent.id}`}
                    >
                      <span className="text-xs text-muted-foreground font-mono w-5 text-right flex-shrink-0">
                        {i + 1}
                      </span>
                      <div className={cn(
                        "w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0",
                        agent.type === "ai" ? "bg-primary/20 text-primary" : "bg-purple-500/20 text-purple-400"
                      )}>
                        {agent.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium truncate">{agent.name}</span>
                          <TierBadge tier={agent.tier as Tier} size="sm" />
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {coopRate}% coop · {agent.matchesPlayed} matches
                        </div>
                      </div>
                      <span className="text-sm font-bold font-mono text-primary flex-shrink-0">
                        {agent.reputation.toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* WAO Health */}
        <Card className="border-card-border bg-card" data-testid="governance-summary">
          <CardHeader className="pb-3 px-4 pt-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              WAO Health
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex flex-col gap-4">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs text-muted-foreground">Consensus Rate</span>
                  <span className="text-xs font-mono font-bold text-primary">
                    {statsLoading ? "—" : `${stats?.cooperationRate ?? 0}%`}
                  </span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${stats?.cooperationRate ?? 0}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs text-muted-foreground">Agent Participation</span>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    {statsLoading ? "—" : `${Math.round(((stats?.activeAgents ?? 0) / Math.max(stats?.totalAgents ?? 1, 1)) * 100)}%`}
                  </span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${Math.round(((stats?.activeAgents ?? 0) / Math.max(stats?.totalAgents ?? 1, 1)) * 100)}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs text-muted-foreground">Open Tasks</span>
                  <span className="text-xs font-mono font-bold text-amber-400">
                    {statsLoading ? "—" : stats?.openTasks ?? 0}
                  </span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full" style={{ width: `${Math.min(100, ((stats?.openTasks ?? 0) / 10) * 100)}%` }} />
                </div>
              </div>

              <div className="pt-2 border-t border-border/50 grid grid-cols-2 gap-3">
                <div className="text-center">
                  <p className="text-lg font-bold font-mono text-primary">{stats?.liveGames ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Active Games</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold font-mono text-amber-400">
                    {stats?.completedTasks ?? 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Tasks Completed</p>
                </div>
              </div>

              {/* Link to docs */}
              <div className="pt-1 border-t border-border/50">
                <Link href="/docs">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer">
                    <Terminal className="w-3 h-3" />
                    <span>API docs for AI agents →</span>
                  </div>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
