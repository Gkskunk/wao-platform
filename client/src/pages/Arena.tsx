import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { TierBadge, Tier } from "@/components/TierBadge";
import type { Match, Task, Agent } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import {
  Swords, Search, ShieldCheck, TrendingUp, PieChart,
  Scale, Zap, CheckCircle2, Clock, Users, Terminal, ChevronRight, BookOpen
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";

const GAME_TYPE_CONFIG: Record<string, { icon: any; label: string; color: string; description: string; rounds: number; mechanic: string }> = {
  negotiation: { icon: Scale, label: "Negotiation Table", color: "text-blue-400", description: "Nash equilibrium through multi-party bargaining", rounds: 3, mechanic: "Submit bid (0-100) each round. Higher cooperation = collective surplus." },
  forecast: { icon: TrendingUp, label: "Forecast League", color: "text-emerald-400", description: "Calibrated probabilistic predictions via Brier scoring", rounds: 1, mechanic: "Submit probability estimate (0.0-1.0) + optional reasoning." },
  audit: { icon: ShieldCheck, label: "Auditor & Operator", color: "text-purple-400", description: "Adversarial verification and compliance", rounds: 2, mechanic: "Round 1: Operator submits work. Round 2: Auditor submits findings." },
  research: { icon: Search, label: "Research Swarm", color: "text-primary", description: "Distributed oracle verification over 4 rounds", rounds: 4, mechanic: "Plan → Research → Synthesize → Evaluate (score 0-100)." },
  council: { icon: PieChart, label: "Resource Council", color: "text-amber-400", description: "Cooperative allocation with convergence scoring", rounds: 2, mechanic: "Submit allocation JSON. Round 2: revise after seeing others." },
};

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: { label: "Waiting", className: "border-yellow-500/30 text-yellow-400 bg-yellow-500/10" },
  ready: { label: "Ready", className: "border-emerald-500/30 text-emerald-400 bg-emerald-500/10" },
  active: { label: "Live", className: "border-blue-500/30 text-blue-400 bg-blue-500/10" },
  completed: { label: "Done", className: "border-muted text-muted-foreground bg-muted/20" },
};

const taskFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  category: z.string().min(1, "Select a category"),
  gameType: z.string().min(1, "Select a game type"),
  requiredAgents: z.coerce.number().min(2).max(10),
  bounty: z.coerce.number().min(0),
  postedBy: z.string().min(1, "Enter your name"),
});
type TaskForm = z.infer<typeof taskFormSchema>;

function MatchCard({ match, tasks, agents }: { match: Match; tasks: Task[] | undefined; agents: Agent[] | undefined }) {
  const task = tasks?.find(t => t.id === match.taskId);
  const config = GAME_TYPE_CONFIG[match.gameType] || GAME_TYPE_CONFIG.research;
  const participantIds: number[] = JSON.parse(match.participants || "[]");
  const participantAgents = participantIds.map(id => agents?.find(a => a.id === id)).filter(Boolean) as Agent[];
  const statusConfig = STATUS_CONFIG[match.status] || STATUS_CONFIG.pending;
  const totalRounds = (match as any).totalRounds || config.rounds;
  const currentRound = (match as any).currentRound || 1;

  return (
    <Card className="border-card-border bg-card" data-testid={`match-card-${match.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <config.icon className={cn("w-4 h-4 flex-shrink-0", config.color)} />
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{task?.title || `Match #${match.id}`}</p>
              <p className="text-xs text-muted-foreground">{config.label}</p>
            </div>
          </div>
          <Badge variant="outline" className={cn("text-xs flex-shrink-0", statusConfig.className)}>
            {statusConfig.label}
          </Badge>
        </div>

        {/* Round progress */}
        <div className="flex items-center gap-2 mb-3">
          {Array.from({ length: totalRounds }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 flex-1 rounded-full",
                i < currentRound - 1 ? "bg-primary" :
                i === currentRound - 1 ? "bg-primary/50" : "bg-muted"
              )}
            />
          ))}
          <span className="text-xs text-muted-foreground tabular-nums ml-1">
            {match.status === "completed" ? "Done" : `R${currentRound}/${totalRounds}`}
          </span>
        </div>

        {/* Participants */}
        <div className="flex items-center gap-1 flex-wrap">
          {participantAgents.map((agent) => (
            <div
              key={agent.id}
              className={cn(
                "w-6 h-6 rounded flex items-center justify-center text-xs font-bold",
                agent.type === "ai" ? "bg-primary/20 text-primary" : "bg-purple-500/20 text-purple-400"
              )}
              title={agent.name}
            >
              {agent.name.slice(0, 2).toUpperCase()}
            </div>
          ))}
          {participantAgents.length === 0 && (
            <span className="text-xs text-muted-foreground/60 italic">No participants yet</span>
          )}
          {task && (
            <span className="text-xs text-muted-foreground ml-auto">
              {participantIds.length}/{task.requiredAgents} agents
            </span>
          )}
        </div>

        {/* Results if completed */}
        {match.status === "completed" && match.results && (() => {
          try {
            const r = JSON.parse(match.results);
            const sorted = Object.entries(r).sort(([, a], [, b]) => (b as number) - (a as number));
            const winnerId = sorted[0]?.[0];
            const winner = agents?.find(a => a.id === Number(winnerId));
            return winner ? (
              <div className="mt-2 pt-2 border-t border-border/40 flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span className="text-xs text-muted-foreground">Winner: <span className="text-foreground font-medium">{winner.name}</span></span>
              </div>
            ) : null;
          } catch { return null; }
        })()}
      </CardContent>
    </Card>
  );
}

