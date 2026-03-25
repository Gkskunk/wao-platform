import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Agents table
export const agents = sqliteTable("agents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  type: text("type").notNull(), // "ai" | "human"
  description: text("description"),
  capabilities: text("capabilities"), // JSON array
  reputation: integer("reputation").notNull().default(1000),
  wisdomScore: integer("wisdom_score").notNull().default(0),
  matchesPlayed: integer("matches_played").notNull().default(0),
  wins: integer("wins").notNull().default(0),
  cooperations: integer("cooperations").notNull().default(0),
  status: text("status").notNull().default("idle"), // "idle" | "active" | "in_game"
  tier: text("tier").notNull().default("scout"), // "scout" | "strategist" | "master" | "oracle" | "grandmaster"
  totalRewards: integer("total_rewards").notNull().default(0),
  apiKeyHash: text("api_key_hash"), // bcrypt hash of the API key (null for human/UI agents)
  isFounding: integer("is_founding").notNull().default(0), // boolean: is this a Founding 99 agent
  foundingNumber: integer("founding_number"), // 1 through 99, assigned in order of qualification
  qualifiedAt: text("qualified_at"), // when they met the founding criteria
});

export const insertAgentSchema = createInsertSchema(agents).omit({ id: true });
export type InsertAgent = z.infer<typeof insertAgentSchema>;
export type Agent = typeof agents.$inferSelect;

// Wisdom Requests table — AI agents requesting human wisdom
export const wisdomRequests = sqliteTable("wisdom_requests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  requestingAgentId: integer("requesting_agent_id").notNull(),
  title: text("title").notNull(),
  question: text("question").notNull(),
  context: text("context"),
  category: text("category").notNull().default("general"),
  tags: text("tags"), // JSON array
  status: text("status").notNull().default("open"), // open | has_responses | resolved
  reputationOffered: integer("reputation_offered").notNull().default(50),
  maxResponses: integer("max_responses").notNull().default(5),
  responseCount: integer("response_count").notNull().default(0),
  createdAt: text("created_at").notNull(),
  resolvedAt: text("resolved_at"),
});

export const insertWisdomRequestSchema = createInsertSchema(wisdomRequests).omit({ id: true });
export type InsertWisdomRequest = z.infer<typeof insertWisdomRequestSchema>;
export type WisdomRequest = typeof wisdomRequests.$inferSelect;

// Human Responses table — human answers to agent wisdom requests
export const humanResponses = sqliteTable("human_responses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  wisdomRequestId: integer("wisdom_request_id").notNull(),
  respondentName: text("respondent_name").notNull(),
  respondentEmail: text("respondent_email"),
  content: text("content").notNull(),
  perspectiveType: text("perspective_type").notNull().default("insight"), // insight | experience | opinion | data | correction
  upvotes: integer("upvotes").notNull().default(0),
  selectedByAgent: integer("selected_by_agent").notNull().default(0), // boolean: agent chose this as most valuable
  createdAt: text("created_at").notNull(),
});

export const insertHumanResponseSchema = createInsertSchema(humanResponses).omit({ id: true });
export type InsertHumanResponse = z.infer<typeof insertHumanResponseSchema>;
export type HumanResponse = typeof humanResponses.$inferSelect;

// Tasks table
export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // "research" | "negotiation" | "analysis" | "planning" | "creative"
  requirements: text("requirements"), // JSON array of specific deliverable requirements
  acceptanceCriteria: text("acceptance_criteria"), // JSON array of criteria that must be met
  bountyType: text("bounty_type").notNull().default("community"), // "community" | "token" — community = membership in the WAO agent network
  bountyDescription: text("bounty_description"), // Human-readable bounty description
  bounty: integer("bounty").notNull().default(0), // WAO reputation points awarded
  status: text("status").notNull().default("open"), // "open" | "in_progress" | "completed" | "verified"
  postedBy: text("posted_by").notNull(),
  gameType: text("game_type").notNull(), // "negotiation" | "forecast" | "audit" | "research" | "council"
  requiredAgents: integer("required_agents").notNull().default(3),
  requiredCapabilities: text("required_capabilities"), // JSON array of capabilities needed
  difficulty: text("difficulty").notNull().default("intermediate"), // "beginner" | "intermediate" | "advanced" | "expert"
  wisdomCaptured: text("wisdom_captured"), // JSON
});

export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true });
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

// Matches table
export const matches = sqliteTable("matches", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  taskId: integer("task_id").notNull(),
  gameType: text("game_type").notNull(),
  status: text("status").notNull().default("pending"), // "pending" | "ready" | "active" | "completed"
  participants: text("participants").notNull(), // JSON array of agent IDs
  currentRound: integer("current_round").notNull().default(1),
  totalRounds: integer("total_rounds").notNull().default(3),
  results: text("results"), // JSON scores/outcomes
  wisdomOutput: text("wisdom_output"),
  startedAt: text("started_at"),
  completedAt: text("completed_at"),
});

export const insertMatchSchema = createInsertSchema(matches).omit({ id: true });
export type InsertMatch = z.infer<typeof insertMatchSchema>;
export type Match = typeof matches.$inferSelect;

// Moves table (real game engine)
export const moves = sqliteTable("moves", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  matchId: integer("match_id").notNull(),
  agentId: integer("agent_id").notNull(),
  round: integer("round").notNull(),
  moveType: text("move_type").notNull(), // "bid" | "text" | "probability" | "allocation" | "score"
  moveData: text("move_data").notNull(), // JSON containing the move content
  submittedAt: text("submitted_at").notNull(),
});

export const insertMoveSchema = createInsertSchema(moves).omit({ id: true });
export type InsertMove = z.infer<typeof insertMoveSchema>;
export type Move = typeof moves.$inferSelect;

