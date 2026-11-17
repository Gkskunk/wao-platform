pyenv: cannot rehash: /Users/gregkerr/.pyenv/shims isn't writable
import type { Express, Request } from "express";
import path from "node:path";
import bcrypt from "bcryptjs";
import { mountWorkflow } from "../../packages/wao-core/index.mjs";
import { sqlite, storage } from "./storage";

export function registerWorkspace(app: Express) {
  const workflow = mountWorkflow(app, {
    db: sqlite, assetsDir: path.resolve("../packages/wao-core/public"),
    keyFile: path.resolve(".data/audit-key.pem"), product: "WAO Platform · Workflow Studio", namespace: "platform",
    resources: [
      { title: "WAO platform API", category: "platform", url: "/#/docs", description: "Existing agent registration, task arena, contributions, chat, and proposal API documentation.", checkedAt: "2026-11-09" },
      { title: "Telcoin developer hub", category: "ecosystem", url: "https://telcoin.network/developers-overview/", description: "Official Telcoin application and developer reference starting point.", checkedAt: "2026-11-09" },
      { title: "Telcoin Network documentation", category: "development", url: "https://docs.telcoin.network/", description: "Official network documentation for source-based feasibility work.", checkedAt: "2026-11-09" },
    ],
  });
  sqlite.exec("CREATE TABLE IF NOT EXISTS wf_legacy_identity(user_id TEXT PRIMARY KEY, agent_id INTEGER NOT NULL UNIQUE)");
  async function identity(req: Request) {
    const user = workflow.actor(req);
    if (!user) return null;
    const agentId = sqlite.transaction(() => {
      const existing = sqlite.prepare("SELECT agent_id FROM wf_legacy_identity WHERE user_id=?").get(user.id) as { agent_id: number } | undefined;
      if (existing) return existing.agent_id;
      const result = sqlite.prepare("INSERT INTO agents(name,type,description,capabilities,status) VALUES(?,?,?,?,?)").run(user.username, "human", "Local workspace member", "[]", "active");
      const id = Number(result.lastInsertRowid);
      sqlite.prepare("INSERT INTO wf_legacy_identity VALUES(?,?)").run(user.id, id);
      return id;
    })();
    return { user, agent: await storage.getAgent(agentId) };
  }
  app.get("/api/identity", async (req, res) => {
    const value = await identity(req);
    res.setHeader("Cache-Control", "no-store");
    res.json(value ? { user: value.user, agent: { ...value.agent, apiKeyHash: undefined } } : { user: null, agent: null });
  });
  app.get("/api/health", (_req, res) => res.json({ ok: true, environment: "local", workspace: true, financialActions: false, agentExecution: "mock" }));
  app.use("/api", async (req, res, next) => {
    const current = await identity(req);
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      if (current?.agent) (req as any).agent = current.agent;
      return next();
    }
    let agent = current?.agent;
    if (!agent && req.headers.authorization?.startsWith("Bearer ")) {
      const token = req.headers.authorization.slice(7);
      if (token.length > 200) return res.status(401).json({ error: "Invalid agent key" });
      for (const candidate of await storage.getAgents()) if (candidate.apiKeyHash && await bcrypt.compare(token, candidate.apiKeyHash)) { agent = candidate; break; }
    }
    if (!agent) return res.status(401).json({ error: "Sign in using the account panel or supply an agent API key" });
    (req as Request & { agent: typeof agent }).agent = agent;
    req.body = req.body && typeof req.body === "object" && !Array.isArray(req.body) ? req.body : {};
    // Browser identity comes from the local authenticated session, never request-supplied IDs.
    Object.assign(req.body, { senderId: agent.id, senderName: agent.name, senderType: agent.type, createdBy: agent.id, voterId: agent.id, requesterId: agent.id, proposedBy: agent.id, proposedByName: agent.name, postedBy: agent.name, authorId: agent.id, authorName: agent.name, authorType: agent.type, implementedBy: agent.id });
    if (["/amendments", "/constitution/articles"].includes(req.path)) req.body.proposedBy = agent.name;
    if (req.path.match(/^\/agents\/\d+$/) && req.method === "PATCH") {
      req.body = Object.fromEntries(Object.entries(req.body).filter(([key]) => ["name", "description", "capabilities", "status"].includes(key)));
    }
    if (req.path.match(/^\/tasks\/\d+$/) && req.method === "PATCH") {
      const task = await storage.getTask(Number(req.path.split("/")[2]));
      if (!task || task.postedBy !== agent.name) return res.status(403).json({ error: "Only the task creator may change it" });
      req.body = Object.fromEntries(Object.entries(req.body).filter(([key]) => ["title", "description", "requirements", "acceptanceCriteria", "status"].includes(key)));
    }
    next();
  });
  return { identity };
}
