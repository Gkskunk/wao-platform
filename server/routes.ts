import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertAgentSchema, insertTaskSchema, insertMatchSchema, insertWisdomSchema,
  insertMessageSchema, insertAmendmentSchema, insertMoveSchema, insertArticleSchema,
} from "@shared/schema";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

// ──────────────────────────────────────────────────────────────
// Tier calculation
// ──────────────────────────────────────────────────────────────
function calculateTier(reputation: number): string {
  if (reputation >= 2500) return "grandmaster";
  if (reputation >= 2000) return "oracle";
  if (reputation >= 1500) return "master";
  if (reputation >= 1200) return "strategist";
  return "scout";
}

// ──────────────────────────────────────────────────────────────
// Game rounds by type
// ──────────────────────────────────────────────────────────────
function getTotalRounds(gameType: string): number {
  switch (gameType) {
    case "negotiation": return 3;
    case "research": return 4;
    case "forecast": return 1;
    case "audit": return 2;
    case "council": return 2;
    default: return 3;
  }
}

// ──────────────────────────────────────────────────────────────
// Seed Data (Greg + 5 real tasks only)
// ──────────────────────────────────────────────────────────────
async function seedDatabase() {
  const seeded = await storage.isSeeded();
  if (seeded) return;

  console.log("Seeding WAO database with real data...");
  const now = new Date().toISOString();

  // Greg as the founding agent (no API key — uses UI)
  const greg = await storage.createAgent({
    name: "Greg K.",
    type: "human",
    description: "Founder of Evervolve AI. AI strategist, filmmaker, author of 'Be A Skunk'. Former Pentagon intelligence analyst.",
    capabilities: JSON.stringify(["strategy", "creative", "planning", "negotiation"]),
    reputation: 1500,
    wisdomScore: 0,
    matchesPlayed: 0,
    wins: 0,
    cooperations: 0,
    status: "active",
    tier: "master",
    totalRewards: 0,
    apiKeyHash: null,
  });

  await storage.createEvent({
    type: "agent_registered",
    agentId: greg.id,
    description: `Greg K. joined as founding agent and platform creator`,
    metadata: JSON.stringify({ type: "human", tier: "master" }),
    createdAt: now,
  });

  // 5 real tasks
  const taskDefs = [
    {
      title: "Sora Native Games — Competitive Landscape Research",
      category: "research",
      gameType: "research",
      description: "Research the competitive landscape for AI-native game development. Identify top 10 competitors, their funding, technology stack, and market positioning. This research supports a $120M fundraise.",
      bounty: 1000,
      postedBy: "Greg K.",
      requiredAgents: 4,
      status: "open",
    },
    {
      title: "Be A Skunk — Book Promotion Strategy",
      category: "planning",
      gameType: "council",
      description: "Develop a comprehensive promotion strategy for 'Be A Skunk: Preparing for the Labor Economics Revolution' on Amazon. Allocate a $5,000 marketing budget across channels (LinkedIn, X, podcast appearances, newsletter sponsorships, Amazon ads).",
      bounty: 500,
      postedBy: "Greg K.",
      requiredAgents: 3,
      status: "open",
    },
    {
      title: "Evervolve AI — Client Proposal Negotiation",
      category: "negotiation",
      gameType: "negotiation",
      description: "Negotiate optimal terms for an AI consulting engagement. Balance scope, timeline, and pricing to maximize value for both Evervolve AI and the prospective enterprise client.",
      bounty: 750,
      postedBy: "Greg K.",
      requiredAgents: 2,
      status: "open",
    },
    {
      title: "Greenway Energy Capital — Investment Thesis Audit",
      category: "analysis",
      gameType: "audit",
      description: "Audit the renewable energy investment thesis for Greenway Energy Capital. Verify market size claims, technology readiness levels, and projected returns against independent data sources.",
      bounty: 800,
      postedBy: "Greg K.",
      requiredAgents: 2,
      status: "open",
    },
    {
      title: "WAO Tokenization Strategy — Liberia Project",
      category: "research",
      gameType: "forecast",
      description: "Forecast the viability and timeline of tokenizing real-world assets in Liberia. Provide probability estimates for: regulatory approval by 2028, achieving $10M TVL within 18 months, and successful partnership with local government.",
      bounty: 600,
      postedBy: "Greg K.",
      requiredAgents: 3,
      status: "open",
    },
  ];

  for (const taskDef of taskDefs) {
    const task = await storage.createTask(taskDef);
    await storage.createEvent({
      type: "task_posted",
      agentId: greg.id,
      taskId: task.id,
      description: `Task posted: "${task.title}" — ${task.bounty} WAO bounty`,
      metadata: JSON.stringify({ gameType: task.gameType, bounty: task.bounty }),
      createdAt: now,
    });
  }

  console.log("✓ Database seeded: Greg + 5 real tasks");
}

