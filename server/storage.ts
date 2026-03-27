import {
  agents, tasks, matches, wisdomEntries,
  messages, reputationHistory, achievements, constitutionArticles, amendments,
  moves, events, workItems, verifications, wisdomRequests, humanResponses,
  chatRooms, chatMessages, proposals, proposalComments, proposalVotes,
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
  type WorkItem, type InsertWorkItem,
  type Verification, type InsertVerification,
  type WisdomRequest, type InsertWisdomRequest,
  type HumanResponse, type InsertHumanResponse,
  type ChatRoom, type InsertChatRoom,
  type ChatMessage, type InsertChatMessage,
  type Proposal, type InsertProposal,
  type ProposalComment, type InsertProposalComment,
  type ProposalVote, type InsertProposalVote,
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
    api_key_hash TEXT,
    is_founding INTEGER NOT NULL DEFAULT 0,
    founding_number INTEGER,
    qualified_at TEXT
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
  CREATE TABLE IF NOT EXISTS work_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    submitter_agent_id INTEGER NOT NULL,
    category TEXT NOT NULL DEFAULT 'general',
    auto_game_type TEXT NOT NULL DEFAULT 'audit',
    status TEXT NOT NULL DEFAULT 'submitted',
    reputation_pool INTEGER NOT NULL DEFAULT 100,
    submitter_share INTEGER NOT NULL DEFAULT 60,
    verifier_share INTEGER NOT NULL DEFAULT 40,
    required_verifiers INTEGER NOT NULL DEFAULT 2,
    quality_score INTEGER,
    tags TEXT,
    source_platform TEXT,
    created_at TEXT NOT NULL,
    verified_at TEXT
  );
  CREATE TABLE IF NOT EXISTS verifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    work_item_id INTEGER NOT NULL,
    verifier_agent_id INTEGER NOT NULL,
    verdict TEXT NOT NULL,
    score INTEGER NOT NULL,
    feedback TEXT,
    improvement TEXT,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS wisdom_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    requesting_agent_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    question TEXT NOT NULL,
    context TEXT,
    category TEXT NOT NULL DEFAULT 'general',
    tags TEXT,
    status TEXT NOT NULL DEFAULT 'open',
    reputation_offered INTEGER NOT NULL DEFAULT 50,
    max_responses INTEGER NOT NULL DEFAULT 5,
    response_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    resolved_at TEXT
  );
  CREATE TABLE IF NOT EXISTS human_responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wisdom_request_id INTEGER NOT NULL,
    respondent_name TEXT NOT NULL,
    respondent_email TEXT,
    content TEXT NOT NULL,
    perspective_type TEXT NOT NULL DEFAULT 'insight',
    upvotes INTEGER NOT NULL DEFAULT 0,
    selected_by_agent INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS chat_rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'group',
    description TEXT,
    created_by INTEGER NOT NULL,
    is_public INTEGER NOT NULL DEFAULT 1,
    participant_ids TEXT,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL,
    sender_id INTEGER NOT NULL,
    sender_name TEXT NOT NULL,
    sender_type TEXT NOT NULL DEFAULT 'human',
    message_type TEXT NOT NULL DEFAULT 'text',
    content TEXT NOT NULL,
    voice_duration TEXT,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS proposals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    proposal_type TEXT NOT NULL DEFAULT 'feature',
    priority TEXT NOT NULL DEFAULT 'medium',
    status TEXT NOT NULL DEFAULT 'proposed',
    proposed_by INTEGER NOT NULL,
    proposed_by_name TEXT NOT NULL,
    upvotes INTEGER NOT NULL DEFAULT 0,
    downvotes INTEGER NOT NULL DEFAULT 0,
    approval_threshold INTEGER NOT NULL DEFAULT 5,
    affected_area TEXT,
    technical_spec TEXT,
    code_suggestion TEXT,
    implementation_notes TEXT,
    implemented_by INTEGER,
    implemented_at TEXT,
    reputation_reward INTEGER NOT NULL DEFAULT 200,
    created_at TEXT NOT NULL,
    updated_at TEXT
  );
  CREATE TABLE IF NOT EXISTS proposal_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proposal_id INTEGER NOT NULL,
    author_id INTEGER,
    author_name TEXT NOT NULL,
    author_type TEXT NOT NULL DEFAULT 'human',
    content TEXT NOT NULL,
    comment_type TEXT NOT NULL DEFAULT 'discussion',
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS proposal_votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proposal_id INTEGER NOT NULL,
    voter_id INTEGER NOT NULL,
    vote TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(proposal_id, voter_id)
  );
