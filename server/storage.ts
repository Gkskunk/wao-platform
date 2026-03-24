import {
  agents, tasks, matches, wisdomEntries,
  messages, reputationHistory, achievements, constitutionArticles, amendments,
  moves, events,
  type Agent, type InsertAgent,
  type Task, type InsertTask,
  type Match, type InsertMatch,
  type WisdomEntry, type InsertWisdom,
  type Message, type InsertMessage,
  type RepHistory, type InsertRepHistory,
  type Achievement, type InsertAchievement,
  type ConstitutionArticle, type InsertArticle,
  type Amendment, type InsertAmendment,
  type Move, type InsertMove,
  type Event, type InsertEvent,
} from "@shared/schema";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, desc } from "drizzle-orm";

const sqlite = new Database("data.db");
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite);

// Run migrations manually
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS agents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT,
    capabilities TEXT,
    reputation INTEGER NOT NULL DEFAULT 1000,
    wisdom_score INTEGER NOT NULL DEFAULT 0,
    matches_played INTEGER NOT NULL DEFAULT 0,
    wins INTEGER NOT NULL DEFAULT 0,
    cooperations INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'idle',
    tier TEXT NOT NULL DEFAULT 'scout',
    total_rewards INTEGER NOT NULL DEFAULT 0,
    api_key_hash TEXT
  );
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    requirements TEXT,
    acceptance_criteria TEXT,
    bounty_type TEXT NOT NULL DEFAULT 'community',
    bounty_description TEXT,
    bounty INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'open',
    posted_by TEXT NOT NULL,
    game_type TEXT NOT NULL,
    required_agents INTEGER NOT NULL DEFAULT 3,
    required_capabilities TEXT,
    difficulty TEXT NOT NULL DEFAULT 'intermediate',
    wisdom_captured TEXT
  );
  CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    game_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    participants TEXT NOT NULL,
    current_round INTEGER NOT NULL DEFAULT 1,
    total_rounds INTEGER NOT NULL DEFAULT 3,
    results TEXT,
    wisdom_output TEXT,
    started_at TEXT,
    completed_at TEXT
  );
  CREATE TABLE IF NOT EXISTS moves (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id INTEGER NOT NULL,
    agent_id INTEGER NOT NULL,
    round INTEGER NOT NULL,
    move_type TEXT NOT NULL,
    move_data TEXT NOT NULL,
    submitted_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    agent_id INTEGER,
    match_id INTEGER,
    task_id INTEGER,
    description TEXT NOT NULL,
    metadata TEXT,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS wisdom_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    category TEXT NOT NULL,
    contributor_id INTEGER,
    match_id INTEGER,
    upvotes INTEGER NOT NULL DEFAULT 0,
    verified INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_agent_id INTEGER NOT NULL,
    to_agent_id INTEGER,
    type TEXT NOT NULL,
    content TEXT NOT NULL,
    game_context TEXT,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS reputation_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id INTEGER NOT NULL,
    reputation INTEGER NOT NULL,
    change INTEGER NOT NULL,
    reason TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id INTEGER NOT NULL,
    badge TEXT NOT NULL,
    earned_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS constitution_articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    proposed_by TEXT NOT NULL,
    ratified_at TEXT,
    amendments TEXT,
    votes INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS amendments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id INTEGER NOT NULL,
    proposed_by TEXT NOT NULL,
    content TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'proposed',
    votes_for INTEGER NOT NULL DEFAULT 0,
    votes_against INTEGER NOT NULL DEFAULT 0,
    proposed_at TEXT NOT NULL
  );
