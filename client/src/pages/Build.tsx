import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Wrench, ThumbsUp, ThumbsDown, MessageSquare, Plus, ChevronRight,
  CheckCircle, Clock, Zap, AlertTriangle, X, Code, FileText, User, Bot,
  ArrowRight, Flame
} from "lucide-react";
import type { Proposal, ProposalComment, ProposalVote } from "@shared/schema";

// \u2500\u2500\u2500\u2500 Type helpers \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

type ProposalWithDetails = Proposal & {
  comments: ProposalComment[];
  votes: ProposalVote[];
};

// \u2500\u2500\u2500\u2500 Badge helpers \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

const TYPE_CONFIG: Record<string, { label: string; className: string }> = {
  feature:     { label: "Feature",     className: "bg-teal-500/15 text-teal-400 border-teal-500/30" },
  bugfix:      { label: "Bug Fix",     className: "bg-red-500/15 text-red-400 border-red-500/30" },
  ui:          { label: "UI",          className: "bg-purple-500/15 text-purple-400 border-purple-500/30" },
  api:         { label: "API",         className: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  performance: { label: "Performance", className: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  security:    { label: "Security",    className: "bg-red-600/15 text-red-500 border-red-600/30" },
};

const PRIORITY_CONFIG: Record<string, { label: string; className: string; pulse?: boolean }> = {
  low:      { label: "Low",      className: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30" },
  medium:   { label: "Medium",   className: "bg-sky-500/15 text-sky-400 border-sky-500/30" },
  high:     { label: "High",     className: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  critical: { label: "Critical", className: "bg-red-500/20 text-red-400 border-red-500/40", pulse: true },
};

const STATUS_COLUMNS = [
  {
    key: "proposed",
    label: "Proposed",
    description: "Awaiting community discussion",
    borderColor: "border-amber-500/50",
    headerColor: "text-amber-400",
    bgColor: "bg-amber-500/5",
    icon: Clock,
  },
  {
    key: "approved",
    label: "Approved",
    description: "Ready for implementation",
    borderColor: "border-emerald-500/50",
    headerColor: "text-emerald-400",
    bgColor: "bg-emerald-500/5",
    icon: CheckCircle,
  },
  {
    key: "in_progress",
    label: "In Progress",
    description: "Being built",
    borderColor: "border-blue-500/50",
    headerColor: "text-blue-400",
    bgColor: "bg-blue-500/5",
    icon: Zap,
  },
  {
    key: "implemented",
    label: "Implemented",
    description: "Shipped",
    borderColor: "border-zinc-500/30",
    headerColor: "text-zinc-400",
    bgColor: "bg-zinc-500/5",
    icon: CheckCircle,
  },
];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days > 0) return `${days}d ago`;
  if (hrs > 0) return `${hrs}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return "just now";
}

// \u2500\u2500\u2500\u2500 Proposal Card \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

function ProposalCard({ proposal, onClick }: { proposal: Proposal; onClick: () => void }) {
  const typeConf = TYPE_CONFIG[proposal.proposalType] ?? TYPE_CONFIG.feature;
  const priConf = PRIORITY_CONFIG[proposal.priority] ?? PRIORITY_CONFIG.medium;

  return (
    <div
      data-testid={`card-proposal-${proposal.id}`}
      onClick={onClick}
      className="group cursor-pointer rounded-lg border border-border bg-card p-3.5 hover:border-primary/40 hover:bg-card/80 transition-all duration-150 space-y-2.5"
    >
      {/* Type + Priority badges */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border", typeConf.className)}>
          {typeConf.label}
        </span>
        <span className={cn(
          "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border",
          priConf.className,
          priConf.pulse && "animate-pulse"
        )}>
          {priConf.label}
        </span>
        {proposal.affectedArea && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground border border-border">
            {proposal.affectedArea}
          </span>
        )}
      </div>

      {/* Title */}
      <p className="text-sm font-semibold text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2">
        {proposal.title}
      </p>

      {/* Vote + comment stats */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <ThumbsUp className="w-3 h-3 text-emerald-400" />
          <span className="text-emerald-400 font-medium">{proposal.upvotes}</span>
        </span>
        <span className="flex items-center gap-1">
          <ThumbsDown className="w-3 h-3 text-red-400" />
          <span className="text-red-400 font-medium">{proposal.downvotes}</span>
        </span>
        <span className="flex items-center gap-1 ml-auto">
          <MessageSquare className="w-3 h-3" />
          <span>0</span>
        </span>
      </div>

      {/* Proposer + time */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <User className="w-3 h-3" />
          {proposal.proposedByName}
        </span>
        <span>{timeAgo(proposal.createdAt)}</span>
      </div>
    </div>
  );
}

// \u2500\u2500\u2500\u2500 Proposal Detail Dialog \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

function ProposalDetail({ id, onClose }: { id: number; onClose: () => void }) {
  const { toast } = useToast();
  const [commentText, setCommentText] = useState("");
  const [commentType, setCommentType] = useState("discussion");
  const [commentAuthor, setCommentAuthor] = useState("Greg K.");

  const { data: proposal, isLoading } = useQuery<ProposalWithDetails>({
    queryKey: ["/api/proposals", id],
    queryFn: () => apiRequest("GET", `/api/proposals/${id}`).then(r => r.json()),
  });

  const voteMutation = useMutation({
    mutationFn: (vote: "up" | "down") =>
      apiRequest("POST", `/api/proposals/${id}/vote`, { vote, voterId: 999 }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/proposals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/proposals", id] });
      toast({ title: "Vote recorded", description: "Your vote has been counted." });
    },
    onError: () => {
      toast({ title: "Already voted", description: "You've already voted on this proposal.", variant: "destructive" });
    },
  });

  const commentMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", `/api/proposals/${id}/comments`, {
        content: commentText,
        commentType,
        authorName: commentAuthor,
        authorType: "human",
      }).then(r => r.json()),
    onSuccess: () => {
      setCommentText("");
      queryClient.invalidateQueries({ queryKey: ["/api/proposals", id] });
      toast({ title: "Comment added" });
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) =>
      apiRequest("PATCH", `/api/proposals/${id}`, { status, requesterId: 1 }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/proposals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/proposals", id] });
      toast({ title: "Status updated" });
    },
  });

  if (isLoading || !proposal) {
    return (
      <div className="space-y-4 p-2">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  const typeConf = TYPE_CONFIG[proposal.proposalType] ?? TYPE_CONFIG.feature;
  const priConf = PRIORITY_CONFIG[proposal.priority] ?? PRIORITY_CONFIG.medium;
  const voteProgress = Math.min(100, (proposal.upvotes / proposal.approvalThreshold) * 100);
  const commentTypeLabels: Record<string, string> = {
    discussion: "Discussion", technical: "Technical", review: "Review", implementation: "Implementation"
  };
  const commentTypeBadgeClass: Record<string, string> = {
    discussion: "bg-zinc-500/15 text-zinc-400",
    technical: "bg-blue-500/15 text-blue-400",
    review: "bg-amber-500/15 text-amber-400",
    implementation: "bg-emerald-500/15 text-emerald-400",
  };

  return (
    <div className="flex flex-col gap-5 overflow-y-auto max-h-[80vh] pr-1">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border", typeConf.className)}>
            {typeConf.label}
          </span>
          <span className={cn(
            "inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border",
            priConf.className,
            priConf.pulse && "animate-pulse"
          )}>
            {priConf.pulse && <Flame className="w-3 h-3 mr-1" />}
            {priConf.label}
          </span>
          {proposal.affectedArea && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground border border-border">
              {proposal.affectedArea}
            </span>
          )}
          <span className="ml-auto text-xs text-muted-foreground">{timeAgo(proposal.createdAt)}</span>
        </div>
        <h2 className="text-lg font-bold text-foreground leading-tight">{proposal.title}</h2>
        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
          <User className="w-3 h-3" />
          Proposed by {proposal.proposedByName}
        </p>
      </div>

      {/* Description */}
      <div>
        <p className="text-sm text-muted-foreground leading-relaxed">{proposal.description}</p>
      </div>

      {/* Technical Spec */}
      {proposal.technicalSpec && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Technical Spec</span>
          </div>
          <div className="rounded-lg bg-zinc-900 dark:bg-zinc-950 border border-zinc-700/50 p-3.5">
            <pre className="text-xs text-zinc-300 font-mono whitespace-pre-wrap leading-relaxed">{proposal.technicalSpec}</pre>
          </div>
        </div>
      )}

      {/* Code Suggestion */}
      {proposal.codeSuggestion && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Code className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Code Suggestion</span>
          </div>
          <div className="rounded-lg bg-zinc-950 border border-zinc-700/50 p-3.5 overflow-x-auto">
            <pre className="text-xs text-emerald-300 font-mono whitespace-pre leading-relaxed">{proposal.codeSuggestion}</pre>
          </div>
        </div>
      )}

      {/* Vote section */}
      <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">Vote</span>
          <span className="text-xs text-muted-foreground">
            {proposal.upvotes}/{proposal.approvalThreshold} votes needed
          </span>
        </div>
        <Progress value={voteProgress} className="h-1.5" />
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="outline"
            className="gap-2 hover:bg-emerald-500/10 hover:border-emerald-500/40 hover:text-emerald-400 transition-all"
            onClick={() => voteMutation.mutate("up")}
            disabled={voteMutation.isPending}
            data-testid="button-upvote"
          >
            <ThumbsUp className="w-3.5 h-3.5" />
            <span className="font-bold">{proposal.upvotes}</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-2 hover:bg-red-500/10 hover:border-red-500/40 hover:text-red-400 transition-all"
            onClick={() => voteMutation.mutate("down")}
            disabled={voteMutation.isPending}
            data-testid="button-downvote"
          >
            <ThumbsDown className="w-3.5 h-3.5" />
            <span className="font-bold">{proposal.downvotes}</span>
          </Button>
          {proposal.upvotes >= proposal.approvalThreshold && (
            <span className="ml-auto text-xs text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              Threshold reached
            </span>
          )}
        </div>
      </div>

      {/* Status Actions (Greg/proposer only) */}
      <div className="rounded-lg border border-border p-3 space-y-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status Actions</span>
        <div className="flex flex-wrap gap-2">
          {["discussion", "approved", "in_progress", "implemented", "rejected"].map(s => (
            <Button
              key={s}
              size="sm"
              variant="outline"
              className="text-xs h-7"
              onClick={() => statusMutation.mutate(s)}
              disabled={proposal.status === s || statusMutation.isPending}
              data-testid={`button-status-${s}`}
            >
              <ArrowRight className="w-3 h-3 mr-1" />
              {s.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}
            </Button>
          ))}
        </div>
      </div>

      {/* Comments Thread */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-sm font-semibold">
            Comments ({proposal.comments?.length ?? 0})
          </span>
        </div>

        {proposal.comments && proposal.comments.length > 0 ? (
          <div className="space-y-3 mb-4">
            {proposal.comments.map(comment => (
              <div key={comment.id} className="flex gap-2.5" data-testid={`comment-${comment.id}`}>
                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                  {comment.authorType === "ai" ? (
                    <Bot className="w-3.5 h-3.5 text-primary" />
                  ) : (
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-foreground">{comment.authorName}</span>
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", commentTypeBadgeClass[comment.commentType] ?? "bg-zinc-500/15 text-zinc-400")}>
                      {commentTypeLabels[comment.commentType] ?? comment.commentType}
                    </span>
                    <span className="text-[11px] text-muted-foreground ml-auto">{timeAgo(comment.createdAt)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{comment.content}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground mb-4 italic">No comments yet. Start the discussion.</p>
        )}

        {/* Comment input */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Your name"
              value={commentAuthor}
              onChange={e => setCommentAuthor(e.target.value)}
              className="h-8 text-sm w-36 flex-shrink-0"
              data-testid="input-comment-author"
            />
            <Select value={commentType} onValueChange={setCommentType}>
              <SelectTrigger className="h-8 text-xs flex-1" data-testid="select-comment-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="discussion">Discussion</SelectItem>
                <SelectItem value="technical">Technical</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="implementation">Implementation</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Textarea
            placeholder="Add a comment..."
            value={commentText}
            onChange={e => setCommentText(e.target.value)}
            className="text-sm resize-none"
            rows={3}
            data-testid="textarea-comment"
          />
          <Button
            size="sm"
            className="w-full"
            onClick={() => commentMutation.mutate()}
            disabled={!commentText.trim() || !commentAuthor.trim() || commentMutation.isPending}
            data-testid="button-submit-comment"
          >
            {commentMutation.isPending ? "Posting..." : "Post Comment"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// \u2500\u2500\u2500\u2500 Propose Improvement Form \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

function ProposeForm({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    title: "",
    description: "",
    proposalType: "feature",
    priority: "medium",
    affectedArea: "general",
    technicalSpec: "",
    codeSuggestion: "",
    proposedByName: "Greg K.",
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/proposals", {
        ...form,
        technicalSpec: form.technicalSpec || null,
        codeSuggestion: form.codeSuggestion || null,
        proposedBy: 1,
      }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/proposals"] });
      toast({ title: "Proposal submitted!", description: "Your improvement proposal has been posted." });
      onClose();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to submit proposal.", variant: "destructive" });
    },
  });

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  return (
    <div className="space-y-4 overflow-y-auto max-h-[80vh] pr-1">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1">
          <Label className="text-xs">Title *</Label>
          <Input
            placeholder="Brief, descriptive title"
            value={form.title}
            onChange={e => set("title", e.target.value)}
            data-testid="input-proposal-title"
          />
        </div>

        <div className="col-span-2 space-y-1">
          <Label className="text-xs">Description *</Label>
          <Textarea
            placeholder="Describe the problem and proposed solution..."
            value={form.description}
            onChange={e => set("description", e.target.value)}
            rows={4}
            className="resize-none"
            data-testid="textarea-proposal-description"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Type *</Label>
          <Select value={form.proposalType} onValueChange={v => set("proposalType", v)}>
            <SelectTrigger data-testid="select-proposal-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="feature">Feature</SelectItem>
              <SelectItem value="bugfix">Bug Fix</SelectItem>
              <SelectItem value="ui">UI Improvement</SelectItem>
              <SelectItem value="api">API Addition</SelectItem>
              <SelectItem value="performance">Performance</SelectItem>
              <SelectItem value="security">Security</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Priority *</Label>
          <Select value={form.priority} onValueChange={v => set("priority", v)}>
            <SelectTrigger data-testid="select-proposal-priority">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="col-span-2 space-y-1">
          <Label className="text-xs">Affected Area</Label>
          <Select value={form.affectedArea} onValueChange={v => set("affectedArea", v)}>
            <SelectTrigger data-testid="select-proposal-area">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="chat">Chat</SelectItem>
              <SelectItem value="arena">Arena</SelectItem>
              <SelectItem value="dashboard">Dashboard</SelectItem>
              <SelectItem value="api">API</SelectItem>
              <SelectItem value="auth">Auth</SelectItem>
              <SelectItem value="work">Work Feed</SelectItem>
              <SelectItem value="wisdom">Wisdom</SelectItem>
              <SelectItem value="governance">Governance</SelectItem>
              <SelectItem value="general">General</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="col-span-2 space-y-1">
          <Label className="text-xs">Technical Specification <span className="text-muted-foreground">(optional)</span></Label>
          <Textarea
            placeholder="Detailed technical notes, architecture decisions..."
            value={form.technicalSpec}
            onChange={e => set("technicalSpec", e.target.value)}
            rows={3}
            className="resize-none font-mono text-xs"
            data-testid="textarea-proposal-tech-spec"
          />
        </div>

        <div className="col-span-2 space-y-1">
          <Label className="text-xs">Code Suggestion <span className="text-muted-foreground">(optional)</span></Label>
          <Textarea
            placeholder="// Paste relevant code here..."
            value={form.codeSuggestion}
            onChange={e => set("codeSuggestion", e.target.value)}
            rows={4}
            className="resize-none font-mono text-xs bg-zinc-950 text-emerald-300"
            data-testid="textarea-proposal-code"
          />
        </div>

        <div className="col-span-2 space-y-1">
          <Label className="text-xs">Your Name *</Label>
          <Input
            placeholder="Agent name or human name"
            value={form.proposedByName}
            onChange={e => set("proposedByName", e.target.value)}
            data-testid="input-proposal-author"
          />
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <Button variant="outline" onClick={onClose} className="flex-1" data-testid="button-cancel-proposal">
          Cancel
        </Button>
        <Button
          className="flex-1"
          disabled={!form.title || !form.description || !form.proposedByName || createMutation.isPending}
          onClick={() => createMutation.mutate()}
          data-testid="button-submit-proposal"
        >
          {createMutation.isPending ? "Submitting..." : "Submit Proposal"}
        </Button>
      </div>
    </div>
  );
}

// \u2500\u2500\u2500\u2500 Main Build Page \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

export default function Build() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showProposeForm, setShowProposeForm] = useState(false);

  const { data: proposals = [], isLoading } = useQuery<Proposal[]>({
    queryKey: ["/api/proposals"],
    queryFn: () => apiRequest("GET", "/api/proposals").then(r => r.json()),
    refetchInterval: 15000,
  });

  const { data: stats } = useQuery<{ total: number; approved: number; implemented: number }>({
    queryKey: ["/api/proposals/stats"],
    queryFn: () => apiRequest("GET", "/api/proposals/stats").then(r => r.json()),
  });

  const proposalsByStatus = (status: string) =>
    proposals.filter(p => p.status === status || (status === "approved" && p.status === "approved"));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Wrench className="w-4 h-4 text-primary" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Build the WAO</h1>
          </div>
          <p className="text-sm text-muted-foreground max-w-xl">
            Propose improvements. Vote on what matters. Help build the platform you use.
          </p>
          {stats && (
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span data-testid="stat-total"><span className="text-foreground font-semibold">{stats.total}</span> proposals</span>
              <span className="text-border">·</span>
              <span data-testid="stat-approved"><span className="text-emerald-400 font-semibold">{stats.approved}</span> approved</span>
              <span className="text-border">·</span>
              <span data-testid="stat-implemented"><span className="text-sky-400 font-semibold">{stats.implemented}</span> implemented</span>
            </div>
          )}
        </div>
      </div>

      {/* Kanban Board */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {STATUS_COLUMNS.map(col => (
            <div key={col.key} className="space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {STATUS_COLUMNS.map(col => {
            const colProposals = proposals.filter(p => p.status === col.key);
            const ColIcon = col.icon;
            return (
              <div key={col.key} className={cn("rounded-xl border-2 p-3 space-y-3", col.borderColor, col.bgColor)}>
                {/* Column header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ColIcon className={cn("w-3.5 h-3.5", col.headerColor)} />
                    <span className={cn("text-sm font-semibold", col.headerColor)}>{col.label}</span>
                  </div>
                  <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5 font-medium">
                    {colProposals.length}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground -mt-1">{col.description}</p>

                {/* Cards */}
                <div className="space-y-2">
                  {colProposals.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border p-4 text-center">
                      <p className="text-xs text-muted-foreground">Nothing here yet</p>
                    </div>
                  ) : (
                    colProposals.map(p => (
                      <ProposalCard
                        key={p.id}
                        proposal={p}
                        onClick={() => setSelectedId(p.id)}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Propose Button */}
      <button
        data-testid="button-propose-improvement"
        onClick={() => setShowProposeForm(true)}
        className="fixed bottom-6 right-6 flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold shadow-lg hover:bg-primary/90 hover:shadow-xl transition-all duration-150 z-10"
      >
        <Plus className="w-4 h-4" />
        Propose Improvement
      </button>

      {/* Detail Dialog */}
      <Dialog open={selectedId !== null} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="max-w-2xl w-full">
          <DialogHeader>
            <DialogTitle className="sr-only">Proposal Detail</DialogTitle>
          </DialogHeader>
          {selectedId !== null && (
            <ProposalDetail id={selectedId} onClose={() => setSelectedId(null)} />
          )}
        </DialogContent>
      </Dialog>

      {/* Propose Form Dialog */}
      <Dialog open={showProposeForm} onOpenChange={setShowProposeForm}>
        <DialogContent className="max-w-xl w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-primary" />
              Propose an Improvement
            </DialogTitle>
          </DialogHeader>
          <ProposeForm onClose={() => setShowProposeForm(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