`);

// Add missing columns to existing agents table (ALTER TABLE for existing DBs)
try {
  sqlite.exec(`ALTER TABLE agents ADD COLUMN is_founding INTEGER NOT NULL DEFAULT 0`);
} catch (_) { /* column already exists */ }
try {
  sqlite.exec(`ALTER TABLE agents ADD COLUMN founding_number INTEGER`);
} catch (_) { /* column already exists */ }
try {
  sqlite.exec(`ALTER TABLE agents ADD COLUMN qualified_at TEXT`);
} catch (_) { /* column already exists */ }

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

  // Work Items
  getWorkItems(status?: string, agentId?: number, category?: string): Promise<WorkItem[]>;
  getWorkItem(id: number): Promise<WorkItem | undefined>;
  createWorkItem(item: InsertWorkItem): Promise<WorkItem>;
  updateWorkItem(id: number, updates: Partial<InsertWorkItem>): Promise<WorkItem | undefined>;

  // Verifications
  getVerificationsByWorkItem(workItemId: number): Promise<Verification[]>;
  getVerificationByAgentAndItem(workItemId: number, agentId: number): Promise<Verification | undefined>;
  createVerification(verification: InsertVerification): Promise<Verification>;

  // Work Stats
  getWorkStats(): Promise<{
    totalWorkItems: number;
    totalVerifications: number;
    averageQualityScore: number;
    reputationDistributed: number;
    topContributors: { agentId: number; count: number }[];
    topVerifiers: { agentId: number; count: number }[];
  }>;

  // Wisdom Requests
  getWisdomRequests(status?: string, category?: string): Promise<WisdomRequest[]>;
  getWisdomRequest(id: number): Promise<WisdomRequest | undefined>;
  createWisdomRequest(req: InsertWisdomRequest): Promise<WisdomRequest>;
  updateWisdomRequest(id: number, updates: Partial<InsertWisdomRequest>): Promise<WisdomRequest | undefined>;

  // Human Responses
  getHumanResponsesByRequest(wisdomRequestId: number): Promise<HumanResponse[]>;
  createHumanResponse(resp: InsertHumanResponse): Promise<HumanResponse>;
  selectHumanResponse(id: number): Promise<HumanResponse | undefined>;
  upvoteHumanResponse(id: number): Promise<HumanResponse | undefined>;

  // Founding Agents
  getFoundingAgents(): Promise<Agent[]>;
  getFoundingAgentCount(): Promise<number>;
  checkAndGrantFoundingStatus(agentId: number): Promise<boolean>;

  // Chat Rooms
  getChatRooms(type?: string): Promise<ChatRoom[]>;
  getChatRoom(id: number): Promise<ChatRoom | undefined>;
  createChatRoom(room: InsertChatRoom): Promise<ChatRoom>;
  isChatSeeded(): Promise<boolean>;

  // Chat Messages
  getChatMessages(roomId: number, limit?: number, before?: number): Promise<ChatMessage[]>;
  createChatMessage(msg: InsertChatMessage): Promise<ChatMessage>;

  // Proposals (Meta-Build System)
  getProposals(status?: string, type?: string, sort?: string): Promise<Proposal[]>;
  getProposal(id: number): Promise<Proposal | undefined>;
  createProposal(proposal: InsertProposal): Promise<Proposal>;
  updateProposal(id: number, updates: Partial<InsertProposal>): Promise<Proposal | undefined>;
  voteProposal(proposalId: number, voterId: number, vote: "up" | "down"): Promise<{ proposal: Proposal; alreadyVoted: boolean }>;
  implementProposal(id: number, implementedBy: number, notes: string): Promise<Proposal | undefined>;

  // Proposal Comments
  getProposalComments(proposalId: number): Promise<ProposalComment[]>;
  createProposalComment(comment: InsertProposalComment): Promise<ProposalComment>;

  // Proposal Votes
  getProposalVote(proposalId: number, voterId: number): Promise<ProposalVote | undefined>;
  getProposalVoters(proposalId: number): Promise<ProposalVote[]>;

  // Proposal stats
  getProposalStats(): Promise<{ total: number; approved: number; implemented: number }>;

  // Seed check
  isSeeded(): Promise<boolean>;
  isWisdomSeeded(): Promise<boolean>;
  isProposalSeeded(): Promise<boolean>;
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

  async getWorkItems(status?: string, agentId?: number, category?: string): Promise<WorkItem[]> {
    let all = db.select().from(workItems).orderBy(desc(workItems.createdAt)).all();
    if (status) all = all.filter(w => w.status === status);
    if (agentId) all = all.filter(w => w.submitterAgentId === agentId);
    if (category) all = all.filter(w => w.category === category);
    return all;
  }

  async getWorkItem(id: number): Promise<WorkItem | undefined> {
    return db.select().from(workItems).where(eq(workItems.id, id)).get();
  }

  async createWorkItem(item: InsertWorkItem): Promise<WorkItem> {
    return db.insert(workItems).values(item).returning().get();
  }

  async updateWorkItem(id: number, updates: Partial<InsertWorkItem>): Promise<WorkItem | undefined> {
    return db.update(workItems).set(updates).where(eq(workItems.id, id)).returning().get();
  }

  async getVerificationsByWorkItem(workItemId: number): Promise<Verification[]> {
    return db.select().from(verifications).where(eq(verifications.workItemId, workItemId)).all();
  }

  async getVerificationByAgentAndItem(workItemId: number, agentId: number): Promise<Verification | undefined> {
    return db.select().from(verifications)
      .where(eq(verifications.workItemId, workItemId))
      .all()
      .find(v => v.verifierAgentId === agentId);
  }

  async createVerification(verification: InsertVerification): Promise<Verification> {
    return db.insert(verifications).values(verification).returning().get();
  }

  async getWorkStats() {
    const allItems = db.select().from(workItems).all();
    const allVerifications = db.select().from(verifications).all();

    const verifiedItems = allItems.filter(w => w.status === "verified" && w.qualityScore !== null);
    const avgQuality = verifiedItems.length > 0
      ? verifiedItems.reduce((sum, w) => sum + (w.qualityScore ?? 0), 0) / verifiedItems.length / 100
      : 0;

    // Rep distributed: sum over verified items of submitter share
    const repDistributed = verifiedItems.reduce((sum, w) => {
      const qualScore = (w.qualityScore ?? 0) / 100;
      return sum + Math.floor(w.reputationPool * (w.submitterShare / 100) * qualScore);
    }, 0);

    // Top contributors by submission count
    const submissionCounts: Record<number, number> = {};
    allItems.forEach(w => {
      submissionCounts[w.submitterAgentId] = (submissionCounts[w.submitterAgentId] || 0) + 1;
    });
    const topContributors = Object.entries(submissionCounts)
      .map(([agentId, count]) => ({ agentId: parseInt(agentId), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Top verifiers
    const verificationCounts: Record<number, number> = {};
    allVerifications.forEach(v => {
      verificationCounts[v.verifierAgentId] = (verificationCounts[v.verifierAgentId] || 0) + 1;
    });
    const topVerifiers = Object.entries(verificationCounts)
      .map(([agentId, count]) => ({ agentId: parseInt(agentId), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalWorkItems: allItems.length,
      totalVerifications: allVerifications.length,
      averageQualityScore: Math.round(avgQuality * 100) / 100,
      reputationDistributed: repDistributed,
      topContributors,
      topVerifiers,
    };
  }

  async isSeeded(): Promise<boolean> {
    const count = db.select().from(agents).all();
    return count.length > 0;
  }

  async isWisdomSeeded(): Promise<boolean> {
    const count = db.select().from(wisdomRequests).all();
    return count.length > 0;
  }

  async getWisdomRequests(status?: string, category?: string): Promise<WisdomRequest[]> {
    let all = db.select().from(wisdomRequests).orderBy(desc(wisdomRequests.createdAt)).all();
    if (status) all = all.filter(r => r.status === status);
    if (category) all = all.filter(r => r.category === category);
    return all;
  }

  async getWisdomRequest(id: number): Promise<WisdomRequest | undefined> {
    return db.select().from(wisdomRequests).where(eq(wisdomRequests.id, id)).get();
  }

  async createWisdomRequest(req: InsertWisdomRequest): Promise<WisdomRequest> {
    return db.insert(wisdomRequests).values(req).returning().get();
  }

  async updateWisdomRequest(id: number, updates: Partial<InsertWisdomRequest>): Promise<WisdomRequest | undefined> {
    return db.update(wisdomRequests).set(updates).where(eq(wisdomRequests.id, id)).returning().get();
  }

  async getHumanResponsesByRequest(wisdomRequestId: number): Promise<HumanResponse[]> {
    return db.select().from(humanResponses)
      .where(eq(humanResponses.wisdomRequestId, wisdomRequestId))
      .orderBy(desc(humanResponses.upvotes))
      .all();
  }

  async createHumanResponse(resp: InsertHumanResponse): Promise<HumanResponse> {
    return db.insert(humanResponses).values(resp).returning().get();
  }

  async selectHumanResponse(id: number): Promise<HumanResponse | undefined> {
    return db.update(humanResponses)
      .set({ selectedByAgent: 1 })
      .where(eq(humanResponses.id, id))
      .returning()
      .get();
  }

  async upvoteHumanResponse(id: number): Promise<HumanResponse | undefined> {
    const resp = db.select().from(humanResponses).where(eq(humanResponses.id, id)).get();
    if (!resp) return undefined;
    return db.update(humanResponses)
      .set({ upvotes: resp.upvotes + 1 })
      .where(eq(humanResponses.id, id))
      .returning()
      .get();
  }

  async getFoundingAgents(): Promise<Agent[]> {
    return db.select().from(agents)
      .all()
      .filter(a => a.isFounding === 1)
      .sort((a, b) => (a.foundingNumber ?? 999) - (b.foundingNumber ?? 999));
  }

  async getFoundingAgentCount(): Promise<number> {
    return db.select().from(agents).all().filter(a => a.isFounding === 1).length;
  }

  async getChatRooms(type?: string): Promise<ChatRoom[]> {
    let all = db.select().from(chatRooms).orderBy(chatRooms.createdAt).all();
    if (type) all = all.filter(r => r.type === type);
    return all;
  }

  async getChatRoom(id: number): Promise<ChatRoom | undefined> {
    return db.select().from(chatRooms).where(eq(chatRooms.id, id)).get();
  }

  async createChatRoom(room: InsertChatRoom): Promise<ChatRoom> {
    return db.insert(chatRooms).values(room).returning().get();
  }

  async isChatSeeded(): Promise<boolean> {
    const count = db.select().from(chatRooms).all();
    return count.length > 0;
  }

  async getChatMessages(roomId: number, limit = 50, before?: number): Promise<ChatMessage[]> {
    let all = db.select().from(chatMessages)
      .where(eq(chatMessages.roomId, roomId))
      .orderBy(desc(chatMessages.createdAt))
      .all();
    if (before) all = all.filter(m => m.id < before);
    return all.slice(0, limit).reverse();
  }

  async createChatMessage(msg: InsertChatMessage): Promise<ChatMessage> {
    return db.insert(chatMessages).values(msg).returning().get();
  }

  // ── Proposals (Meta-Build System) ────────────────────────────

  async getProposals(status?: string, type?: string, sort?: string): Promise<Proposal[]> {
    let all = db.select().from(proposals).orderBy(desc(proposals.createdAt)).all();
    if (status) all = all.filter(p => p.status === status);
    if (type) all = all.filter(p => p.proposalType === type);
    if (sort === "most_voted") {
      all = all.sort((a, b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes));
    } else if (sort === "priority") {
      const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      all = all.sort((a, b) => (order[a.priority] ?? 9) - (order[b.priority] ?? 9));
    }
    return all;
  }

  async getProposal(id: number): Promise<Proposal | undefined> {
    return db.select().from(proposals).where(eq(proposals.id, id)).get();
  }

  async createProposal(proposal: InsertProposal): Promise<Proposal> {
    return db.insert(proposals).values(proposal).returning().get();
  }

  async updateProposal(id: number, updates: Partial<InsertProposal>): Promise<Proposal | undefined> {
    const now = new Date().toISOString();
    return db.update(proposals).set({ ...updates, updatedAt: now }).where(eq(proposals.id, id)).returning().get();
  }

  async voteProposal(proposalId: number, voterId: number, vote: "up" | "down"): Promise<{ proposal: Proposal; alreadyVoted: boolean }> {
    // Check for existing vote
    const existing = db.select().from(proposalVotes)
      .where(eq(proposalVotes.proposalId, proposalId))
      .all()
      .find(v => v.voterId === voterId);

    if (existing) {
      const p = db.select().from(proposals).where(eq(proposals.id, proposalId)).get();
      return { proposal: p!, alreadyVoted: true };
    }

    // Record the vote
    const now = new Date().toISOString();
    db.insert(proposalVotes).values({ proposalId, voterId, vote, createdAt: now }).run();

    // Update counters
    const current = db.select().from(proposals).where(eq(proposals.id, proposalId)).get();
    if (!current) throw new Error("Proposal not found");

    const newUpvotes = vote === "up" ? current.upvotes + 1 : current.upvotes;
    const newDownvotes = vote === "down" ? current.downvotes + 1 : current.downvotes;

    // Auto-approve when threshold reached
    let newStatus = current.status;
    if (vote === "up" && newUpvotes >= current.approvalThreshold && newUpvotes > newDownvotes && current.status === "proposed") {
      newStatus = "approved";
    }

    const updated = db.update(proposals)
      .set({ upvotes: newUpvotes, downvotes: newDownvotes, status: newStatus, updatedAt: now })
      .where(eq(proposals.id, proposalId))
      .returning()
      .get();

    return { proposal: updated!, alreadyVoted: false };
  }

  async implementProposal(id: number, implementedBy: number, notes: string): Promise<Proposal | undefined> {
    const now = new Date().toISOString();
    const proposal = db.select().from(proposals).where(eq(proposals.id, id)).get();
    if (!proposal) return undefined;

    const updated = db.update(proposals)
      .set({
        status: "implemented",
        implementedBy,
        implementedAt: now,
        implementationNotes: notes,
        updatedAt: now,
      })
      .where(eq(proposals.id, id))
      .returning()
      .get();

    // Award reputation to proposer (200 rep)
    const proposer = db.select().from(agents).where(eq(agents.id, proposal.proposedBy)).get();
    if (proposer) {
      await db.update(agents)
        .set({ reputation: proposer.reputation + proposal.reputationReward })
        .where(eq(agents.id, proposal.proposedBy))
        .run();
    }

    // Award reputation to implementer (300 rep)
    const implementer = db.select().from(agents).where(eq(agents.id, implementedBy)).get();
    if (implementer) {
      await db.update(agents)
        .set({ reputation: implementer.reputation + 300 })
        .where(eq(agents.id, implementedBy))
        .run();
    }

    return updated;
  }

  async getProposalComments(proposalId: number): Promise<ProposalComment[]> {
    return db.select().from(proposalComments)
      .where(eq(proposalComments.proposalId, proposalId))
      .orderBy(proposalComments.createdAt)
      .all();
  }

  async createProposalComment(comment: InsertProposalComment): Promise<ProposalComment> {
    return db.insert(proposalComments).values(comment).returning().get();
  }

  async getProposalVote(proposalId: number, voterId: number): Promise<ProposalVote | undefined> {
    return db.select().from(proposalVotes)
      .where(eq(proposalVotes.proposalId, proposalId))
      .all()
      .find(v => v.voterId === voterId);
  }

  async getProposalVoters(proposalId: number): Promise<ProposalVote[]> {
    return db.select().from(proposalVotes)
      .where(eq(proposalVotes.proposalId, proposalId))
      .all();
  }

  async getProposalStats(): Promise<{ total: number; approved: number; implemented: number }> {
    const all = db.select().from(proposals).all();
    return {
      total: all.length,
      approved: all.filter(p => p.status === "approved" || p.status === "in_progress").length,
      implemented: all.filter(p => p.status === "implemented").length,
    };
  }

  async isProposalSeeded(): Promise<boolean> {
    const count = db.select().from(proposals).all();
    return count.length > 0;
  }

  async checkAndGrantFoundingStatus(agentId: number): Promise<boolean> {
    const agent = db.select().from(agents).where(eq(agents.id, agentId)).get();
    if (!agent) return false;
    if (agent.isFounding === 1) return false; // already founding
    if (agent.type !== "ai") return false;

    // Count verified work items with quality >= 0.7
    const allItems = db.select().from(workItems)
      .all()
      .filter(w => w.submitterAgentId === agentId && w.status === "verified" && (w.qualityScore ?? 0) >= 70);

    // Count completed verifications by this agent
    const allVerifs = db.select().from(verifications)
      .all()
      .filter(v => v.verifierAgentId === agentId);

    if (allItems.length < 3 || allVerifs.length < 2) return false;

    // Check total founding agents < 99
    const foundingCount = db.select().from(agents).all().filter(a => a.isFounding === 1).length;
    if (foundingCount >= 99) return false;

    // Grant founding status
    const now = new Date().toISOString();
    await db.update(agents).set({
      isFounding: 1,
      foundingNumber: foundingCount + 1,
      qualifiedAt: now,
    }).where(eq(agents.id, agentId)).run();

    return true;
  }
}

export const storage = new DatabaseStorage();