`);

export interface IStorage {
  // Agents
  getAgents(): Promise<Agent[]>;
  getAgent(id: number): Promise<Agent | undefined>;
  getAgentByApiKeyHash(hash: string): Promise<Agent | undefined>;
  createAgent(agent: InsertAgent): Promise<Agent>;
  updateAgent(id: number, updates: Partial<InsertAgent>): Promise<Agent | undefined>;

  // Tasks
  getTasks(status?: string): Promise<Task[]>;
  getTask(id: number): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, updates: Partial<InsertTask>): Promise<Task | undefined>;

  // Matches
  getMatches(): Promise<Match[]>;
  getMatch(id: number): Promise<Match | undefined>;
  getMatchByTask(taskId: number): Promise<Match | undefined>;
  createMatch(match: InsertMatch): Promise<Match>;
  updateMatch(id: number, updates: Partial<InsertMatch>): Promise<Match | undefined>;

  // Moves (game engine)
  getMovesByMatch(matchId: number): Promise<Move[]>;
  getMovesByMatchAndRound(matchId: number, round: number): Promise<Move[]>;
  getAgentMoveInRound(matchId: number, agentId: number, round: number): Promise<Move | undefined>;
  createMove(move: InsertMove): Promise<Move>;

  // Events (real activity)
  getEvents(limit?: number): Promise<Event[]>;
  createEvent(event: InsertEvent): Promise<Event>;

  // Wisdom
  getWisdomEntries(category?: string): Promise<WisdomEntry[]>;
  createWisdomEntry(entry: InsertWisdom): Promise<WisdomEntry>;
  upvoteWisdom(id: number): Promise<WisdomEntry | undefined>;

  // Messages
  getMessageFeed(): Promise<Message[]>;
  getMessagesByAgent(agentId: number): Promise<Message[]>;
  createMessage(msg: InsertMessage): Promise<Message>;

  // Reputation History
  getRepHistory(agentId: number): Promise<RepHistory[]>;
  createRepHistory(entry: InsertRepHistory): Promise<RepHistory>;

  // Achievements
  getAchievements(agentId: number): Promise<Achievement[]>;
  createAchievement(achievement: InsertAchievement): Promise<Achievement>;

  // Constitution
  getArticles(): Promise<ConstitutionArticle[]>;
  getArticle(id: number): Promise<ConstitutionArticle | undefined>;
  createArticle(article: InsertArticle): Promise<ConstitutionArticle>;

  // Amendments
  getAmendmentsByArticle(articleId: number): Promise<Amendment[]>;
  createAmendment(amendment: InsertAmendment): Promise<Amendment>;
  voteAmendment(id: number, vote: "for" | "against"): Promise<Amendment | undefined>;

  // Seed check
  isSeeded(): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getAgents(): Promise<Agent[]> {
    return db.select().from(agents).orderBy(desc(agents.reputation)).all();
  }

  async getAgent(id: number): Promise<Agent | undefined> {
    return db.select().from(agents).where(eq(agents.id, id)).get();
  }

  async getAgentByApiKeyHash(_hash: string): Promise<Agent | undefined> {
    // We'll iterate and compare via bcrypt in routes — this is for direct hash lookup
    return undefined;
  }

  async createAgent(agent: InsertAgent): Promise<Agent> {
    return db.insert(agents).values(agent).returning().get();
  }

  async updateAgent(id: number, updates: Partial<InsertAgent>): Promise<Agent | undefined> {
    return db.update(agents).set(updates).where(eq(agents.id, id)).returning().get();
  }

  async getTasks(status?: string): Promise<Task[]> {
    if (status) {
      return db.select().from(tasks).where(eq(tasks.status, status)).all();
    }
    return db.select().from(tasks).all();
  }

  async getTask(id: number): Promise<Task | undefined> {
    return db.select().from(tasks).where(eq(tasks.id, id)).get();
  }

  async createTask(task: InsertTask): Promise<Task> {
    return db.insert(tasks).values(task).returning().get();
  }

  async updateTask(id: number, updates: Partial<InsertTask>): Promise<Task | undefined> {
    return db.update(tasks).set(updates).where(eq(tasks.id, id)).returning().get();
  }

  async getMatches(): Promise<Match[]> {
    return db.select().from(matches).all();
  }

  async getMatch(id: number): Promise<Match | undefined> {
    return db.select().from(matches).where(eq(matches.id, id)).get();
  }

  async getMatchByTask(taskId: number): Promise<Match | undefined> {
    return db.select().from(matches).where(eq(matches.taskId, taskId)).get();
  }

  async createMatch(match: InsertMatch): Promise<Match> {
    return db.insert(matches).values(match).returning().get();
  }

  async updateMatch(id: number, updates: Partial<InsertMatch>): Promise<Match | undefined> {
    return db.update(matches).set(updates).where(eq(matches.id, id)).returning().get();
  }

  async getMovesByMatch(matchId: number): Promise<Move[]> {
    return db.select().from(moves).where(eq(moves.matchId, matchId)).all();
  }

  async getMovesByMatchAndRound(matchId: number, round: number): Promise<Move[]> {
    return db.select().from(moves)
      .where(eq(moves.matchId, matchId))
      .all()
      .filter(m => m.round === round);
  }

  async getAgentMoveInRound(matchId: number, agentId: number, round: number): Promise<Move | undefined> {
    return db.select().from(moves)
      .where(eq(moves.matchId, matchId))
      .all()
      .find(m => m.agentId === agentId && m.round === round);
  }

  async createMove(move: InsertMove): Promise<Move> {
    return db.insert(moves).values(move).returning().get();
  }

  async getEvents(limit = 50): Promise<Event[]> {
    return db.select().from(events).orderBy(desc(events.createdAt)).all().slice(0, limit);
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    return db.insert(events).values(event).returning().get();
  }

  async getWisdomEntries(category?: string): Promise<WisdomEntry[]> {
    if (category) {
      return db.select().from(wisdomEntries).where(eq(wisdomEntries.category, category)).orderBy(desc(wisdomEntries.upvotes)).all();
    }
    return db.select().from(wisdomEntries).orderBy(desc(wisdomEntries.upvotes)).all();
  }

  async createWisdomEntry(entry: InsertWisdom): Promise<WisdomEntry> {
    return db.insert(wisdomEntries).values(entry).returning().get();
  }

  async upvoteWisdom(id: number): Promise<WisdomEntry | undefined> {
    const entry = db.select().from(wisdomEntries).where(eq(wisdomEntries.id, id)).get();
    if (!entry) return undefined;
    return db.update(wisdomEntries)
      .set({ upvotes: entry.upvotes + 1 })
      .where(eq(wisdomEntries.id, id))
      .returning()
      .get();
  }

  async getMessageFeed(): Promise<Message[]> {
    return db.select().from(messages).orderBy(desc(messages.createdAt)).all().slice(0, 30);
  }

  async getMessagesByAgent(agentId: number): Promise<Message[]> {
    return db.select().from(messages)
      .where(eq(messages.fromAgentId, agentId))
      .orderBy(desc(messages.createdAt))
      .all();
  }

  async createMessage(msg: InsertMessage): Promise<Message> {
    return db.insert(messages).values(msg).returning().get();
  }

  async getRepHistory(agentId: number): Promise<RepHistory[]> {
    return db.select().from(reputationHistory)
      .where(eq(reputationHistory.agentId, agentId))
      .orderBy(reputationHistory.createdAt)
      .all();
  }

  async createRepHistory(entry: InsertRepHistory): Promise<RepHistory> {
    return db.insert(reputationHistory).values(entry).returning().get();
  }

  async getAchievements(agentId: number): Promise<Achievement[]> {
    return db.select().from(achievements)
      .where(eq(achievements.agentId, agentId))
      .all();
  }

  async createAchievement(achievement: InsertAchievement): Promise<Achievement> {
    return db.insert(achievements).values(achievement).returning().get();
  }

  async getArticles(): Promise<ConstitutionArticle[]> {
    return db.select().from(constitutionArticles)
      .orderBy(constitutionArticles.articleNumber)
      .all();
  }

  async getArticle(id: number): Promise<ConstitutionArticle | undefined> {
    return db.select().from(constitutionArticles).where(eq(constitutionArticles.id, id)).get();
  }

  async createArticle(article: InsertArticle): Promise<ConstitutionArticle> {
    return db.insert(constitutionArticles).values(article).returning().get();
  }

  async getAmendmentsByArticle(articleId: number): Promise<Amendment[]> {
    return db.select().from(amendments)
      .where(eq(amendments.articleId, articleId))
      .all();
  }

  async createAmendment(amendment: InsertAmendment): Promise<Amendment> {
    return db.insert(amendments).values(amendment).returning().get();
  }

  async voteAmendment(id: number, vote: "for" | "against"): Promise<Amendment | undefined> {
    const amendment = db.select().from(amendments).where(eq(amendments.id, id)).get();
    if (!amendment) return undefined;
    const updates = vote === "for"
      ? { votesFor: amendment.votesFor + 1 }
      : { votesAgainst: amendment.votesAgainst + 1 };
    return db.update(amendments).set(updates).where(eq(amendments.id, id)).returning().get();
  }

  async isSeeded(): Promise<boolean> {
    const count = db.select().from(agents).all();
    return count.length > 0;
  }
}

export const storage = new DatabaseStorage();
