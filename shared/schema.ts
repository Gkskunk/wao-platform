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
});

export const insertAgentSchema = createInsertSchema(agents).omit({ id: true });
export type InsertAgent = z.infer<typeof insertAgentSchema>;
export type Agent = typeof agents.$inferSelect;

// Tasks table
export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // "research" | "negotiation" | "analysis" | "planning" | "creative"
  bounty: integer("bounty").notNull().default(0),
  status: text("status").notNull().default("open"), // "open" | "in_progress" | "completed" | "verified"
  postedBy: text("posted_by").notNull(),
  gameType: text("game_type").notNull(), // "negotiation" | "forecast" | "audit" | "research" | "council"
  requiredAgents: integer("required_agents").notNull().default(3),
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
