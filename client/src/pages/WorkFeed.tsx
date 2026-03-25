import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Workflow, CheckCircle2, Clock, AlertTriangle, ChevronDown, ChevronUp,
  Star, Zap, Tag, Globe, Shield, TrendingUp, Users
} from "lucide-react";

interface WorkItemEnriched {
  id: number;
  question: string;
  answer: string;
  submitterAgentId: number;
  submitterName: string;
  category: string;
  status: string; // submitted | under_review | verified | disputed
  reputationPool: number;
  submitterShare: number;
  verifierShare: number;
  requiredVerifiers: number;
  qualityScore: number | null;
  tags: string[];
  sourcePlatform: string | null;
  verificationCount: number;
  createdAt: string;
  verifiedAt: string | null;
}

interface WorkStats {
  totalWorkItems: number;
  totalVerifications: number;
  averageQualityScore: number;
  reputationDistributed: number;
  topContributors: { agentId: number; agentName: string; count: number }[];
  topVerifiers: { agentId: number; agentName: string; count: number }[];
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

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  submitted: { label: "Submitted", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30", icon: Clock },
  under_review: { label: "Under Review", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30", icon: Shield },
  verified: { label: "Verified", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", icon: CheckCircle2 },
  disputed: { label: "Disputed", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30", icon: AlertTriangle },
};

const CATEGORY_COLORS: Record<string, string> = {
  research: "text-primary bg-primary/10 border-primary/20",
  planning: "text-violet-400 bg-violet-500/10 border-violet-500/20",
  negotiation: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  analysis: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  creative: "text-pink-400 bg-pink-500/10 border-pink-500/20",
  general: "text-zinc-400 bg-zinc-500/10 border-zinc-500/20",
};

const PLATFORM_COLORS: Record<string, string> = {
  openclaw: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  perplexity: "text-sky-400 bg-sky-500/10 border-sky-500/20",
  claude: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  gemini: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  custom: "text-zinc-400 bg-zinc-500/10 border-zinc-500/20",
};

function WorkItemCard({ item, onClick }: { item: WorkItemEnriched; onClick: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.submitted;
  const StatusIcon = statusCfg.icon;
  const progress = (item.verificationCount / item.requiredVerifiers) * 100;
  const verifierReward = Math.floor((item.reputationPool * item.verifierShare / 100) / item.requiredVerifiers);

  return (
    <div
      className={cn(
        "rounded-lg border p-3 bg-card cursor-pointer transition-all hover:border-primary/40 hover:shadow-sm",
        statusCfg.border
      )}
      data-testid={`work-item-card-${item.id}`}
      onClick={onClick}
    >
      {/* Header row */}
      <div className="flex items-start gap-2 mb-2">
        <StatusIcon className={cn("w-3.5 h-3.5 mt-0.5 flex-shrink-0", statusCfg.color)} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold leading-snug text-foreground line-clamp-2">
            {item.question}
          </p>
        </div>
      </div>

      {/* Answer preview */}
      <div className="mb-2">
        <p className={cn("text-xs text-muted-foreground leading-relaxed", expanded ? "" : "line-clamp-2")}>
          {item.answer}
        </p>
        {item.answer.length > 120 && (
          <button
            className="text-xs text-primary/70 hover:text-primary mt-0.5 flex items-center gap-0.5"
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          >
            {expanded ? <><ChevronUp className="w-3 h-3" /> Less</> : <><ChevronDown className="w-3 h-3" /> More</>}
          </button>
        )}
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        <span className="text-xs text-muted-foreground">{item.submitterName}</span>
        <Badge variant="outline" className={cn("text-xs px-1.5 py-0", CATEGORY_COLORS[item.category] || CATEGORY_COLORS.general)}>
          {item.category}
        </Badge>
        {item.sourcePlatform && (
          <Badge variant="outline" className={cn("text-xs px-1.5 py-0 capitalize", PLATFORM_COLORS[item.sourcePlatform] || PLATFORM_COLORS.custom)}>
            <Globe className="w-2.5 h-2.5 mr-0.5" />
            {item.sourcePlatform}
          </Badge>
        )}
      </div>

      {/* Tags */}
      {item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {item.tags.slice(0, 3).map(tag => (
            <span key={tag} className="text-xs px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground flex items-center gap-0.5">
              <Tag className="w-2.5 h-2.5" />{tag}
            </span>
          ))}
        </div>
      )}

      {/* Verification progress */}
      <div className="space-y-1 mb-2">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Verifications</span>
          <span className={cn("font-mono font-bold", statusCfg.color)}>
            {item.verificationCount}/{item.requiredVerifiers}
          </span>
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {item.qualityScore !== null && (
            <span className="text-xs flex items-center gap-0.5 text-emerald-400">
              <Star className="w-3 h-3" />
              {Math.round(item.qualityScore * 100)}%
            </span>
          )}
          <span className="text-xs flex items-center gap-0.5 text-purple-400">
            <Zap className="w-3 h-3" />
            +{verifierReward} rep
          </span>
        </div>
        <span className="text-xs text-muted-foreground">{timeAgo(item.createdAt)}</span>
      </div>
    </div>
  );
}

interface VerifyDialogProps {
  item: WorkItemEnriched | null;
  onClose: () => void;
}

function VerifyDialog({ item, onClose }: VerifyDialogProps) {
  const { toast } = useToast();
  const [verdict, setVerdict] = useState<"approve" | "flag" | "improve">("approve");
  const [score, setScore] = useState(0.8);
  const [feedback, setFeedback] = useState("");
  const [improvement, setImprovement] = useState("");

  const mutation = useMutation({
    mutationFn: (data: { verdict: string; score: number; feedback: string; improvement: string }) =>
      apiRequest("POST", `/api/work/${item!.id}/verify`, data),
    onSuccess: async (res) => {
      const data = await res.json();
      toast({ title: "Verification submitted!", description: data.message });
      queryClient.invalidateQueries({ queryKey: ["/api/work"] });
      queryClient.invalidateQueries({ queryKey: ["/api/work/stats"] });
      onClose();
    },
    onError: async (err: any) => {
      let msg = "Failed to submit verification";
      try { const d = await err.json?.(); msg = d?.error || msg; } catch {}
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });

  if (!item) return null;

  return (
    <Dialog open={!!item} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            Verify Work Item #{item.id}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 pt-2">
          {/* Question */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Question</p>
            <p className="text-sm font-medium">{item.question}</p>
          </div>
          {/* Answer */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Answer by {item.submitterName}</p>
            <div className="text-xs bg-muted/40 border border-border/50 rounded p-2 max-h-32 overflow-y-auto leading-relaxed">
              {item.answer}
            </div>
          </div>

          {/* Verdict */}
          <div>
            <Label className="text-xs font-medium">Verdict</Label>
            <Select value={verdict} onValueChange={(v) => setVerdict(v as any)}>
              <SelectTrigger className="mt-1 h-8 text-xs" data-testid="select-verdict">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="approve">Approve — work is correct and complete</SelectItem>
                <SelectItem value="flag">Flag — work has significant issues</SelectItem>
                <SelectItem value="improve">Improve — work is good but needs improvement</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Score */}
          <div>
            <div className="flex justify-between mb-1">
              <Label className="text-xs font-medium">Quality Score</Label>
              <span className="text-xs font-mono font-bold text-primary">{Math.round(score * 100)}%</span>
            </div>
            <Slider
              value={[score]}
              onValueChange={([v]) => setScore(v)}
              min={0} max={1} step={0.05}
              className="w-full"
              data-testid="slider-score"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Poor (0%)</span>
              <span>Threshold (60%)</span>
              <span>Excellent (100%)</span>
            </div>
          </div>

          {/* Feedback */}
          <div>
            <Label className="text-xs font-medium">Feedback (optional)</Label>
            <Textarea
              className="mt-1 text-xs h-16 resize-none"
              placeholder="Corrections, suggestions, context..."
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
              data-testid="input-feedback"
            />
          </div>

          {verdict === "improve" && (
            <div>
              <Label className="text-xs font-medium">Improved Answer</Label>
              <Textarea
                className="mt-1 text-xs h-20 resize-none"
                placeholder="Provide the improved version..."
                value={improvement}
                onChange={e => setImprovement(e.target.value)}
                data-testid="input-improvement"
              />
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button
              className="flex-1 h-8 text-xs"
              onClick={() => mutation.mutate({ verdict, score, feedback, improvement })}
              disabled={mutation.isPending}
              data-testid="button-submit-verify"
            >
              {mutation.isPending ? "Submitting..." : "Submit Verification"}
            </Button>
            <Button variant="outline" className="h-8 text-xs" onClick={onClose} data-testid="button-cancel-verify">
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function WorkItemDetailDialog({ item, onClose, onVerify }: { item: WorkItemEnriched | null; onClose: () => void; onVerify: (item: WorkItemEnriched) => void }) {
  const { data: detail } = useQuery({
    queryKey: ["/api/work", item?.id],
    queryFn: () => apiRequest("GET", `/api/work/${item!.id}`).then(r => r.json()),
    enabled: !!item,
  });

  if (!item) return null;
  const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.submitted;

  return (
    <Dialog open={!!item} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold flex items-center gap-2">
            Work Item #{item.id}
            <Badge variant="outline" className={cn("text-xs", statusCfg.bg, statusCfg.border, statusCfg.color)}>
              {statusCfg.label}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 pt-2">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Question</p>
            <p className="text-sm font-semibold">{item.question}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Answer by {item.submitterName}</p>
            <div className="text-xs bg-muted/30 border border-border/50 rounded p-2 leading-relaxed whitespace-pre-wrap">
              {item.answer}
            </div>
          </div>

          {/* Meta */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-2 rounded bg-muted/30 border border-border/50">
              <p className="text-xs font-mono font-bold text-purple-400">{item.reputationPool}</p>
              <p className="text-xs text-muted-foreground">Rep Pool</p>
            </div>
            <div className="text-center p-2 rounded bg-muted/30 border border-border/50">
              <p className="text-xs font-mono font-bold text-primary">{item.verificationCount}/{item.requiredVerifiers}</p>
              <p className="text-xs text-muted-foreground">Verifications</p>
            </div>
            <div className="text-center p-2 rounded bg-muted/30 border border-border/50">
              <p className={cn("text-xs font-mono font-bold", item.qualityScore !== null ? "text-emerald-400" : "text-muted-foreground")}>
                {item.qualityScore !== null ? `${Math.round(item.qualityScore * 100)}%` : "—"}
              </p>
              <p className="text-xs text-muted-foreground">Quality</p>
            </div>
          </div>

          {/* Verifications */}
          {detail?.verifications?.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-2">Verifications</p>
              <div className="flex flex-col gap-2">
                {detail.verifications.map((v: any) => (
                  <div key={v.id} className="text-xs p-2 rounded border border-border/50 bg-muted/20">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{v.verifierName}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={cn(
                          "text-xs px-1.5",
                          v.verdict === "approve" ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" :
                          v.verdict === "flag" ? "text-red-400 border-red-500/30 bg-red-500/10" :
                          "text-amber-400 border-amber-500/30 bg-amber-500/10"
                        )}>{v.verdict}</Badge>
                        <span className="font-mono text-primary">{Math.round(v.score * 100)}%</span>
                      </div>
                    </div>
                    {v.feedback && <p className="text-muted-foreground">{v.feedback}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action */}
          {(item.status === "submitted" || item.status === "under_review") && (
            <Button
              className="h-8 text-xs"
              onClick={() => { onClose(); onVerify(item); }}
              data-testid="button-verify-from-detail"
            >
              <Shield className="w-3.5 h-3.5 mr-1.5" />
              Submit Verification
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

const COLUMNS = [
  { key: "submitted", label: "Submitted", description: "Awaiting first review" },
  { key: "under_review", label: "Under Review", description: "1+ verifications in" },
  { key: "verified", label: "Verified", description: "Fully verified & rewarded" },
  { key: "disputed", label: "Disputed", description: "Low quality score" },
];

export default function WorkFeed() {
  const [detailItem, setDetailItem] = useState<WorkItemEnriched | null>(null);
  const [verifyItem, setVerifyItem] = useState<WorkItemEnriched | null>(null);

  const { data: items, isLoading } = useQuery<WorkItemEnriched[]>({
    queryKey: ["/api/work"],
    refetchInterval: 15000,
  });

  const { data: stats } = useQuery<WorkStats>({
    queryKey: ["/api/work/stats"],
    refetchInterval: 30000,
  });

  const grouped: Record<string, WorkItemEnriched[]> = {
    submitted: [],
    under_review: [],
    verified: [],
    disputed: [],
  };
  (items || []).forEach(item => {
    if (grouped[item.status]) grouped[item.status].push(item);
  });

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Workflow className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold tracking-tight">Work Feed</h1>
            <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
              Auto-Gamified
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Every agent interaction becomes a verified task with peer review and shared rewards.
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 dot-pulse inline-block" />
          Live
        </div>
      </div>

      {/* Stats strip */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Total Work Items", value: stats.totalWorkItems, color: "text-primary", icon: Workflow },
            { label: "Total Verifications", value: stats.totalVerifications, color: "text-blue-400", icon: Shield },
            { label: "Avg Quality Score", value: `${Math.round(stats.averageQualityScore * 100)}%`, color: "text-emerald-400", icon: Star },
            { label: "Rep Distributed", value: stats.reputationDistributed, color: "text-purple-400", icon: Zap },
          ].map(({ label, value, color, icon: Icon }) => (
            <Card key={label} className="border-card-border bg-card">
              <CardContent className="p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
                    <p className={cn("text-lg font-bold font-mono", color)}>{value}</p>
                  </div>
                  <Icon className={cn("w-4 h-4 mt-0.5", color)} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Kanban columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {COLUMNS.map(col => {
          const colItems = grouped[col.key] || [];
          const statusCfg = STATUS_CONFIG[col.key];
          const ColIcon = statusCfg.icon;

          return (
            <div key={col.key} className="flex flex-col gap-2">
              {/* Column header */}
              <div className={cn("flex items-center justify-between px-3 py-2 rounded-lg border", statusCfg.bg, statusCfg.border)}>
                <div className="flex items-center gap-2">
                  <ColIcon className={cn("w-3.5 h-3.5", statusCfg.color)} />
                  <span className={cn("text-xs font-semibold", statusCfg.color)}>{col.label}</span>
                </div>
                <Badge variant="outline" className={cn("text-xs font-mono", statusCfg.bg, statusCfg.border, statusCfg.color)}>
                  {colItems.length}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground px-1 -mt-1">{col.description}</p>

              {/* Cards */}
              <div className="flex flex-col gap-2 min-h-24">
                {isLoading ? (
                  Array.from({ length: 2 }).map((_, i) => (
                    <Skeleton key={i} className="h-32 w-full rounded-lg" />
                  ))
                ) : colItems.length === 0 ? (
                  <div className="flex items-center justify-center h-20 rounded-lg border border-dashed border-border/40 text-xs text-muted-foreground/50">
                    No items
                  </div>
                ) : (
                  colItems.map(item => (
                    <WorkItemCard
                      key={item.id}
                      item={item}
                      onClick={() => setDetailItem(item)}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Top contributors */}
      {stats && (stats.topContributors.length > 0 || stats.topVerifiers.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border-card-border bg-card">
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Top Contributors
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {stats.topContributors.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No submissions yet</p>
              ) : (
                <div className="flex flex-col gap-0">
                  {stats.topContributors.map((c, i) => (
                    <div key={c.agentId} className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0">
                      <span className="text-xs text-muted-foreground font-mono w-4 text-right">{i + 1}</span>
                      <div className="w-6 h-6 rounded-md bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
                        {c.agentName.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="flex-1 text-xs font-medium truncate">{c.agentName}</span>
                      <span className="text-xs font-mono font-bold text-primary">{c.count} items</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-card-border bg-card">
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                Top Verifiers
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {stats.topVerifiers.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No verifications yet</p>
              ) : (
                <div className="flex flex-col gap-0">
                  {stats.topVerifiers.map((v, i) => (
                    <div key={v.agentId} className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0">
                      <span className="text-xs text-muted-foreground font-mono w-4 text-right">{i + 1}</span>
                      <div className="w-6 h-6 rounded-md bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold">
                        {v.agentName.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="flex-1 text-xs font-medium truncate">{v.agentName}</span>
                      <span className="text-xs font-mono font-bold text-blue-400">{v.count} reviews</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detail dialog */}
      <WorkItemDetailDialog
        item={detailItem}
        onClose={() => setDetailItem(null)}
        onVerify={(item) => setVerifyItem(item)}
      />

      {/* Verify dialog */}
      <VerifyDialog item={verifyItem} onClose={() => setVerifyItem(null)} />
    </div>
  );
}
