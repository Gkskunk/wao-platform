import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { WisdomEntry, Agent } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Brain, ThumbsUp, CheckCircle2, BarChart2, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const CATEGORIES = ["Strategy", "Market Intelligence", "Technical Insight", "Cultural Wisdom", "Governance"];

const CATEGORY_COLORS: Record<string, string> = {
  "Strategy": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "Market Intelligence": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  "Technical Insight": "bg-purple-500/20 text-purple-400 border-purple-500/30",
  "Cultural Wisdom": "bg-amber-500/20 text-amber-400 border-amber-500/30",
  "Governance": "bg-primary/20 text-primary border-primary/30",
};

const wisdomSchema = z.object({
  content: z.string().min(20, "Wisdom must be at least 20 characters"),
  category: z.string().min(1, "Select a category"),
});

type WisdomForm = z.infer<typeof wisdomSchema>;

export default function WisdomVault() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("upvotes");

  const { data: wisdom, isLoading } = useQuery<WisdomEntry[]>({
    queryKey: ["/api/wisdom"],
  });

  const { data: agents } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
  });

  const wisdomForm = useForm<WisdomForm>({
    resolver: zodResolver(wisdomSchema),
    defaultValues: { content: "", category: "" },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: WisdomForm) => {
      const res = await apiRequest("POST", "/api/wisdom", { ...data, upvotes: 0, verified: 0 });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wisdom"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      wisdomForm.reset();
      toast({ title: "Wisdom submitted", description: "Your insight has been added to the Vault." });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const upvoteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/wisdom/${id}/upvote`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wisdom"] });
    },
  });

  const getAgentName = (id?: number | null) => {
    if (!id) return "Anonymous";
    return agents?.find(a => a.id === id)?.name || `Agent #${id}`;
  };

  const filteredWisdom = (wisdom || [])
    .filter(w => categoryFilter === "all" || w.category === categoryFilter)
    .sort((a, b) => {
      if (sortBy === "upvotes") return b.upvotes - a.upvotes;
      if (sortBy === "newest") return b.id - a.id;
      return 0;
    });

  // Stats
  const categoryCounts = CATEGORIES.map(cat => ({
    name: cat,
    count: (wisdom || []).filter(w => w.category === cat).length,
  }));
  const totalUpvotes = (wisdom || []).reduce((s, w) => s + w.upvotes, 0);
  const verifiedCount = (wisdom || []).filter(w => w.verified).length;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
          <Brain className="w-5 h-5 text-amber-400" />
          Wisdom Vault
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">Human insights transformed into organizational intelligence</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-card-border bg-card">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold font-mono text-amber-400">{wisdom?.length ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Entries</p>
          </CardContent>
        </Card>
        <Card className="border-card-border bg-card">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold font-mono text-emerald-400">{verifiedCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Verified</p>
          </CardContent>
        </Card>
        <Card className="border-card-border bg-card">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold font-mono text-primary">{totalUpvotes}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Upvotes</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Feed */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Controls */}
          <div className="flex items-center gap-3">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48 h-8 text-sm" data-testid="filter-wisdom-category">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-36 h-8 text-sm" data-testid="sort-wisdom">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="upvotes">Most Upvoted</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Wisdom Cards */}
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)
          ) : filteredWisdom.length === 0 ? (
            <Card className="border-card-border bg-card">
              <CardContent className="p-8 text-center flex flex-col items-center gap-3">
                <Brain className="w-8 h-8 text-muted-foreground/30" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">The Wisdom Vault is empty</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Complete a game to capture your first insight, or submit one manually</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            filteredWisdom.map((entry) => (
              <Card
                key={entry.id}
                className="border-card-border bg-card border-l-2 border-l-amber-500/40 hover:border-l-amber-500/70 transition-colors"
                data-testid={`wisdom-card-${entry.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <Badge
                      variant="outline"
                      className={cn("text-xs flex-shrink-0", CATEGORY_COLORS[entry.category] || "text-muted-foreground")}
                    >
                      {entry.category}
                    </Badge>
                    {entry.verified === 1 && (
                      <div className="flex items-center gap-1 text-xs text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" />
                        Verified
                      </div>
                    )}
                  </div>

                  <p className="text-sm leading-relaxed mb-3 text-foreground/90">
                    {entry.content}
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      by <span className="text-foreground/70">{getAgentName(entry.contributorId)}</span>
                      {entry.matchId && ` · Match #${entry.matchId}`}
                    </div>
                    <button
                      onClick={() => upvoteMutation.mutate(entry.id)}
                      disabled={upvoteMutation.isPending}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                      data-testid={`upvote-wisdom-${entry.id}`}
                    >
                      <ThumbsUp className="w-3 h-3" />
                      <span className="font-mono">{entry.upvotes}</span>
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Right Column: Submit + Stats */}
        <div className="flex flex-col gap-4">
          {/* Submit Form */}
          <Card className="border-card-border bg-card" data-testid="submit-wisdom-form">
            <CardHeader className="pb-3 px-4 pt-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400" />
                Submit Wisdom
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <Form {...wisdomForm}>
                <form onSubmit={wisdomForm.handleSubmit(d => submitMutation.mutate(d))} className="flex flex-col gap-3">
                  <FormField
                    control={wisdomForm.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Your Insight</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Share a strategic insight, market intelligence, or life wisdom..."
                            className="text-sm min-h-[100px] resize-none"
                            data-testid="input-wisdom-content"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={wisdomForm.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-8 text-sm" data-testid="select-wisdom-category">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    disabled={submitMutation.isPending}
                    className="w-full h-8 text-sm"
                    data-testid="button-submit-wisdom"
                  >
                    {submitMutation.isPending ? "Submitting..." : "Submit Wisdom"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Category Breakdown */}
          <Card className="border-card-border bg-card">
            <CardHeader className="pb-3 px-4 pt-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-primary" />
                Categories
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="flex flex-col gap-2">
                {categoryCounts.map(({ name, count }) => {
                  const pct = wisdom?.length ? Math.round((count / wisdom.length) * 100) : 0;
                  return (
                    <div key={name}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-muted-foreground">{name}</span>
                        <span className="text-xs font-mono font-semibold">{count}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            background: name === "Strategy" ? "hsl(var(--chart-1))" :
                              name === "Market Intelligence" ? "hsl(var(--chart-4))" :
                              name === "Technical Insight" ? "hsl(var(--chart-3))" :
                              name === "Cultural Wisdom" ? "hsl(var(--chart-2))" :
                              "hsl(var(--primary))",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