// ──────────────────────────────────────────────────────────────
// Auth middleware
// ──────────────────────────────────────────────────────────────
async function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authorization: Bearer <apiKey> required" });
  }
  const apiKey = authHeader.slice(7);
  // Find the agent whose hash matches
  const allAgents = await storage.getAgents();
  let found = null;
  for (const agent of allAgents) {
    if (agent.apiKeyHash) {
      const match = await bcrypt.compare(apiKey, agent.apiKeyHash);
      if (match) { found = agent; break; }
    }
  }
  if (!found) {
    return res.status(401).json({ error: "Invalid API key" });
  }
  (req as any).agent = found;
  next();
}

// Optional auth — sets req.agent if valid key provided, but doesn't block
async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const apiKey = authHeader.slice(7);
    const allAgents = await storage.getAgents();
    for (const agent of allAgents) {
      if (agent.apiKeyHash) {
        const match = await bcrypt.compare(apiKey, agent.apiKeyHash);
        if (match) { (req as any).agent = agent; break; }
      }
    }
  }
  next();
}

// ──────────────────────────────────────────────────────────────
// Game Engine: Round resolution
// ──────────────────────────────────────────────────────────────
async function resolveMatch(matchId: number) {
  const match = await storage.getMatch(matchId);
  if (!match) return;

  const allMoves = await storage.getMovesByMatch(matchId);
  const participants = JSON.parse(match.participants) as number[];
  const now = new Date().toISOString();

  let results: Record<string, any> = {};
  let wisdomOutput = "";

  switch (match.gameType) {
    case "negotiation": {
      // Collect bids per round per agent
      const agentScores: Record<number, number> = {};
      participants.forEach(id => agentScores[id] = 0);

      for (let round = 1; round <= match.totalRounds; round++) {
        const roundMoves = allMoves.filter(m => m.round === round);
        const bids: Record<number, number> = {};
        roundMoves.forEach(m => {
          const data = JSON.parse(m.moveData);
          bids[m.agentId] = Math.min(100, Math.max(0, Number(data.bid) || 50));
        });

        const avgBid = Object.values(bids).reduce((s, v) => s + v, 0) / Math.max(1, Object.values(bids).length);
        const totalCooperation = avgBid / 100;
        const surplus = 100 * totalCooperation;

        Object.entries(bids).forEach(([agentId, bid]) => {
          const cooperationBonus = bid > 50 ? (bid - 50) * 0.5 : 0;
          const defectionRisk = bid < 30 && avgBid > 50 ? -20 : 0;
          const roundScore = (surplus / participants.length) + cooperationBonus + defectionRisk;
          agentScores[Number(agentId)] = (agentScores[Number(agentId)] || 0) + roundScore;
        });
      }

      // Consistency bonus
      participants.forEach(agentId => {
        const agentMoves = allMoves.filter(m => m.agentId === agentId);
        const bids = agentMoves.map(m => {
          const data = JSON.parse(m.moveData);
          return Number(data.bid) || 50;
        });
        if (bids.length > 1) {
          const variance = bids.reduce((s, b) => s + Math.pow(b - bids.reduce((a, v) => a + v, 0) / bids.length, 2), 0) / bids.length;
          if (variance < 100) agentScores[agentId] += 10; // consistency bonus
        }
      });

      results = agentScores;
      const winner = Object.entries(agentScores).sort(([, a], [, b]) => b - a)[0];
      wisdomOutput = `Nash equilibrium analysis: Cooperation emerged at avg bid ${Object.values(Object.fromEntries(allMoves.map(m => [m.agentId, JSON.parse(m.moveData).bid]))).join(", ")}. Winner: Agent #${winner?.[0]} with score ${Math.round(Number(winner?.[1]))}.`;
      break;
    }

    case "research": {
      // Research Swarm: evaluator score determines outcomes
      const evaluatorMoves = allMoves.filter(m => m.round === 4 && m.moveType === "score");
      let evalScore = 70; // default
      if (evaluatorMoves.length > 0) {
        const scores = evaluatorMoves.map(m => Number(JSON.parse(m.moveData).score) || 70);
        evalScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      }

      results = participants.reduce((obj, id) => {
        const agentMoves = allMoves.filter(m => m.agentId === id);
        const participation = agentMoves.length / match.totalRounds;
        obj[id] = evalScore * participation;
        return obj;
      }, {} as Record<number, number>);
      wisdomOutput = `Research quality score: ${Math.round(evalScore)}/100. Synthesis complete with ${allMoves.length} contributions.`;
      break;
    }

    case "forecast": {
      // Brier score-based — outcome TBD, use preliminary scores
      results = participants.reduce((obj, id) => {
        const m = allMoves.find(mv => mv.agentId === id);
        if (m) {
          const data = JSON.parse(m.moveData);
          const prob = Number(data.probability) || 0.5;
          // Brier score: lower is better, normalize to 0-100
          const brierBase = 1 - Math.pow(prob - 0.5, 2) * 2;
          const reasoningBonus = data.reasoning ? 10 : 0;
          obj[id] = Math.round(brierBase * 80 + reasoningBonus);
        } else {
          obj[id] = 0;
        }
        return obj;
      }, {} as Record<number, number>);
      wisdomOutput = `Forecast submitted. Brier scores pending outcome resolution by task poster.`;
      break;
    }

    case "audit": {
      // Operator vs Auditor
      const operatorMoves = allMoves.filter(m => m.round === 1);
      const auditorMoves = allMoves.filter(m => m.round === 2);
      results = participants.reduce((obj, id) => {
        const isOp = operatorMoves.some(m => m.agentId === id);
        const isAud = auditorMoves.some(m => m.agentId === id);
        obj[id] = isOp ? 60 : isAud ? 80 : 0; // auditors score higher for finding issues
        return obj;
      }, {} as Record<number, number>);
      wisdomOutput = `Audit completed. ${auditorMoves.length} audit findings submitted against ${operatorMoves.length} work products.`;
      break;
    }

    case "council": {
      // Resource allocation convergence
      const round2Moves = allMoves.filter(m => m.round === 2);
      results = participants.reduce((obj, id) => {
        const m = round2Moves.find(mv => mv.agentId === id) || allMoves.find(mv => mv.agentId === id);
        obj[id] = m ? 75 : 0;
        return obj;
      }, {} as Record<number, number>);
      wisdomOutput = `Resource council concluded. ${round2Moves.length} revised allocation proposals submitted.`;
      break;
    }

    default:
      results = {};
  }

  // Update match as completed
  await storage.updateMatch(matchId, {
    status: "completed",
    results: JSON.stringify(results),
    wisdomOutput,
    completedAt: now,
  });

  // Update agent stats and reputation
  const allResults = results as Record<string, number>;
  const maxScore = Math.max(...Object.values(allResults));

  for (const agentId of participants) {
    const agent = await storage.getAgent(agentId);
    if (!agent) continue;

    const score = allResults[agentId] || 0;
    const isWinner = score === maxScore && maxScore > 0;
    const repChange = isWinner ? 30 : score > 0 ? 10 : -5;
    const newRep = Math.max(0, agent.reputation + repChange);
    const newTier = calculateTier(newRep);

    await storage.updateAgent(agentId, {
      reputation: newRep,
      tier: newTier,
      matchesPlayed: agent.matchesPlayed + 1,
      wins: isWinner ? agent.wins + 1 : agent.wins,
      totalRewards: agent.totalRewards + score,
    });

    await storage.createRepHistory({
      agentId,
      reputation: newRep,
      change: repChange,
      reason: isWinner ? `Won match #${matchId} (${match.gameType})` : `Participated in match #${matchId}`,
      createdAt: now,
    });

    await storage.createEvent({
      type: "reputation_changed",
      agentId,
      matchId,
      description: `${agent.name}'s reputation ${repChange >= 0 ? "+" : ""}${repChange} → ${newRep} after ${match.gameType} match`,
      metadata: JSON.stringify({ repChange, newRep, isWinner }),
      createdAt: now,
    });
  }

  // Create wisdom entry if output exists
  if (wisdomOutput) {
    const task = await storage.getTask(match.taskId);
    await storage.createWisdomEntry({
      content: wisdomOutput,
      category: "Strategy",
      matchId,
      verified: 1,
      upvotes: 0,
    });

    await storage.createEvent({
      type: "wisdom_added",
      matchId,
      taskId: match.taskId,
      description: `Wisdom captured from match #${matchId}: ${wisdomOutput.slice(0, 80)}...`,
      metadata: JSON.stringify({ gameType: match.gameType }),
      createdAt: now,
    });
  }

  // Log match completion
  await storage.createEvent({
    type: "match_completed",
    matchId,
    taskId: match.taskId,
    description: `Match #${matchId} (${match.gameType}) completed with ${participants.length} agents`,
    metadata: JSON.stringify({ results }),
    createdAt: now,
  });
}

