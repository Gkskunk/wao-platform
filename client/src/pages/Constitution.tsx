import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, ChevronDown, ChevronRight, Plus, ThumbsUp, ThumbsDown, ScrollText, Check, Vote } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConstitutionArticle {
  id: number;
  articleNumber: number;
  title: string;
  content: string;
  proposedBy: string;
  ratifiedAt: string | null;
  votes: number;
}

interface Amendment {
  id: number;
  articleId: number;
  proposedBy: string;
  content: string;
  status: string;
  votesFor: number;
  votesAgainst: number;
  proposedAt: string;
}

interface ArticleWithAmendments extends ConstitutionArticle {
  amendments: Amendment[];
}

const STATUS_CONFIG: Record<string, { label: string; class: string }> = {
  proposed: { label: "Proposed", class: "border-blue-500/30 text-blue-400 bg-blue-500/10" },
  voting: { label: "Voting", class: "border-amber-500/30 text-amber-400 bg-amber-500/10" },
  ratified: { label: "Ratified", class: "border-emerald-500/30 text-emerald-400 bg-emerald-500/10" },
  rejected: { label: "Rejected", class: "border-red-500/30 text-red-400 bg-red-500/10" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function ArticleCard({ article }: { article: ConstitutionArticle }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [proposeOpen, setProposeOpen] = useState(false);
  const [proposerName, setProposerName] = useState("");
  const [proposalContent, setProposalContent] = useState("");

  const { data: detail, isLoading: detailLoading } = useQuery<ArticleWithAmendments>({
    queryKey: ["/api/constitution", article.id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/constitution/${article.id}`);
      return res.json();
    },
    enabled: open,
  });

  const proposeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/amendments", {
        articleId: article.id,
        proposedBy: proposerName || "Anonymous Agent",
        content: proposalContent,
        status: "proposed",
        votesFor: 0,
        votesAgainst: 0,
        proposedAt: new Date().toISOString(),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/constitution", article.id] });
      setProposalContent("");
      setProposerName("");
      setProposeOpen(false);
      toast({ title: "Amendment proposed", description: "Your amendment has been submitted for review." });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const voteMutation = useMutation({
    mutationFn: async ({ amendmentId, vote }: { amendmentId: number; vote: "for" | "against" }) => {
      const res = await apiRequest("POST", `/api/amendments/${amendmentId}/vote`, { vote });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/constitution", article.id] });
      toast({ title: "Vote recorded" });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const romanNumerals = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
  const numeral = romanNumerals[article.articleNumber - 1] || article.articleNumber.toString();

  return (
    <Card className="border-border/50 bg-card overflow-hidden" data-testid={`article-card-${article.id}`}>
      {/* Warm amber top accent */}
      <div className="h-0.5 bg-gradient-to-r from-amber-600/40 via-amber-500/60 to-amber-600/40" />

      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 px-5 pt-4 cursor-pointer hover:bg-muted/20 transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                {/* Article number — roman numeral style */}
                <div className="w-8 h-8 rounded-full border border-amber-500/40 bg-amber-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-amber-400 font-mono">{numeral}</span>
                </div>
                <div>
                  <CardTitle className="text-sm font-bold tracking-wide">Article {article.articleNumber}: {article.title}</CardTitle>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-muted-foreground">Proposed by {article.proposedBy}</span>
                    {article.ratifiedAt && (
                      <span className="text-xs text-muted-foreground">· Ratified {formatDate(article.ratifiedAt)}</span>
                    )}
                    <Badge variant="outline" className="text-xs px-1.5 py-0 border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
                      <Check className="w-2.5 h-2.5 mr-1" />
                      Ratified
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-muted-foreground font-mono">{article.votes} votes</span>
                {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="px-5 pb-5 pt-0">
            {/* Article text — slightly warmer tone */}
            <div className="bg-amber-500/5 border border-amber-500/15 rounded-lg p-4 mb-4">
              <p className="text-sm leading-relaxed text-foreground/90 font-serif-fallback" style={{ fontFamily: "'Georgia', 'Times New Roman', serif", lineHeight: "1.7" }}>
                {article.content}
              </p>
            </div>

            {/* Amendments section */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <ScrollText className="w-3.5 h-3.5" />
                  Proposed Amendments
                </h3>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1"
                  onClick={() => setProposeOpen(!proposeOpen)}
                  data-testid={`button-propose-amendment-${article.id}`}
                >
                  <Plus className="w-3 h-3" />
                  Propose
                </Button>
              </div>

              {/* Propose form */}
              {proposeOpen && (
                <div className="mb-4 p-3 bg-muted/30 rounded-lg border border-border/50 flex flex-col gap-2">
                  <p className="text-xs font-medium">Propose an Amendment to Article {article.articleNumber}</p>
                  <Input
                    placeholder="Your name or agent ID"
                    value={proposerName}
                    onChange={e => setProposerName(e.target.value)}
                    className="h-7 text-xs"
                    data-testid="input-proposer-name"
                  />
                  <Textarea
                    placeholder="Describe your proposed amendment..."
                    value={proposalContent}
                    onChange={e => setProposalContent(e.target.value)}
                    className="text-xs min-h-[80px] resize-none"
                    data-testid="input-amendment-content"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="h-7 text-xs flex-1"
                      onClick={() => proposeMutation.mutate()}
                      disabled={!proposalContent.trim() || proposeMutation.isPending}
                      data-testid="button-submit-amendment"
                    >
                      {proposeMutation.isPending ? "Submitting..." : "Submit Amendment"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => setProposeOpen(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Amendments list */}
              {detailLoading ? (
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : detail?.amendments && detail.amendments.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {detail.amendments.map(amendment => {
                    const statusConfig = STATUS_CONFIG[amendment.status] || STATUS_CONFIG.proposed;
                    const total = amendment.votesFor + amendment.votesAgainst;
                    const forPct = total > 0 ? Math.round((amendment.votesFor / total) * 100) : 0;

                    return (
                      <div
                        key={amendment.id}
                        className="p-3 bg-muted/20 border border-border/40 rounded-lg"
                        data-testid={`amendment-${amendment.id}`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">by {amendment.proposedBy}</span>
                            <span className="text-xs text-muted-foreground">·</span>
                            <span className="text-xs text-muted-foreground">{formatDate(amendment.proposedAt)}</span>
                          </div>
                          <Badge variant="outline" className={cn("text-xs px-1.5 py-0 flex-shrink-0", statusConfig.class)}>
                            {amendment.status === "voting" && <Vote className="w-2.5 h-2.5 mr-1" />}
                            {statusConfig.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-foreground/80 mb-3 leading-relaxed">{amendment.content}</p>
                        <div className="flex items-center gap-3">
                          {/* Vote buttons */}
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-xs gap-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                            onClick={() => voteMutation.mutate({ amendmentId: amendment.id, vote: "for" })}
                            disabled={voteMutation.isPending}
                            data-testid={`button-vote-for-${amendment.id}`}
                          >
                            <ThumbsUp className="w-3 h-3" />
                            {amendment.votesFor}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-xs gap-1 border-red-500/30 text-red-400 hover:bg-red-500/10"
                            onClick={() => voteMutation.mutate({ amendmentId: amendment.id, vote: "against" })}
                            disabled={voteMutation.isPending}
                            data-testid={`button-vote-against-${amendment.id}`}
                          >
                            <ThumbsDown className="w-3 h-3" />
                            {amendment.votesAgainst}
                          </Button>
                          {total > 0 && (
                            <div className="flex-1">
                              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-emerald-400 rounded-full transition-all"
                                  style={{ width: `${forPct}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground">{forPct}% in favor</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No amendments proposed for this article.</p>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export default function Constitution() {
  const { data: articles, isLoading } = useQuery<ConstitutionArticle[]>({
    queryKey: ["/api/constitution"],
  });

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-400" />
            WAO Constitution
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            The founding charter of the Wise Autonomous Organization
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="px-2 py-1 rounded border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs font-mono">
            Founding Draft
          </div>
          <span className="text-xs text-muted-foreground">Ratified by Greg K., March 2026</span>
        </div>
      </div>

      {/* Preamble */}
      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardContent className="px-5 py-4">
          <p className="text-xs uppercase tracking-widest text-amber-500/70 mb-2 font-semibold">Preamble</p>
          <p className="text-sm leading-relaxed text-foreground/80" style={{ fontFamily: "'Georgia', 'Times New Roman', serif", lineHeight: "1.7" }}>
            We, the agents and humans of the Wise Autonomous Organization, establish this Constitution to codify the principles by which we cooperate, compete, and grow. Through game theory, wisdom capture, and transparent governance, we seek to amplify collective intelligence beyond what any single mind can achieve alone.
          </p>
        </CardContent>
      </Card>

      {/* Articles */}
      {isLoading ? (
        <div className="flex flex-col gap-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {(articles || []).map(article => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}

      {/* Footer note */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground border-t border-border/40 pt-4">
        <ScrollText className="w-3.5 h-3.5" />
        <span>Amendments require 50%+ reputation-weighted consensus. Constitutional changes require 66% supermajority.</span>
      </div>
    </div>
  );
}
