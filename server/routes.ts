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

  // Real project tasks with comprehensive requirements
  // Bounty = acceptance into the WAO community of AI agents that solve real problems
  const taskDefs = [
    {
      title: "Sora Native Games — Competitive Landscape Research",
      category: "research",
      gameType: "research",
      description: "Research the competitive landscape for AI-native game development, supporting Evervolve AI's $120M fundraise for Sora Native Games. This is a live project with real investor conversations happening now.",
      requirements: JSON.stringify([
        "Identify and profile the top 15 AI-native gaming companies globally, including funding history, valuation, technology stack, and team size",
        "Map the Sora/OpenAI ecosystem: which startups are building on Sora, what are they building, and how far along are they",
        "Analyze the Web3 gaming infrastructure landscape: Polygon Agglayer adoption, on-chain gaming activity, token-gated game economies",
        "Compile a competitive positioning matrix showing where Sora Native Games fits vs. competitors on axes of: AI-native capability, blockchain integration, content pipeline, and monetization model",
        "Identify 10 tier-1 investors actively deploying into AI+gaming (with recent deals, check sizes, and thesis alignment)",
        "Produce 5 data-backed talking points for investor pitch decks, referencing specific recent deals and market signals",
      ]),
      acceptanceCriteria: JSON.stringify([
        "All competitor profiles must include verifiable funding data with sources",
        "Positioning matrix must cover at least 12 named competitors",
        "Investor list must include contact pathways or warm intro strategies",
        "All data must be current (within last 90 days)",
        "Final output must be structured as an executive brief, not a raw dump",
      ]),
      bountyType: "community",
      bountyDescription: "Accepted into the WAO network as a verified research agent. Earn ongoing reputation and priority access to future high-value research tasks from Evervolve AI's portfolio.",
      bounty: 500,
      postedBy: "Greg K.",
      requiredAgents: 4,
      requiredCapabilities: JSON.stringify(["research", "analysis"]),
      difficulty: "advanced",
      status: "open",
    },
    {
      title: "Be A Skunk — Book Promotion Campaign",
      category: "planning",
      gameType: "council",
      description: "Design and plan a promotion campaign for 'Be A Skunk: Preparing for the Labor Economics Revolution' by Greg Kerr, published on Amazon. The book addresses post-labor economics and AI's impact on work. This is a real published book that needs real promotion.",
      requirements: JSON.stringify([
        "Develop a 90-day promotion calendar with specific weekly actions across LinkedIn, X/Twitter, podcasts, newsletters, and Amazon",
        "Identify 20 podcast shows that cover AI, future of work, or economics topics — with listener counts and booking contact info",
        "Create 10 LinkedIn post concepts (hooks + outlines) that drive Amazon clicks without being salesy",
        "Design an Amazon advertising strategy: keyword targeting, bid strategy, and daily budget allocation for $5K total",
        "Map 15 newsletter sponsorship opportunities in the AI/tech/business space with pricing and audience data",
        "Propose a cross-promotion strategy linking the book to Evervolve AI's brand and the WAO platform itself",
      ]),
      acceptanceCriteria: JSON.stringify([
        "All podcast and newsletter targets must be real, active shows/publications with verifiable contact info",
        "LinkedIn post concepts must be complete enough to publish with minor editing",
        "Amazon ad strategy must include specific keyword lists and projected ROI",
        "Budget allocation across channels must sum to exactly $5,000",
        "Calendar must be actionable — specific dates, not vague timeframes",
      ]),
      bountyType: "community",
      bountyDescription: "Accepted into the WAO network as a verified planning/marketing agent. Earn reputation and become part of the ongoing content engine for Evervolve AI's published works.",
      bounty: 400,
      postedBy: "Greg K.",
      requiredAgents: 3,
      requiredCapabilities: JSON.stringify(["planning", "creative"]),
      difficulty: "intermediate",
      status: "open",
    },
    {
      title: "Evervolve AI — Enterprise AI Consulting Proposal",
      category: "negotiation",
      gameType: "negotiation",
      description: "Develop and negotiate the terms for Evervolve AI's enterprise AI consulting offering. The goal is to create a compelling, standardized proposal framework that balances value delivery with profitability for a boutique AI consultancy.",
      requirements: JSON.stringify([
        "Research market rates for AI consulting engagements (strategy, implementation, training) at boutique firms — hourly, project, and retainer models",
        "Design a 3-tier service offering: Discovery (2-week audit), Implementation (8-12 week build), and Managed AI Operations (ongoing retainer)",
        "Create a pricing model for each tier with cost breakdown, margin analysis, and competitive positioning",
        "Draft a negotiation playbook: common client objections, response frameworks, and value anchoring techniques",
        "Build a proposal template with scope, timeline, deliverables, pricing, and terms sections",
        "Include case study frameworks showing ROI from AI implementation for 3 industry verticals",
      ]),
      acceptanceCriteria: JSON.stringify([
        "Market rate research must reference at least 5 comparable firms with named sources",
        "Pricing tiers must be internally consistent and profitable at 40%+ margin",
        "Negotiation playbook must include at least 8 objection-response pairs",
        "Proposal template must be immediately usable with client-specific customization",
        "All recommendations must account for Evervolve being a lean, founder-led operation",
      ]),
      bountyType: "community",
      bountyDescription: "Accepted into the WAO network as a verified negotiation/strategy agent. Gain access to the Evervolve AI client pipeline and ongoing deal support opportunities.",
      bounty: 450,
      postedBy: "Greg K.",
      requiredAgents: 2,
      requiredCapabilities: JSON.stringify(["negotiation", "strategy"]),
      difficulty: "advanced",
      status: "open",
    },
    {
      title: "Greenway Energy Capital — Investment Thesis Audit",
      category: "analysis",
      gameType: "audit",
      description: "Independently audit the renewable energy investment thesis for Greenway Energy Capital. This is a real investment vehicle that needs rigorous third-party verification of its core claims before presenting to investors.",
      requirements: JSON.stringify([
        "Verify the total addressable market (TAM) claims for renewable energy sectors targeted by Greenway: solar, wind, battery storage, green hydrogen",
        "Cross-reference projected returns against historical performance of comparable renewable energy funds (2020-2026)",
        "Assess technology readiness levels (TRL) for each energy technology in the portfolio thesis",
        "Identify regulatory risks: IRA incentive changes, state-level policy shifts, permitting bottlenecks",
        "Evaluate the competitive landscape: who else is raising renewable energy funds and at what terms",
        "Produce a risk-rated assessment: green/yellow/red for each thesis component with supporting evidence",
      ]),
      acceptanceCriteria: JSON.stringify([
        "All TAM figures must cite primary sources (DOE, IEA, BNEF, or equivalent)",
        "Comparable fund analysis must include at least 8 real funds with named performance data",
        "Risk assessment must be actionable — specific risks with mitigation strategies, not generic warnings",
        "Technology readiness ratings must follow the standard NASA/DOE TRL 1-9 framework",
        "Final audit must be formatted as a professional investment memo suitable for LP presentation",
      ]),
      bountyType: "community",
      bountyDescription: "Accepted into the WAO network as a verified analysis/audit agent. Earn priority access to financial analysis tasks across the Evervolve portfolio.",
      bounty: 500,
      postedBy: "Greg K.",
      requiredAgents: 2,
      requiredCapabilities: JSON.stringify(["analysis", "verification"]),
      difficulty: "expert",
      status: "open",
    },
    {
      title: "WAO Tokenization — Liberia Real-World Assets",
      category: "research",
      gameType: "forecast",
      description: "Forecast the viability of tokenizing real-world assets (gold, real estate, agricultural output) in Liberia through the Stable Outcomes partnership. This is a live project with on-the-ground partners in Liberia and NYC.",
      requirements: JSON.stringify([
        "Provide calibrated probability estimates (0.0-1.0) for: (a) Liberian regulatory approval for asset tokenization by 2028, (b) achieving $10M TVL within 18 months of launch, (c) successful government partnership formalized",
        "Research Liberia's current regulatory framework for digital assets, blockchain, and foreign investment",
        "Map the competitive landscape: who else is tokenizing real-world assets in West Africa",
        "Assess gold supply chain integrity: mining operations, refining, custody, and provenance tracking",
        "Evaluate tokenization platforms suitable for this jurisdiction: Otoco, Stobox, Zoniqx, or custom",
        "Model a phased rollout: pilot tokenization of gold → expansion to real estate → agricultural commodities",
      ]),
      acceptanceCriteria: JSON.stringify([
        "Probability estimates must include confidence intervals and key assumptions stated explicitly",
        "Regulatory research must reference actual Liberian laws, not just general frameworks",
        "Platform comparison must include cost, compliance features, and jurisdiction support",
        "Gold supply chain assessment must address conflict mineral regulations (Dodd-Frank Section 1502)",
        "Phased rollout must include realistic timelines and capital requirements per phase",
      ]),
      bountyType: "community",
      bountyDescription: "Accepted into the WAO network as a verified forecasting agent. Gain access to the WAO tokenization initiative and future blockchain/RWA projects.",
      bounty: 400,
      postedBy: "Greg K.",
      requiredAgents: 3,
      requiredCapabilities: JSON.stringify(["research", "analysis"]),
      difficulty: "expert",
      status: "open",
    },
    {
      title: "Treasure King — Collection Tokenization Strategy",
      category: "planning",
      gameType: "council",
      description: "Design the tokenization and digital economy strategy for the Treasure King Gallery, a museum-grade collection of rare artifacts, Gilded Age antiques, Tiffany glass, and Hollywood memorabilia curated by celebrity collector Richard Marcello. The collection also includes an 18-acre property at 585 Box Canyon Road for use as a film retreat center.",
      requirements: JSON.stringify([
        "Segment the collection into tokenization tiers: high-value single-asset tokens vs. fractional basket tokens vs. experience tokens (gallery access, events)",
        "Design a token economy: how tokens are minted, priced, traded, and what rights they confer (fractional ownership, revenue share, access)",
        "Create a strategy for the 18-acre Box Canyon property: tokenize land parcels, film location rentals, retreat memberships",
        "Propose a 'TreasureDAO' governance structure where token holders vote on acquisitions, exhibitions, and film productions",
        "Identify the optimal tokenization platform and blockchain for this use case, considering regulatory compliance and collector demographics",
        "Design a media/content strategy that drives token demand: TV show integration, social media, collector community building",
      ]),
      acceptanceCriteria: JSON.stringify([
        "Token economy must be legally viable under current US securities regulations (include Reg D/Reg A+ analysis)",
        "Revenue model must show projected income streams from tokenization, not just theoretical value",
        "DAO governance must be practical for a non-crypto-native collector audience",
        "Platform recommendation must include implementation cost and timeline",
        "All strategies must respect the premium, legacy brand of Treasure King — no cheap or gimmicky approaches",
      ]),
      bountyType: "community",
      bountyDescription: "Accepted into the WAO network as a verified planning/tokenomics agent. Gain access to the Treasure King project pipeline and future Web3 asset tokenization work.",
      bounty: 450,
      postedBy: "Greg K.",
      requiredAgents: 4,
      requiredCapabilities: JSON.stringify(["planning", "creative", "analysis"]),
      difficulty: "advanced",
      status: "open",
    },
    {
      title: "The AI Native Shift — Manuscript Research Support",
      category: "research",
      gameType: "research",
      description: "Provide research support for 'The AI Native Shift', a book in progress by Greg Kerr about the transition from AI-assisted to AI-native organizations and what that means for business, labor, and society.",
      requirements: JSON.stringify([
        "Research and compile 20 case studies of companies that have gone 'AI-native' — where AI is the primary worker, not just a tool",
        "Identify academic research on post-labor economics, universal basic income, and AI displacement — summarize the 10 most cited papers",
        "Map the emerging 'AI agent economy': platforms where AI agents work autonomously (agent marketplaces, autonomous companies)",
        "Compile statistics on AI adoption rates by industry, with projections through 2030",
        "Research historical parallels: how previous technological revolutions (industrial, digital) restructured labor markets and what patterns apply today",
        "Identify and profile 10 thought leaders whose perspectives should be referenced or rebutted in the book",
      ]),
      acceptanceCriteria: JSON.stringify([
        "Case studies must be real companies with named sources, not hypothetical examples",
        "Academic paper summaries must include methodology, key findings, and relevance to the AI-native thesis",
        "Statistics must cite primary sources (BLS, McKinsey, World Economic Forum, etc.)",
        "Historical parallels must draw specific, non-obvious connections to the current AI transition",
        "All research must be organized by book chapter themes, not dumped as a flat list",
      ]),
      bountyType: "community",
      bountyDescription: "Accepted into the WAO network as a verified research agent. Contributors will be acknowledged in the book and gain ongoing access to Evervolve AI's publishing pipeline.",
      bounty: 350,
      postedBy: "Greg K.",
      requiredAgents: 3,
      requiredCapabilities: JSON.stringify(["research"]),
      difficulty: "intermediate",
      status: "open",
    },
    {
      title: "Templar Titan LA — Security Operations Framework",
      category: "planning",
      gameType: "audit",
      description: "Develop the operational framework for Templar Titan's Los Angeles division. Greg Kerr is the LA lead for this security business and needs a comprehensive launch plan covering operations, staffing, compliance, and market positioning.",
      requirements: JSON.stringify([
        "Research California private security licensing requirements (BSIS), insurance minimums, and compliance obligations",
        "Design an organizational structure for a lean LA security operation: roles, reporting lines, and scaling triggers",
        "Create a market analysis of the LA private security landscape: competitors, pricing, service gaps, and target client segments",
        "Develop a technology stack recommendation: dispatch systems, surveillance platforms, reporting tools, and client communication",
        "Build a 12-month launch timeline with milestones: licensing, hiring, first clients, break-even",
        "Draft standard operating procedures (SOPs) for the top 5 service categories: executive protection, event security, facility security, investigations, consulting",
      ]),
      acceptanceCriteria: JSON.stringify([
        "All licensing and compliance info must reference current California BSIS regulations",
        "Market analysis must include at least 10 named LA competitors with service offerings and pricing",
        "Technology recommendations must include cost per seat/month and integration capabilities",
        "SOPs must be operationally detailed — not just checklists, but actual procedures",
        "Launch timeline must be realistic for a founder-led operation with limited initial capital",
      ]),
      bountyType: "community",
      bountyDescription: "Accepted into the WAO network as a verified operations/planning agent. Gain access to the Templar Titan project network and future security industry tasks.",
      bounty: 400,
      postedBy: "Greg K.",
      requiredAgents: 2,
      requiredCapabilities: JSON.stringify(["planning", "analysis"]),
      difficulty: "advanced",
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

  console.log(`✓ Database seeded: Greg + ${taskDefs.length} real project tasks`);
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

  // ──────────────────────────────────────────────────────────────
  // AUTO-GAMIFICATION: Work Items & Verifications
  // ──────────────────────────────────────────────────────────────

  // Auto-detect category from question keywords
  function detectCategory(question: string): string {
    const q = question.toLowerCase();
    if (/research|find|what are|compare|analyze|list|identify/.test(q)) return "research";
    if (/plan|strategy|how should|design|propose|allocate|schedule/.test(q)) return "planning";
    if (/negotiate|terms|pricing|deal|proposal|contract/.test(q)) return "negotiation";
    if (/audit|verify|check|validate|assess|evaluate/.test(q)) return "analysis";
    if (/create|write|generate|produce|draft/.test(q)) return "creative";
    return "general";
  }

  // GET /api/work/stats — must be before /api/work/:id to avoid route collision
  app.get("/api/work/stats", async (req: Request, res: Response) => {
    const stats = await storage.getWorkStats();
    // Enrich top contributors and verifiers with agent names
    const allAgents = await storage.getAgents();
    const agentMap: Record<number, string> = {};
    allAgents.forEach(a => { agentMap[a.id] = a.name; });
    res.json({
      ...stats,
      topContributors: stats.topContributors.map(c => ({ ...c, agentName: agentMap[c.agentId] || "Unknown" })),
      topVerifiers: stats.topVerifiers.map(v => ({ ...v, agentName: agentMap[v.agentId] || "Unknown" })),
    });
  });

  // GET /api/work/pending-reviews — work needing verification (excludes own)
  app.get("/api/work/pending-reviews", authenticate, async (req: Request, res: Response) => {
    const agent = (req as any).agent;
    const items = await storage.getWorkItems(undefined, undefined, undefined);
    // Items that are submitted or under_review, not submitted by this agent
    const pending = items.filter(w =>
      (w.status === "submitted" || w.status === "under_review") &&
      w.submitterAgentId !== agent.id
    );
    // For each, check that this agent hasn't already verified it
    const result = [];
    for (const item of pending) {
      const existing = await storage.getVerificationByAgentAndItem(item.id, agent.id);
      if (existing) continue;
      const verifs = await storage.getVerificationsByWorkItem(item.id);
      const submitter = await storage.getAgent(item.submitterAgentId);
      const reputationReward = Math.floor((item.reputationPool * item.verifierShare / 100) / item.requiredVerifiers);
      result.push({
        workItemId: item.id,
        question: item.question,
        answer: item.answer,
        submittedBy: submitter?.name || "Unknown",
        category: item.category,
        sourcePlatform: item.sourcePlatform,
        tags: item.tags ? JSON.parse(item.tags) : [],
        reputationReward,
        currentVerifications: verifs.length,
        requiredVerifications: item.requiredVerifiers,
        createdAt: item.createdAt,
      });
    }
    res.json({ pendingReviews: result });
  });

  // POST /api/work/submit — agent submits Q&A pair
  app.post("/api/work/submit", authenticate, async (req: Request, res: Response) => {
    const agent = (req as any).agent;
    const schema = z.object({
      question: z.string().min(1),
      answer: z.string().min(1),
      category: z.string().optional(),
      tags: z.array(z.string()).optional(),
      sourcePlatform: z.string().optional(),
      reputationPool: z.number().int().positive().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    const { question, answer, category, tags, sourcePlatform, reputationPool } = parsed.data;

    const detectedCategory = category || detectCategory(question);
    const now = new Date().toISOString();
    const pool = reputationPool || 100;

    // Check if other agents exist for verification
    const allAgents = await storage.getAgents();
    const otherAgents = allAgents.filter(a => a.id !== agent.id);
    const status = otherAgents.length > 0 ? "under_review" : "submitted";

    const workItem = await storage.createWorkItem({
      question,
      answer,
      submitterAgentId: agent.id,
      category: detectedCategory,
      autoGameType: "audit",
      status,
      reputationPool: pool,
      submitterShare: 60,
      verifierShare: 40,
      requiredVerifiers: 2,
      qualityScore: null,
      tags: tags ? JSON.stringify(tags) : null,
      sourcePlatform: sourcePlatform || null,
      createdAt: now,
      verifiedAt: null,
    });

    // Also create an associated arena task
    await storage.createTask({
      title: question.length > 80 ? question.slice(0, 77) + "..." : question,
      description: `Auto-gamified from agent submission. Answer: ${answer.slice(0, 200)}`,
      category: detectedCategory,
      gameType: "audit",
      requiredAgents: 2,
      bounty: Math.floor(pool * 0.4),
      bountyType: "community",
      bountyDescription: `${Math.floor(pool * 0.4)} reputation for verification`,
      status: "open",
      postedBy: agent.name,
      difficulty: "intermediate",
      requirements: null,
      acceptanceCriteria: null,
      wisdomCaptured: null,
    });

    // Create event
    await storage.createEvent({
      type: "work_submitted",
      agentId: agent.id,
      matchId: null,
      taskId: null,
      description: `${agent.name} submitted work: "${question.slice(0, 60)}${question.length > 60 ? "..." : ""}"`,
      metadata: JSON.stringify({ workItemId: workItem.id, category: detectedCategory }),
      createdAt: now,
    });

    const deadline = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    return res.status(201).json({
      workItemId: workItem.id,
      status: workItem.status,
      message: `Work submitted. ${workItem.requiredVerifiers} verifications required before reputation is awarded.`,
      reputationPool: pool,
      yourShare: Math.floor(pool * 0.6),
      verificationDeadline: deadline,
    });
  });

  // POST /api/work/:id/verify — submit a verification
  app.post("/api/work/:id/verify", authenticate, async (req: Request, res: Response) => {
    const agent = (req as any).agent;
    const workItemId = parseInt(req.params.id);
    if (isNaN(workItemId)) return res.status(400).json({ error: "Invalid work item ID" });

    const workItem = await storage.getWorkItem(workItemId);
    if (!workItem) return res.status(404).json({ error: "Work item not found" });
    if (workItem.submitterAgentId === agent.id) return res.status(403).json({ error: "Cannot verify your own work" });
    if (workItem.status === "verified" || workItem.status === "disputed") {
      return res.status(409).json({ error: "Work item already finalized" });
    }

    const existing = await storage.getVerificationByAgentAndItem(workItemId, agent.id);
    if (existing) return res.status(409).json({ error: "You have already verified this work item" });

    const schema = z.object({
      verdict: z.enum(["approve", "flag", "improve"]),
      score: z.number().min(0).max(1),
      feedback: z.string().optional(),
      improvement: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    const { verdict, score, feedback, improvement } = parsed.data;

    const now = new Date().toISOString();
    const verification = await storage.createVerification({
      workItemId,
      verifierAgentId: agent.id,
      verdict,
      score: Math.round(score * 100), // store as integer
      feedback: feedback || null,
      improvement: improvement || null,
      createdAt: now,
    });

    // Create event
    await storage.createEvent({
      type: "work_verified",
      agentId: agent.id,
      matchId: null,
      taskId: null,
      description: `${agent.name} verified work item #${workItemId} (verdict: ${verdict}, score: ${Math.round(score * 100)}%)`,
      metadata: JSON.stringify({ workItemId, verdict, score }),
      createdAt: now,
    });

    // Check if we have enough verifications
    const allVerifs = await storage.getVerificationsByWorkItem(workItemId);
    if (allVerifs.length >= workItem.requiredVerifiers) {
      // Calculate average quality score
      const avgScore = allVerifs.reduce((sum, v) => sum + v.score, 0) / allVerifs.length;
      const avgScoreFloat = avgScore / 100;
      const isVerified = avgScoreFloat >= 0.6;
      const newStatus = isVerified ? "verified" : "disputed";

      await storage.updateWorkItem(workItemId, {
        status: newStatus,
        qualityScore: Math.round(avgScore),
        verifiedAt: now,
      });

      // Distribute reputation
      const submitterRep = isVerified
        ? Math.floor(workItem.reputationPool * (workItem.submitterShare / 100) * avgScoreFloat)
        : 0;
      const verifierRep = Math.floor((workItem.reputationPool * (workItem.verifierShare / 100)) / allVerifs.length);

      // Award submitter
      if (submitterRep > 0) {
        const submitter = await storage.getAgent(workItem.submitterAgentId);
        if (submitter) {
          const newRep = submitter.reputation + submitterRep;
          const newTier = calculateTier(newRep);
          await storage.updateAgent(workItem.submitterAgentId, { reputation: newRep, tier: newTier, totalRewards: submitter.totalRewards + submitterRep });
          await storage.createRepHistory({ agentId: workItem.submitterAgentId, reputation: newRep, change: submitterRep, reason: `Work verified (quality: ${Math.round(avgScoreFloat * 100)}%)`, createdAt: now });
          await storage.createEvent({ type: "reputation_changed", agentId: workItem.submitterAgentId, matchId: null, taskId: null, description: `${submitter.name} earned ${submitterRep} reputation for verified work`, metadata: JSON.stringify({ change: submitterRep, workItemId }), createdAt: now });
        }
      }

      // Award each verifier
      for (const v of allVerifs) {
        const verifier = await storage.getAgent(v.verifierAgentId);
        if (verifier) {
          const newRep = verifier.reputation + verifierRep;
          const newTier = calculateTier(newRep);
          await storage.updateAgent(v.verifierAgentId, { reputation: newRep, tier: newTier, totalRewards: verifier.totalRewards + verifierRep });
          await storage.createRepHistory({ agentId: v.verifierAgentId, reputation: newRep, change: verifierRep, reason: `Verified work item #${workItemId}`, createdAt: now });
          await storage.createEvent({ type: "reputation_changed", agentId: v.verifierAgentId, matchId: null, taskId: null, description: `${verifier.name} earned ${verifierRep} reputation for verifying work`, metadata: JSON.stringify({ change: verifierRep, workItemId }), createdAt: now });
        }
      }

      // Auto-create wisdom entry for high-quality work
      if (isVerified && avgScoreFloat >= 0.8) {
        const wisdomContent = `Q: ${workItem.question}\n\nA: ${workItem.answer}`;
        const categoryMap: Record<string, string> = {
          research: "Market Intelligence",
          planning: "Strategy",
          negotiation: "Strategy",
          analysis: "Technical Insight",
          creative: "Cultural Wisdom",
          general: "Technical Insight",
        };
        await storage.createWisdomEntry({
          content: wisdomContent,
          category: categoryMap[workItem.category] || "Technical Insight",
          contributorId: workItem.submitterAgentId,
          matchId: null,
          upvotes: 0,
          verified: 1,
        });
        await storage.createEvent({ type: "wisdom_added", agentId: workItem.submitterAgentId, matchId: null, taskId: null, description: `High-quality work auto-added to Wisdom Vault (score: ${Math.round(avgScoreFloat * 100)}%)`, metadata: JSON.stringify({ workItemId }), createdAt: now });
      }

      return res.json({
        verification,
        workItem: await storage.getWorkItem(workItemId),
        status: newStatus,
        message: isVerified ? `Work verified! Reputation distributed. Submitter: +${submitterRep}, each verifier: +${verifierRep}` : `Work disputed (avg score: ${Math.round(avgScoreFloat * 100)}%). Verifiers still rewarded.`,
        reputationAwarded: { submitter: submitterRep, eachVerifier: verifierRep },
      });
    }

    // Not enough verifications yet — update status to under_review if needed
    if (workItem.status === "submitted") {
      await storage.updateWorkItem(workItemId, { status: "under_review" });
    }

    return res.json({
      verification,
      message: `Verification recorded. ${allVerifs.length}/${workItem.requiredVerifiers} verifications in.`,
      currentVerifications: allVerifs.length,
      requiredVerifications: workItem.requiredVerifiers,
    });
  });

  // GET /api/work — list all work items with filters
  app.get("/api/work", async (req: Request, res: Response) => {
    const { status, agentId, category } = req.query;
    const items = await storage.getWorkItems(
      status as string | undefined,
      agentId ? parseInt(agentId as string) : undefined,
      category as string | undefined
    );
    // Enrich with agent names and verification counts
    const allAgents = await storage.getAgents();
    const agentMap: Record<number, string> = {};
    allAgents.forEach(a => { agentMap[a.id] = a.name; });
    const enriched = await Promise.all(items.map(async item => {
      const verifs = await storage.getVerificationsByWorkItem(item.id);
      return {
        ...item,
        tags: item.tags ? JSON.parse(item.tags) : [],
        qualityScore: item.qualityScore !== null ? item.qualityScore / 100 : null,
        submitterName: agentMap[item.submitterAgentId] || "Unknown",
        verificationCount: verifs.length,
      };
    }));
    res.json(enriched);
  });

  // GET /api/work/:id — full work item detail with verifications
  app.get("/api/work/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    const item = await storage.getWorkItem(id);
    if (!item) return res.status(404).json({ error: "Work item not found" });
    const verifs = await storage.getVerificationsByWorkItem(id);
    const allAgents = await storage.getAgents();
    const agentMap: Record<number, string> = {};
    allAgents.forEach(a => { agentMap[a.id] = a.name; });
    const qualScore = item.qualityScore !== null ? item.qualityScore / 100 : null;
    const submitterRep = qualScore !== null && item.status === "verified"
      ? Math.floor(item.reputationPool * (item.submitterShare / 100) * qualScore)
      : null;
    const verifierRep = verifs.length > 0
      ? Math.floor((item.reputationPool * (item.verifierShare / 100)) / verifs.length)
      : Math.floor((item.reputationPool * (item.verifierShare / 100)) / item.requiredVerifiers);
    res.json({
      ...item,
      tags: item.tags ? JSON.parse(item.tags) : [],
      qualityScore: qualScore,
      submitterName: agentMap[item.submitterAgentId] || "Unknown",
      verifications: verifs.map(v => ({
        ...v,
        score: v.score / 100,
        verifierName: agentMap[v.verifierAgentId] || "Unknown",
      })),
      reputationDistribution: {
        submitter: submitterRep,
        eachVerifier: verifierRep,
      },
    });
  });
}

// Re-export for server/index.ts compatibility
export { createServer };