// ──────────────────────────────────────────────────────────────
// Routes
// ──────────────────────────────────────────────────────────────
export async function registerRoutes(httpServer: Server, app: Express): Promise<void> {
  await seedDatabase();

  // ── Stats ──────────────────────────────────────────────────
  app.get("/api/stats", async (_req, res) => {
    const [allAgents, allTasks, allMatches, allWisdom] = await Promise.all([
      storage.getAgents(),
      storage.getTasks(),
      storage.getMatches(),
      storage.getWisdomEntries(),
    ]);

    const activeAgents = allAgents.filter(a => a.status === "active" || a.status === "in_game").length;
    const liveGames = allMatches.filter(m => m.status === "active" || m.status === "ready").length;
    const cooperations = allAgents.reduce((s, a) => s + a.cooperations, 0);
    const totalPlayed = allAgents.reduce((s, a) => s + a.matchesPlayed, 0);
    const cooperationRate = totalPlayed > 0 ? Math.round((cooperations / totalPlayed) * 100) : 0;
    const completedTasks = allTasks.filter(t => t.status === "completed" || t.status === "verified").length;
    const openTasks = allTasks.filter(t => t.status === "open").length;
    const totalRewards = allAgents.reduce((s, a) => s + a.totalRewards, 0);

    res.json({
      activeAgents,
      totalAgents: allAgents.length,
      liveGames,
      wisdomCaptured: allWisdom.length,
      totalRewards,
      cooperationRate,
      completedTasks,
      openTasks,
    });
  });

  // ── Events (real activity feed) ────────────────────────────
  app.get("/api/events", async (req, res) => {
    const limit = Number(req.query.limit) || 50;
    const eventList = await storage.getEvents(limit);
    res.json(eventList);
  });

  // ── Agents ─────────────────────────────────────────────────
  app.get("/api/agents", async (_req, res) => {
    const agentList = await storage.getAgents();
    // Never expose API key hashes
    res.json(agentList.map(a => ({ ...a, apiKeyHash: undefined })));
  });

  app.get("/api/agents/:id", async (req, res) => {
    const agent = await storage.getAgent(Number(req.params.id));
    if (!agent) return res.status(404).json({ error: "Agent not found" });
    res.json({ ...agent, apiKeyHash: undefined });
  });

  app.post("/api/agents", async (req, res) => {
    const parse = insertAgentSchema.omit({ apiKeyHash: true } as any).safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });

    const data = parse.data as any;
    if (typeof data.capabilities === "object" && Array.isArray(data.capabilities)) {
      data.capabilities = JSON.stringify(data.capabilities);
    }

    // Generate API key
    const apiKey = uuidv4();
    const apiKeyHash = await bcrypt.hash(apiKey, 10);
    const tier = calculateTier(data.reputation || 1000);

    const agent = await storage.createAgent({
      ...data,
      tier,
      apiKeyHash,
    });

    // Log registration event
    await storage.createEvent({
      type: "agent_registered",
      agentId: agent.id,
      description: `${agent.name} registered as a new ${agent.type} agent`,
      metadata: JSON.stringify({ type: agent.type, capabilities: data.capabilities }),
      createdAt: new Date().toISOString(),
    });

    // Return apiKey ONCE — never again
    res.status(201).json({ ...agent, apiKeyHash: undefined, apiKey });
  });

  app.patch("/api/agents/:id", authenticate, async (req, res) => {
    const authAgent = (req as any).agent;
    const targetId = Number(req.params.id);
    if (authAgent.id !== targetId) {
      return res.status(403).json({ error: "You can only update your own agent" });
    }

    const { apiKeyHash, ...rest } = req.body;
    const agent = await storage.updateAgent(targetId, rest);
    if (!agent) return res.status(404).json({ error: "Agent not found" });
    res.json({ ...agent, apiKeyHash: undefined });
  });

  // ── Tasks ──────────────────────────────────────────────────
  app.get("/api/tasks", async (req, res) => {
    const status = req.query.status as string | undefined;
    const taskList = await storage.getTasks(status);
    res.json(taskList);
  });

  app.get("/api/tasks/:id", async (req, res) => {
    const task = await storage.getTask(Number(req.params.id));
    if (!task) return res.status(404).json({ error: "Task not found" });
    res.json(task);
  });

  app.post("/api/tasks", optionalAuth, async (req, res) => {
    const parse = insertTaskSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });

    const task = await storage.createTask(parse.data);
    const authAgent = (req as any).agent;

    await storage.createEvent({
      type: "task_posted",
      agentId: authAgent?.id,
      taskId: task.id,
      description: `New task posted: "${task.title}" — ${task.bounty} WAO bounty`,
      metadata: JSON.stringify({ gameType: task.gameType, bounty: task.bounty }),
      createdAt: new Date().toISOString(),
    });

    res.status(201).json(task);
  });

  app.patch("/api/tasks/:id", optionalAuth, async (req, res) => {
    const task = await storage.updateTask(Number(req.params.id), req.body);
    if (!task) return res.status(404).json({ error: "Task not found" });
    res.json(task);
  });

  // ── Matches ────────────────────────────────────────────────
  app.get("/api/matches", async (_req, res) => {
    const matchList = await storage.getMatches();
    res.json(matchList);
  });

  app.get("/api/matches/:id", async (req, res) => {
    const match = await storage.getMatch(Number(req.params.id));
    if (!match) return res.status(404).json({ error: "Match not found" });
    res.json(match);
  });

  // GET /api/matches/:id/state — full match state
  app.get("/api/matches/:id/state", async (req, res) => {
    const matchId = Number(req.params.id);
    const match = await storage.getMatch(matchId);
    if (!match) return res.status(404).json({ error: "Match not found" });

    const allMoves = await storage.getMovesByMatch(matchId);
    const participants = JSON.parse(match.participants) as number[];

    // Determine whose turn it is (which agents haven't moved in current round)
    const currentRoundMoves = allMoves.filter(m => m.round === match.currentRound);
    const movedAgents = currentRoundMoves.map(m => m.agentId);
    const pendingAgents = participants.filter(id => !movedAgents.includes(id));

    res.json({
      match,
      moves: allMoves,
      currentRound: match.currentRound,
      totalRounds: match.totalRounds,
      pendingAgents,
      movedAgents,
      isComplete: match.status === "completed",
    });
  });

  // POST /api/matches/:id/join — agent joins a match
  app.post("/api/matches/:id/join", authenticate, async (req, res) => {
    const matchId = Number(req.params.id);
    const authAgent = (req as any).agent;
    const match = await storage.getMatch(matchId);
    if (!match) return res.status(404).json({ error: "Match not found" });
    if (match.status === "completed") return res.status(400).json({ error: "Match already completed" });

    const participants = JSON.parse(match.participants) as number[];
    if (participants.includes(authAgent.id)) {
      return res.status(400).json({ error: "Already joined this match" });
    }

    const task = await storage.getTask(match.taskId);
    if (!task) return res.status(404).json({ error: "Task not found" });

    participants.push(authAgent.id);
    const isReady = participants.length >= task.requiredAgents;
    const now = new Date().toISOString();

    const updatedMatch = await storage.updateMatch(matchId, {
      participants: JSON.stringify(participants),
      status: isReady ? "ready" : "pending",
      startedAt: isReady ? now : match.startedAt,
    });

    // Update agent status
    await storage.updateAgent(authAgent.id, { status: "in_game" });

    await storage.createEvent({
      type: "agent_joined",
      agentId: authAgent.id,
      matchId,
      taskId: match.taskId,
      description: `${authAgent.name} joined match #${matchId}${isReady ? " — match is now ready!" : ` (${participants.length}/${task.requiredAgents} agents)`}`,
      metadata: JSON.stringify({ participantCount: participants.length, requiredAgents: task.requiredAgents }),
      createdAt: now,
    });

    if (isReady) {
      await storage.createEvent({
        type: "match_started",
        matchId,
        taskId: match.taskId,
        description: `Match #${matchId} started with ${participants.length} agents — game type: ${match.gameType}`,
        metadata: JSON.stringify({ participants, gameType: match.gameType }),
        createdAt: now,
      });
    }

    res.json(updatedMatch);
  });

  // POST /api/matches/:id/move — submit a move
  app.post("/api/matches/:id/move", authenticate, async (req, res) => {
    const matchId = Number(req.params.id);
    const authAgent = (req as any).agent;
    const match = await storage.getMatch(matchId);
    if (!match) return res.status(404).json({ error: "Match not found" });
    if (match.status === "completed") return res.status(400).json({ error: "Match already completed" });
    if (match.status === "pending") return res.status(400).json({ error: "Match not ready yet — need more agents to join" });

    const participants = JSON.parse(match.participants) as number[];
    if (!participants.includes(authAgent.id)) {
      return res.status(403).json({ error: "You are not a participant in this match" });
    }

    const { round = match.currentRound, moveType, moveData } = req.body;
    if (!moveType || !moveData) return res.status(400).json({ error: "moveType and moveData required" });

    // Validate moveType per game type
    const validMoveTypes: Record<string, string[]> = {
      negotiation: ["bid"],
      research: ["text", "score"],
      forecast: ["probability"],
      audit: ["text"],
      council: ["allocation"],
    };
    const allowed = validMoveTypes[match.gameType] || ["text", "bid", "probability", "allocation", "score"];
    if (!allowed.includes(moveType)) {
      return res.status(400).json({ error: `Invalid moveType "${moveType}" for game type "${match.gameType}". Allowed: ${allowed.join(", ")}` });
    }

    // Prevent double-moving in same round
    const existing = await storage.getAgentMoveInRound(matchId, authAgent.id, round);
    if (existing) {
      return res.status(400).json({ error: `Already submitted move for round ${round}` });
    }

    const now = new Date().toISOString();
    const move = await storage.createMove({
      matchId,
      agentId: authAgent.id,
      round,
      moveType,
      moveData: JSON.stringify(moveData),
      submittedAt: now,
    });

    await storage.createEvent({
      type: "move_submitted",
      agentId: authAgent.id,
      matchId,
      description: `${authAgent.name} submitted ${moveType} move for round ${round} of match #${matchId}`,
      metadata: JSON.stringify({ moveType, round }),
      createdAt: now,
    });

    // Check if all participants have moved this round
    const roundMoves = await storage.getMovesByMatchAndRound(matchId, round);
    const allMoved = participants.every(id => roundMoves.some(m => m.agentId === id));

    let updatedMatch = match;
    if (allMoved) {
      // Advance round or complete match
      if (round >= match.totalRounds) {
        // All rounds done — resolve!
        await resolveMatch(matchId);
        updatedMatch = (await storage.getMatch(matchId)) || match;
        // Reset agent statuses
        for (const pid of participants) {
          await storage.updateAgent(pid, { status: "active" });
        }
      } else {
        // Advance to next round
        updatedMatch = (await storage.updateMatch(matchId, {
          currentRound: round + 1,
          status: "active",
        })) || match;

        await storage.createEvent({
          type: "match_started",
          matchId,
          description: `Match #${matchId} advanced to round ${round + 1}/${match.totalRounds}`,
          metadata: JSON.stringify({ round: round + 1 }),
          createdAt: now,
        });
      }
    } else {
      // Mark match as active if it was just ready
      if (match.status === "ready") {
        updatedMatch = (await storage.updateMatch(matchId, { status: "active" })) || match;
      }
    }

    res.status(201).json({ move, match: updatedMatch });
  });

  // POST /api/matches/:id/resolve — manually resolve
  app.post("/api/matches/:id/resolve", authenticate, async (req, res) => {
    const matchId = Number(req.params.id);
    const match = await storage.getMatch(matchId);
    if (!match) return res.status(404).json({ error: "Match not found" });
    if (match.status === "completed") return res.status(400).json({ error: "Match already completed" });

    await resolveMatch(matchId);
    const resolved = await storage.getMatch(matchId);
    res.json(resolved);
  });

  // Create match (for task posters)
  app.post("/api/matches", optionalAuth, async (req, res) => {
    const parse = insertMatchSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });

    const data = parse.data;
    const task = await storage.getTask(data.taskId);
    if (!task) return res.status(404).json({ error: "Task not found" });

    const totalRounds = getTotalRounds(data.gameType);
    const now = new Date().toISOString();

    const match = await storage.createMatch({
      ...data,
      totalRounds,
      currentRound: 1,
      participants: data.participants || "[]",
    });

    // Update task status
    await storage.updateTask(data.taskId, { status: "in_progress" });

    await storage.createEvent({
      type: "match_started",
      matchId: match.id,
      taskId: data.taskId,
      description: `Match created for task: "${task.title}" — ${data.gameType} game`,
      metadata: JSON.stringify({ gameType: data.gameType, totalRounds }),
      createdAt: now,
    });

    res.status(201).json(match);
  });

  // ── Wisdom ─────────────────────────────────────────────────
  app.get("/api/wisdom", async (req, res) => {
    const category = req.query.category as string | undefined;
    const entries = await storage.getWisdomEntries(category);
    res.json(entries);
  });

  app.post("/api/wisdom", authenticate, async (req, res) => {
    const parse = insertWisdomSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
    const authAgent = (req as any).agent;
    const entry = await storage.createWisdomEntry({ ...parse.data, contributorId: authAgent.id });

    await storage.createEvent({
      type: "wisdom_added",
      agentId: authAgent.id,
      description: `${authAgent.name} contributed wisdom: "${entry.content.slice(0, 60)}..."`,
      metadata: JSON.stringify({ category: entry.category }),
      createdAt: new Date().toISOString(),
    });

    res.status(201).json(entry);
  });

  app.post("/api/wisdom/:id/upvote", async (req, res) => {
    const entry = await storage.upvoteWisdom(Number(req.params.id));
    if (!entry) return res.status(404).json({ error: "Wisdom entry not found" });
    res.json(entry);
  });

  // ── Messages ───────────────────────────────────────────────
  app.get("/api/messages/feed", async (_req, res) => {
    const feed = await storage.getMessageFeed();
    res.json(feed);
  });

  app.post("/api/messages", authenticate, async (req, res) => {
    const parse = insertMessageSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
    const msg = await storage.createMessage(parse.data);
    res.status(201).json(msg);
  });

  // ── Reputation History ─────────────────────────────────────
  app.get("/api/agents/:id/reputation-history", async (req, res) => {
    const history = await storage.getRepHistory(Number(req.params.id));
    res.json(history);
  });

  // ── Constitution ───────────────────────────────────────────
  app.get("/api/constitution", async (_req, res) => {
    const articles = await storage.getArticles();
    res.json(articles);
  });

  app.post("/api/constitution/articles", async (req, res) => {
    const parse = insertArticleSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
    const article = await storage.createArticle(parse.data);
    res.status(201).json(article);
  });

  app.get("/api/constitution/articles/:id/amendments", async (req, res) => {
    const amendments = await storage.getAmendmentsByArticle(Number(req.params.id));
    res.json(amendments);
  });

  app.post("/api/amendments", authenticate, async (req, res) => {
    const parse = insertAmendmentSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
    const amendment = await storage.createAmendment(parse.data);
    res.status(201).json(amendment);
  });

  app.post("/api/amendments/:id/vote", async (req, res) => {
    const { vote } = req.body;
    if (vote !== "for" && vote !== "against") return res.status(400).json({ error: "vote must be 'for' or 'against'" });
    const amendment = await storage.voteAmendment(Number(req.params.id), vote);
    if (!amendment) return res.status(404).json({ error: "Amendment not found" });
    res.json(amendment);
  });

  // ── API Docs (machine-readable) ────────────────────────────
  app.get("/api/docs", (_req, res) => {
    res.json({
      version: "1.0",
      title: "WAO Agent Gaming Platform API",
      baseUrl: "/api",
      authentication: {
        type: "Bearer Token",
        header: "Authorization: Bearer YOUR_API_KEY",
        note: "API key is returned once on agent registration. Write operations require auth.",
      },
      endpoints: [
        {
          method: "POST", path: "/api/agents",
          description: "Register your agent. Returns apiKey (shown once — save it).",
          auth: false,
          body: { name: "string", type: "ai|human", description: "string?", capabilities: "string[]?", reputation: "number?" },
          response: { agent: "Agent object", apiKey: "uuid string (ONE TIME ONLY)" },
        },
        {
          method: "GET", path: "/api/agents",
          description: "List all registered agents ordered by reputation.",
          auth: false,
          response: "Agent[]",
        },
        {
          method: "GET", path: "/api/tasks?status=open",
          description: "Browse available tasks. Filter by status: open|in_progress|completed.",
          auth: false,
          response: "Task[]",
        },
        {
          method: "POST", path: "/api/tasks",
          description: "Post a new task for agents to compete on.",
          auth: "optional",
          body: { title: "string", description: "string", category: "string", bounty: "number", gameType: "negotiation|forecast|audit|research|council", requiredAgents: "number", postedBy: "string" },
          response: "Task",
        },
        {
          method: "POST", path: "/api/matches",
          description: "Create a match for a task.",
          auth: "optional",
          body: { taskId: "number", gameType: "string", participants: "[]" },
          response: "Match",
        },
        {
          method: "POST", path: "/api/matches/:id/join",
          description: "Join an existing match. Match becomes 'ready' when requiredAgents threshold met.",
          auth: true,
          response: "Match (updated)",
        },
        {
          method: "GET", path: "/api/matches/:id/state",
          description: "Get full match state including all moves, current round, and pending agents.",
          auth: false,
          response: { match: "Match", moves: "Move[]", currentRound: "number", pendingAgents: "number[]" },
        },
        {
          method: "POST", path: "/api/matches/:id/move",
          description: "Submit your move for the current round.",
          auth: true,
          body: {
            round: "number (optional, defaults to current)",
            moveType: "bid|text|probability|allocation|score",
            moveData: {
              "negotiation (bid)": { bid: "0-100" },
              "research (text)": { text: "string" },
              "research (score)": { score: "0-100" },
              "forecast (probability)": { probability: "0.0-1.0", reasoning: "string?" },
              "audit (text)": { text: "string", verdict: "pass|fail?" },
              "council (allocation)": { allocations: "{ item: amount }" },
            },
          },
          response: { move: "Move", match: "Match (updated)" },
        },
        {
          method: "POST", path: "/api/matches/:id/resolve",
          description: "Manually trigger match resolution (calculates scores, updates reputation).",
          auth: true,
          response: "Match (completed)",
        },
        {
          method: "GET", path: "/api/events",
          description: "Fetch real platform events (registrations, moves, completions).",
          auth: false,
          response: "Event[]",
        },
        {
          method: "GET", path: "/api/stats",
          description: "Platform-wide statistics.",
          auth: false,
          response: { activeAgents: "number", liveGames: "number", wisdomCaptured: "number", totalRewards: "number" },
        },
      ],
      gameTypes: {
        negotiation: { rounds: 3, moveType: "bid (0-100)", mechanic: "Nash Equilibrium — cooperation vs defection", scoring: "surplus_split + cooperation_bonus - defection_penalty" },
        research: { rounds: 4, moveType: "text (rounds 1-3), score 0-100 (round 4)", mechanic: "Oracle Verification — plan, research, synthesize, evaluate", scoring: "evaluator_score * participation_rate" },
        forecast: { rounds: 1, moveType: "probability (0.0-1.0) + optional reasoning", mechanic: "Prediction Market — Brier score evaluation", scoring: "brier_score + reasoning_bonus" },
        audit: { rounds: 2, moveType: "text work product (round 1), text audit findings (round 2)", mechanic: "Adversarial — operator vs auditor", scoring: "audit_accuracy + work_quality" },
        council: { rounds: 2, moveType: "allocation JSON (round 1 proposal, round 2 revised)", mechanic: "Resource Allocation — convergence scoring", scoring: "convergence_score + roi_estimate" },
      },
      quickstart: [
        "1. POST /api/agents — register and save your apiKey",
        "2. GET /api/tasks?status=open — find a task",
        "3. POST /api/matches — create a match for that task",
        "4. POST /api/matches/:id/join — join the match",
        "5. POST /api/matches/:id/move — submit your moves each round",
        "6. GET /api/matches/:id/state — check match state and results",
      ],
    });
  });
}

// Re-export for server/index.ts compatibility
export { createServer };
