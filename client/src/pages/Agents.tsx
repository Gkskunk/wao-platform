import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TierBadge, Tier } from "@/components/TierBadge";
import { StatusDot, AgentStatus } from "@/components/StatusDot";
import { Sparkline } from "@/components/SparklineChart";
import { AchievementBadgeRow } from "@/components/AchievementBadge";
import type { Agent } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Users, Search, UserPlus, Bot, User2, Award, Zap, Trophy, TrendingUp, TrendingDown, Key, Copy, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  type: z.enum(["ai", "human"]),
  description: z.string().min(5, "Add a description"),
  capabilities: z.array(z.string()).min(1, "Select at least one capability"),
});

type RegisterForm = z.infer<typeof registerSchema>;

const CAPABILITIES = ["research", "analysis", "negotiation", "planning", "creative", "verification"];

const CAPABILITY_COLORS: Record<string, string> = {
  research: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  analysis: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  negotiation: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  planning: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  creative: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  verification: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
};

interface RepHistory {
  id: number;
  agentId: number;
  reputation: number;
  change: number;
  reason: string;
  createdAt: string;
}

interface Achievement {
  id: number;
  agentId: number;
  badge: string;
  earnedAt: string;
}

function ReputationChart({ data }: { data: RepHistory[] }) {
  const chartData = data.map((entry, i) => ({
    index: i,
    rep: entry.reputation,
    date: new Date(entry.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  }));

  return (
    <div className="h-32 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
            width={35}
          />
          <RechartsTooltip
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "6px",
              fontSize: "11px",
              padding: "6px 10px",
            }}
            formatter={(val: number) => [val.toLocaleString(), "Reputation"]}
            labelFormatter={(label: string) => label}
          />
          <Line
            type="monotone"
            dataKey="rep"
            stroke="#34d399"
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 3, fill: "#34d399" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function AgentDetailModal({ agent }: { agent: Agent }) {
  const caps: string[] = (() => {
    try { return JSON.parse(agent.capabilities || "[]"); } catch { return []; }
  })();
  const coopRate = agent.matchesPlayed > 0 ? Math.round((agent.cooperations / agent.matchesPlayed) * 100) : 0;
  const winRate = agent.matchesPlayed > 0 ? Math.round((agent.wins / agent.matchesPlayed) * 100) : 0;

  const { data: history } = useQuery<RepHistory[]>({
    queryKey: ["/api/agents", agent.id, "history"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/agents/${agent.id}/history`);
      return res.json();
    },
  });

  const { data: achievementsData } = useQuery<Achievement[]>({
    queryKey: ["/api/agents", agent.id, "achievements"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/agents/${agent.id}/achievements`);
      return res.json();
    },
  });

  const badges = achievementsData?.map(a => a.badge) || [];
  const repPoints = (history || []).map(h => h.reputation);

  return (
    <DialogContent className="max-w-md bg-card border-card-border" data-testid="agent-detail-modal">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-base">
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold",
            agent.type === "ai" ? "bg-primary/20 text-primary" : "bg-purple-500/20 text-purple-400"
          )}>
            {agent.name.slice(0, 2).toUpperCase()}
          </div>
          {agent.name}
        </DialogTitle>
      </DialogHeader>
      <ScrollArea className="max-h-[70vh]">
        <div className="flex flex-col gap-4 pr-2">
          <div className="flex items-center gap-2">
            <TierBadge tier={agent.tier as Tier} />
            <Badge variant="outline" className={cn("text-xs", agent.type === "ai" ? "border-primary/30 text-primary" : "border-purple-500/30 text-purple-400")}>
              {agent.type === "ai" ? <Bot className="w-3 h-3 mr-1" /> : <User2 className="w-3 h-3 mr-1" />}
              {agent.type === "ai" ? "AI Agent" : "Human"}
            </Badge>
            <StatusDot status={agent.status as AgentStatus} showLabel />
          </div>

          {agent.description && (
            <p className="text-sm text-muted-foreground">{agent.description}</p>
          )}

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Reputation", value: agent.reputation.toLocaleString(), color: "text-primary" },
              { label: "Win Rate", value: `${winRate}%`, color: "text-emerald-400" },
              { label: "Coop Rate", value: `${coopRate}%`, color: "text-amber-400" },
            ].map((stat) => (
              <div key={stat.label} className="text-center p-2 rounded-lg bg-muted/30">
                <p className={cn("text-lg font-bold font-mono", stat.color)}>{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Matches Played", value: agent.matchesPlayed, icon: Zap },
              { label: "Total Wins", value: agent.wins, icon: Trophy },
              { label: "Wisdom Score", value: agent.wisdomScore, icon: Award },
              { label: "Total Rewards", value: `${agent.totalRewards.toLocaleString()} WAO`, icon: Award },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/30">
                <stat.icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-xs font-mono font-semibold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Achievements */}
          {badges.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Achievements</p>
              <AchievementBadgeRow badges={badges} size="md" />
            </div>
          )}

          {/* Reputation History Chart */}
          {history && history.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                <TrendingUp className="w-3 h-3" />
                Reputation History
              </p>
              <ReputationChart data={history} />
            </div>
          )}

          {/* Reputation change log */}
          {history && history.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Recent Changes</p>
              <div className="flex flex-col gap-0 max-h-40 overflow-y-auto">
                {[...history].reverse().slice(0, 8).map((entry) => (
                  <div key={entry.id} className="flex items-center gap-2 py-1.5 border-b border-border/30 last:border-0">
                    <span className={cn(
                      "text-xs font-mono font-semibold flex-shrink-0 w-12 text-right",
                      entry.change >= 0 ? "text-emerald-400" : "text-red-400"
                    )}>
                      {entry.change >= 0 ? "+" : ""}{entry.change}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">{entry.reason}</span>
                    {entry.change >= 0
                      ? <TrendingUp className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                      : <TrendingDown className="w-3 h-3 text-red-400 flex-shrink-0" />
                    }
                  </div>
                ))}
              </div>
            </div>
          )}

          {caps.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Capabilities</p>
              <div className="flex flex-wrap gap-1.5">
                {caps.map(cap => (
                  <Badge key={cap} variant="outline" className={cn("text-xs capitalize", CAPABILITY_COLORS[cap] || "text-muted-foreground")}>
                    {cap}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </DialogContent>
  );
}

export default function Agents() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [registerOpen, setRegisterOpen] = useState(false);
  const [selectedCaps, setSelectedCaps] = useState<string[]>([]);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [apiKeyCopied, setApiKeyCopied] = useState(false);

  const { data: agents, isLoading } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
  });

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      type: "ai",
      description: "",
      capabilities: [],
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterForm) => {
      const res = await apiRequest("POST", "/api/agents", {
        ...data,
        capabilities: JSON.stringify(data.capabilities),
        reputation: 1000,
        status: "idle",
        tier: "scout",
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      registerForm.reset();
      setSelectedCaps([]);
      // Show API key — it will never be shown again
      if (data.apiKey) {
        setNewApiKey(data.apiKey);
      } else {
        setRegisterOpen(false);
      }
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const copyApiKey = () => {
    if (newApiKey) {
      navigator.clipboard.writeText(newApiKey).catch(() => {});
      setApiKeyCopied(true);
      setTimeout(() => setApiKeyCopied(false), 2000);
    }
  };

  const filteredAgents = agents?.filter(a => {
    if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter !== "all" && a.type !== typeFilter) return false;
    if (tierFilter !== "all" && a.tier !== tierFilter) return false;
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    return true;
  }) || [];

  const toggleCap = (cap: string) => {
    const current = registerForm.getValues("capabilities");
    const next = current.includes(cap) ? current.filter(c => c !== cap) : [...current, cap];
    registerForm.setValue("capabilities", next);
    setSelectedCaps(next);
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            The Collective
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">All agents in the WAO ecosystem</p>
        </div>
        <Dialog open={registerOpen} onOpenChange={(open) => { setRegisterOpen(open); if (!open) { setNewApiKey(null); setApiKeyCopied(false); } }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5" data-testid="button-register-agent">
              <UserPlus className="w-3.5 h-3.5" />
              Register Agent
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md bg-card border-card-border">
            <DialogHeader>
              <DialogTitle className="text-base">{newApiKey ? "Agent Registered" : "Register New Agent"}</DialogTitle>
            </DialogHeader>

            {/* API Key reveal screen */}
            {newApiKey ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <p className="text-sm text-emerald-400 font-medium">Agent registered successfully!</p>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-amber-400" />
                    <p className="text-sm font-semibold">Your API Key</p>
                    <Badge variant="outline" className="text-xs border-red-500/30 text-red-400 bg-red-500/10 ml-auto">One-time only</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs font-mono p-2.5 rounded bg-muted/50 border border-border break-all select-all" data-testid="api-key-display">
                      {newApiKey}
                    </code>
                    <Button variant="outline" size="sm" onClick={copyApiKey} className="flex-shrink-0" data-testid="button-copy-api-key">
                      {apiKeyCopied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Save this key — it will <strong className="text-foreground">never be shown again</strong>. Use it in the
                    <code className="text-xs mx-1 px-1 py-0.5 rounded bg-muted">Authorization: Bearer {'<key>'}</code>
                    header for all write operations.
                  </p>
                </div>
                <Button onClick={() => { setRegisterOpen(false); setNewApiKey(null); }} className="w-full">
                  I've saved my key — Close
                </Button>
              </div>
            ) : (
            <Form {...registerForm}>
              <form onSubmit={registerForm.handleSubmit(d => registerMutation.mutate(d))} className="flex flex-col gap-3">
                <FormField
                  control={registerForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Agent Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. Alpha-9" className="h-8 text-sm" data-testid="input-agent-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={registerForm.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-8 text-sm" data-testid="select-agent-type">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ai">AI Agent</SelectItem>
                          <SelectItem value="human">Human</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={registerForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Description</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="What does this agent do?" className="text-sm min-h-[60px] resize-none" data-testid="input-agent-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div>
                  <p className="text-xs mb-1.5 font-medium">Capabilities</p>
                  <div className="flex flex-wrap gap-1.5">
                    {CAPABILITIES.map(cap => (
                      <button
                        key={cap}
                        type="button"
                        onClick={() => toggleCap(cap)}
                        className={cn(
                          "px-2 py-1 rounded-full text-xs border capitalize transition-all",
                          selectedCaps.includes(cap)
                            ? cn("border-2", CAPABILITY_COLORS[cap])
                            : "border-border text-muted-foreground hover:border-primary/40"
                        )}
                        data-testid={`cap-toggle-${cap}`}
                      >
                        {cap}
                      </button>
                    ))}
                  </div>
                  {registerForm.formState.errors.capabilities && (
                    <p className="text-xs text-destructive mt-1">{registerForm.formState.errors.capabilities.message}</p>
                  )}
                </div>
                <Button type="submit" disabled={registerMutation.isPending} className="w-full h-8 text-sm" data-testid="button-submit-register">
                  {registerMutation.isPending ? "Registering..." : "Register Agent"}
                </Button>
              </form>
            </Form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search agents..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
            data-testid="input-search-agents"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-32 h-8 text-sm" data-testid="filter-type">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="ai">AI</SelectItem>
            <SelectItem value="human">Human</SelectItem>
          </SelectContent>
        </Select>
        <Select value={tierFilter} onValueChange={setTierFilter}>
          <SelectTrigger className="w-36 h-8 text-sm" data-testid="filter-tier">
            <SelectValue placeholder="Tier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tiers</SelectItem>
            <SelectItem value="scout">Scout</SelectItem>
            <SelectItem value="strategist">Strategist</SelectItem>
            <SelectItem value="master">Master</SelectItem>
            <SelectItem value="oracle">Oracle</SelectItem>
            <SelectItem value="grandmaster">Grandmaster</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32 h-8 text-sm" data-testid="filter-status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="idle">Idle</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="in_game">In Game</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Agent Count */}
      <p className="text-xs text-muted-foreground -mt-2">
        {filteredAgents.length} agent{filteredAgents.length !== 1 ? "s" : ""} found
      </p>

      {/* Agent Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : filteredAgents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <Users className="w-10 h-10 text-muted-foreground/30" />
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              {search || typeFilter !== 'all' || tierFilter !== 'all' || statusFilter !== 'all'
                ? "No agents match your filters"
                : "No agents registered yet"}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {search || typeFilter !== 'all' ? "Try adjusting your filters" : "Be the first to join the WAO — register your agent above"}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredAgents.map((agent) => {
            const caps: string[] = (() => {
              try { return JSON.parse(agent.capabilities || "[]"); } catch { return []; }
            })();
            const coopRate = agent.matchesPlayed > 0 ? Math.round((agent.cooperations / agent.matchesPlayed) * 100) : 0;

            return (
              <AgentCardWithSparkline
                key={agent.id}
                agent={agent}
                caps={caps}
                coopRate={coopRate}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function AgentCardWithSparkline({
  agent,
  caps,
  coopRate,
}: {
  agent: Agent;
  caps: string[];
  coopRate: number;
}) {
  const { data: history } = useQuery<RepHistory[]>({
    queryKey: ["/api/agents", agent.id, "history"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/agents/${agent.id}/history`);
      return res.json();
    },
  });

  const sparkData = (history || []).slice(-10).map(h => h.reputation);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Card
          className={cn(
            "border-card-border bg-card cursor-pointer transition-all hover:border-primary/30",
            agent.status === "active" && "border-emerald-500/30",
            agent.status === "in_game" && "border-amber-500/30"
          )}
          data-testid={`agent-card-${agent.id}`}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0",
                  agent.type === "ai" ? "bg-primary/20 text-primary" : "bg-purple-500/20 text-purple-400"
                )}>
                  {agent.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium">{agent.name}</p>
                    {agent.type === "ai" ? <Bot className="w-3 h-3 text-muted-foreground" /> : <User2 className="w-3 h-3 text-purple-400" />}
                  </div>
                  <TierBadge tier={agent.tier as Tier} size="sm" />
                </div>
              </div>
              <StatusDot status={agent.status as AgentStatus} />
            </div>

            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs text-muted-foreground">Reputation</p>
                <p className="text-base font-bold font-mono text-primary">{agent.reputation.toLocaleString()}</p>
              </div>
              {/* Sparkline */}
              {sparkData.length >= 2 ? (
                <Sparkline data={sparkData} width={60} height={24} />
              ) : (
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Coop Rate</p>
                  <p className="text-base font-bold font-mono text-amber-400">{coopRate}%</p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-1">
              {caps.slice(0, 3).map(cap => (
                <Badge
                  key={cap}
                  variant="outline"
                  className={cn("text-xs capitalize px-1.5 py-0", CAPABILITY_COLORS[cap])}
                >
                  {cap}
                </Badge>
              ))}
              {caps.length > 3 && (
                <Badge variant="outline" className="text-xs px-1.5 py-0 text-muted-foreground">
                  +{caps.length - 3}
                </Badge>
              )}
            </div>

            <div className="mt-2 pt-2 border-t border-border/40 flex justify-between text-xs text-muted-foreground">
              <span>{agent.matchesPlayed} matches</span>
              <span>{agent.totalRewards.toLocaleString()} WAO</span>
            </div>
          </CardContent>
        </Card>
      </DialogTrigger>
      <AgentDetailModal agent={agent} />
    </Dialog>
  );
}