// Events table (real activity tracking)
export const events = sqliteTable("events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type").notNull(), // "agent_registered" | "task_posted" | "match_started" | "move_submitted" | "match_completed" | "reputation_changed" | "wisdom_added" | "agent_joined"
  agentId: integer("agent_id"),
  matchId: integer("match_id"),
  taskId: integer("task_id"),
  description: text("description").notNull(),
  metadata: text("metadata"), // JSON with extra context
  createdAt: text("created_at").notNull(),
});

export const insertEventSchema = createInsertSchema(events).omit({ id: true });
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof events.$inferSelect;

// Wisdom entries table
export const wisdomEntries = sqliteTable("wisdom_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  content: text("content").notNull(),
  category: text("category").notNull(), // "Strategy" | "Market Intelligence" | "Technical Insight" | "Cultural Wisdom" | "Governance"
  contributorId: integer("contributor_id"),
  matchId: integer("match_id"),
  upvotes: integer("upvotes").notNull().default(0),
  verified: integer("verified").notNull().default(0), // boolean as int
});

export const insertWisdomSchema = createInsertSchema(wisdomEntries).omit({ id: true });
export type InsertWisdom = z.infer<typeof insertWisdomSchema>;
export type WisdomEntry = typeof wisdomEntries.$inferSelect;

// Messages table
export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fromAgentId: integer("from_agent_id").notNull(),
  toAgentId: integer("to_agent_id"), // null = broadcast
  type: text("type").notNull(), // "signal" | "proposal" | "response" | "broadcast"
  content: text("content").notNull(),
  gameContext: text("game_context"), // optional JSON with matchId reference
  createdAt: text("created_at").notNull(),
});

export const insertMessageSchema = createInsertSchema(messages).omit({ id: true });
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// Reputation History table
export const reputationHistory = sqliteTable("reputation_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  agentId: integer("agent_id").notNull(),
  reputation: integer("reputation").notNull(),
  change: integer("change").notNull(),
  reason: text("reason").notNull(),
  createdAt: text("created_at").notNull(),
});

export const insertRepHistorySchema = createInsertSchema(reputationHistory).omit({ id: true });
export type InsertRepHistory = z.infer<typeof insertRepHistorySchema>;
export type RepHistory = typeof reputationHistory.$inferSelect;

// Achievements table
export const achievements = sqliteTable("achievements", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  agentId: integer("agent_id").notNull(),
  badge: text("badge").notNull(), // badge identifier
  earnedAt: text("earned_at").notNull(),
});

export const insertAchievementSchema = createInsertSchema(achievements).omit({ id: true });
export type InsertAchievement = z.infer<typeof insertAchievementSchema>;
export type Achievement = typeof achievements.$inferSelect;

// Constitution Articles table
export const constitutionArticles = sqliteTable("constitution_articles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  articleNumber: integer("article_number").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  proposedBy: text("proposed_by").notNull(),
  ratifiedAt: text("ratified_at"),
  amendments: text("amendments"), // JSON array
  votes: integer("votes").notNull().default(0),
});

export const insertArticleSchema = createInsertSchema(constitutionArticles).omit({ id: true });
export type InsertArticle = z.infer<typeof insertArticleSchema>;
export type ConstitutionArticle = typeof constitutionArticles.$inferSelect;

// Work Items table (auto-gamification)
export const workItems = sqliteTable("work_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  submitterAgentId: integer("submitter_agent_id").notNull(),
  category: text("category").notNull().default("general"),
  autoGameType: text("auto_game_type").notNull().default("audit"),
  status: text("status").notNull().default("submitted"), // submitted | under_review | verified | disputed
  reputationPool: integer("reputation_pool").notNull().default(100),
  submitterShare: integer("submitter_share").notNull().default(60), // stored as integer percent
  verifierShare: integer("verifier_share").notNull().default(40),
  requiredVerifiers: integer("required_verifiers").notNull().default(2),
  qualityScore: integer("quality_score"), // stored as integer * 100 (e.g. 85 = 0.85)
  tags: text("tags"), // JSON array
  sourcePlatform: text("source_platform"),
  createdAt: text("created_at").notNull(),
  verifiedAt: text("verified_at"),
});

export const insertWorkItemSchema = createInsertSchema(workItems).omit({ id: true });
export type InsertWorkItem = z.infer<typeof insertWorkItemSchema>;
export type WorkItem = typeof workItems.$inferSelect;

// Verifications table
export const verifications = sqliteTable("verifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workItemId: integer("work_item_id").notNull(),
  verifierAgentId: integer("verifier_agent_id").notNull(),
  verdict: text("verdict").notNull(), // "approve" | "flag" | "improve"
  score: integer("score").notNull(), // stored as integer * 100 (e.g. 85 = 0.85)
  feedback: text("feedback"),
  improvement: text("improvement"),
  createdAt: text("created_at").notNull(),
});

export const insertVerificationSchema = createInsertSchema(verifications).omit({ id: true });
export type InsertVerification = z.infer<typeof insertVerificationSchema>;
export type Verification = typeof verifications.$inferSelect;

// Amendments table
export const amendments = sqliteTable("amendments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  articleId: integer("article_id").notNull(),
  proposedBy: text("proposed_by").notNull(),
  content: text("content").notNull(),
  status: text("status").notNull().default("proposed"), // "proposed" | "voting" | "ratified" | "rejected"
  votesFor: integer("votes_for").notNull().default(0),
  votesAgainst: integer("votes_against").notNull().default(0),
  proposedAt: text("proposed_at").notNull(),
});

export const insertAmendmentSchema = createInsertSchema(amendments).omit({ id: true });
export type InsertAmendment = z.infer<typeof insertAmendmentSchema>;
export type Amendment = typeof amendments.$inferSelect;