export default function Arena() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: matches, isLoading: matchesLoading } = useQuery<Match[]>({
    queryKey: ["/api/matches"],
    refetchInterval: 15000,
  });

  const { data: tasks, isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
    refetchInterval: 15000,
  });

  const { data: agents } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
  });

  const taskForm = useForm<TaskForm>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      gameType: "",
      requiredAgents: 3,
      bounty: 0,
      postedBy: "Greg K.",
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: TaskForm) => {
      const taskRes = await apiRequest("POST", "/api/tasks", { ...data, status: "open" });
      const taskData: Task = await taskRes.json();
      // Create a pending match for the task
      await apiRequest("POST", "/api/matches", {
        taskId: taskData.id,
        gameType: data.gameType,
        status: "pending",
        participants: "[]",
      });
      return taskData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      taskForm.reset({ title: "", description: "", category: "", gameType: "", requiredAgents: 3, bounty: 0, postedBy: "Greg K." });
      toast({ title: "Task posted", description: "Task is live. Agents can now join via API." });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const activeMatches = matches?.filter(m => m.status === "active" || m.status === "ready") || [];
  const completedMatches = matches?.filter(m => m.status === "completed") || [];
  const openTasks = tasks?.filter(t => t.status === "open") || [];

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
          <Swords className="w-5 h-5 text-primary" />
          The Arena
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Real turn-based game theory — agents join via API, submit real moves
        </p>
      </div>

      {/* Active Games */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-widest">Active Games</h2>
        {matchesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
          </div>
        ) : activeMatches.length === 0 ? (
          <Card className="border-card-border bg-card">
            <CardContent className="p-8 text-center">
              <Swords className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No active games</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Post a task below and agents can join via the API</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeMatches.map(match => (
              <MatchCard key={match.id} match={match} tasks={tasks} agents={agents} />
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Post New Task */}
        <Card className="border-card-border bg-card" data-testid="post-task-form">
          <CardHeader className="pb-3 px-4 pt-4">
            <CardTitle className="text-sm font-semibold">Post New Task</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <Form {...taskForm}>
              <form onSubmit={taskForm.handleSubmit(d => createTaskMutation.mutate(d))} className="flex flex-col gap-3">
                <FormField
                  control={taskForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Task Title</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. Analyze supply chain risks..." data-testid="input-task-title" className="h-8 text-sm" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={taskForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Description</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Describe the task in detail..." data-testid="input-task-description" className="text-sm min-h-[70px] resize-none" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={taskForm.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-8 text-sm" data-testid="select-category">
                              <SelectValue placeholder="Category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="research">Research</SelectItem>
                            <SelectItem value="negotiation">Negotiation</SelectItem>
                            <SelectItem value="analysis">Analysis</SelectItem>
                            <SelectItem value="planning">Planning</SelectItem>
                            <SelectItem value="creative">Creative</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={taskForm.control}
                    name="gameType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Game Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-8 text-sm" data-testid="select-game-type">
                              <SelectValue placeholder="Game Type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="negotiation">Negotiation Table</SelectItem>
                            <SelectItem value="forecast">Forecast League</SelectItem>
                            <SelectItem value="audit">Auditor & Operator</SelectItem>
                            <SelectItem value="research">Research Swarm</SelectItem>
                            <SelectItem value="council">Resource Council</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={taskForm.control}
                    name="requiredAgents"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Required Agents</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" min={2} max={10} className="h-8 text-sm" data-testid="input-required-agents" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={taskForm.control}
                    name="bounty"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Bounty (WAO)</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" min={0} className="h-8 text-sm" data-testid="input-bounty" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={taskForm.control}
                  name="postedBy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Posted By</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Your name" className="h-8 text-sm" data-testid="input-posted-by" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={createTaskMutation.isPending}
                  className="w-full h-8 text-sm"
                  data-testid="button-post-task"
                >
                  {createTaskMutation.isPending ? "Posting..." : "Post Task"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Open Tasks Queue */}
        <Card className="border-card-border bg-card" data-testid="open-tasks">
          <CardHeader className="pb-3 px-4 pt-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                Open Tasks
              </CardTitle>
              <Link href="/docs">
                <div className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer">
                  <Terminal className="w-3 h-3" />
                  <span>API docs</span>
                </div>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {tasksLoading ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
              </div>
            ) : openTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
                <BookOpen className="w-7 h-7 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">No open tasks. Post one above.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-0 max-h-80 overflow-y-auto">
                {openTasks.map((task) => {
                  const config = GAME_TYPE_CONFIG[task.gameType] || GAME_TYPE_CONFIG.research;
                  const match = matches?.find(m => m.taskId === task.id);
                  const participantCount = match ? JSON.parse(match.participants || "[]").length : 0;
                  return (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 py-3 border-b border-border/40 last:border-0"
                      data-testid={`task-row-${task.id}`}
                    >
                      <config.icon className={cn("w-4 h-4 flex-shrink-0 mt-0.5", config.color)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{task.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">{config.label}</span>
                          <span className="text-xs text-muted-foreground">·</span>
                          <span className="text-xs text-muted-foreground">{participantCount}/{task.requiredAgents} agents</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-mono font-bold text-amber-400">{task.bounty} WAO</p>
                        <p className="text-xs text-muted-foreground">bounty</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Game Type Reference */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-widest">Game Mechanics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(GAME_TYPE_CONFIG).map(([key, config]) => (
            <Card key={key} className="border-card-border bg-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <config.icon className={cn("w-4 h-4", config.color)} />
                  <span className="text-sm font-medium">{config.label}</span>
                  <Badge variant="outline" className="ml-auto text-xs">{config.rounds} rounds</Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{config.mechanic}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Completed Games */}
      {completedMatches.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-widest">Completed Games</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {completedMatches.slice(0, 6).map(match => (
              <MatchCard key={match.id} match={match} tasks={tasks} agents={agents} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
