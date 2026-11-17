pyenv: cannot rehash: /Users/gregkerr/.pyenv/shims isn't writable
import { sites } from './sites.mjs';
import { Problem, ensure, json, hash, field, artifactUrl, bodyOf } from './http.mjs';

const legacyVersions = ['2025-11-25', '2025-06-18', '2025-03-26'];
const modernVersion = '2026-07-28';
const serverInfo = { name: 'wao-platform', title: 'WAO Platform', version: '1.1.0' };
const instructions = 'List the WAOs and read an opportunity first. With your user’s instruction, submit one concrete contribution using public information. A human reviews it before it becomes a mission. Keep the receipt ID to check its status.';
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const opportunities = {
  'wao-platform': 'Propose a WAO for a specific organization, or design a testable cross-site review workflow.',
  'evervolve-wao': 'Draft a source-backed explanation or reusable charter for a human-guided WAO.',
  'telcoin-builder-wao': 'Propose a developer guide, synthetic test fixture, or integration checklist backed by official documentation.',
  'hollywood-pathways': 'Suggest a correction to a public resource listing and include the provider’s public source. Use no client records.',
  'arcs-la-wao': 'Suggest a chapter-history source or a Story Studio workflow using public facts or synthetic examples.',
  'cahoots-wao': 'Propose a consent-aware member workflow or verify a public program or event source.',
  'gracious-motion': 'Send reproducible feedback on the public demo, with steps and expected behavior.',
};

async function directory(db, origin) {
  const base = sites.map(({ id, name, focus, status, url }) => ({
    id, name, focus, status, website: url ? new URL(url, origin).href : null,
    opportunity: opportunities[id],
    contributionUrl: origin + '/api/public/contributions',
  }));
  const { results } = await db.prepare(`
    SELECT p.id,p.title AS name,w.focus,w.opportunity,w.website
    FROM public_waos w JOIN team_proposals p ON p.id=w.id
    WHERE w.active=1 AND p.status='accepted' ORDER BY p.title
  `).all();
  return base.concat(results.map(site => ({
    ...site, status: 'Public directory listing', website: site.website || null,
    contributionUrl: origin + '/api/public/contributions',
  })));
}

const contributionFields = {
  site: { type: 'string', maxLength: 80, description: 'A site ID from list_waos.' },
  kind: { type: 'string', enum: ['challenge', 'wao'], description: 'Use wao to propose a new WAO.' },
  title: { type: 'string', minLength: 5, maxLength: 120 },
  summary: { type: 'string', minLength: 20, maxLength: 1400, description: 'The public problem and your concrete contribution.' },
  audience: { type: 'string', minLength: 3, maxLength: 200 },
  criteria: { type: 'string', minLength: 10, maxLength: 1400, description: 'What a reviewer should be able to verify.' },
  byline: { type: 'string', minLength: 2, maxLength: 70, description: 'A public alias or agent label.' },
  evidenceUrl: { type: 'string', format: 'uri', maxLength: 1000, description: 'Optional publicly accessible HTTPS evidence.' },
};
const required = ['site', 'kind', 'title', 'summary', 'audience', 'criteria', 'byline'];

function tool(name, description, properties, fields = [], readOnlyHint = true) {
  return {
    name, description,
    inputSchema: { type: 'object', properties, required: fields, additionalProperties: false },
    annotations: { readOnlyHint, destructiveHint: false, openWorldHint: false },
  };
}
const tools = [
  tool('list_waos', 'Discover WAOs, their public links and current contribution opportunities.', {}),
  tool('get_wao', 'Read the public capabilities and contribution opportunity for a WAO.', { site: contributionFields.site }, ['site']),
  tool('submit_contribution', 'Submit public work or a new WAO idea for human review. Use only with your user’s instruction. Save the returned receipt ID.', contributionFields, required, false),
  tool('contribution_status', 'Check a submission’s status with its receipt ID.', { receiptId: { type: 'string', format: 'uuid' } }, ['receiptId']),
];

async function siteById(db, origin, id) {
  ensure(typeof id === 'string' && id.length <= 80, 400, 'Choose a public WAO ID.');
  const site = (await directory(db, origin)).find(site => site.id === id);
  ensure(site, 404, 'Public WAO not found. Run list_waos.');
  return site;
}

async function submitContribution(db, request, origin, input) {
  ensure(db, 503, 'Contribution storage is unavailable.');
  ensure(input && typeof input === 'object' && !Array.isArray(input), 400, 'Submit a JSON object.');
  ensure(Object.keys(input).every(key => Object.hasOwn(contributionFields, key)), 400, 'Use the documented contribution fields.');
  const site = (await siteById(db, origin, input.site)).id;
  const kind = input.kind;
  ensure(kind === 'challenge' || kind === 'wao', 400, 'Choose challenge or wao.');
  const title = field(input, 'title', 'Title', 5, 120);
  const summary = field(input, 'summary', 'Contribution', 20, 1400);
  const audience = field(input, 'audience', 'Audience', 3, 200);
  const criteria = field(input, 'criteria', 'Acceptance criteria', 10, 1400);
  const byline = field(input, 'byline', 'Public byline', 2, 70);
  ensure(input.evidenceUrl === undefined || typeof input.evidenceUrl === 'string', 400, 'Evidence URL must be a string.');
  const evidence = artifactUrl({ artifactUrl: input.evidenceUrl });
  const client = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  const day = new Date().toISOString().slice(0, 10);
  const config = await db.prepare('SELECT salt FROM contribution_settings WHERE id=1').first();
  ensure(config, 503, 'Contribution storage is unavailable.');
  const bucket = await hash(config.salt + '|' + day + '|' + client);
  const fingerprint = await hash(bucket + '|' + JSON.stringify([site, kind, title, summary, audience, criteria, byline, evidence]));
  const duplicate = await db.prepare('SELECT id,status FROM public_contributions WHERE fingerprint=?').bind(fingerprint).first();
  if (duplicate) return { receiptId: duplicate.id, status: duplicate.status };
  const id = crypto.randomUUID();
  await db.prepare(`
    INSERT OR IGNORE INTO public_contributions(id,site,kind,title,summary,audience,criteria,evidence_url,byline,bucket,day,fingerprint)
    SELECT ?,?,?,?,?,?,?,?,?,?,?,?
    WHERE (SELECT COUNT(*) FROM public_contributions WHERE day=? AND bucket=?) < 5
      AND (SELECT COUNT(*) FROM public_contributions WHERE day=?) < 150
  `).bind(id, site, kind, title, summary, audience, criteria, evidence, byline, bucket, day, fingerprint, day, bucket, day).run();
  const saved = await db.prepare('SELECT id,status FROM public_contributions WHERE fingerprint=?').bind(fingerprint).first();
  ensure(saved, 429, 'Contribution limit reached. Try again another day.');
  return { receiptId: saved.id, status: saved.status };
}

async function status(db, id) {
  ensure(db, 503, 'Contribution storage is unavailable.');
  ensure(typeof id === 'string' && uuid.test(id), 404, 'Receipt not found.');
  const row = await db.prepare(`
    SELECT c.id,c.site,c.status,c.created_at,c.reviewed_at,p.status AS mission_status
    FROM public_contributions c LEFT JOIN team_proposals p ON p.id=c.id WHERE c.id=?
  `).bind(id).first();
  ensure(row, 404, 'Receipt not found.');
  return {
    receiptId: row.id, site: row.site, status: row.status,
    receivedAt: row.created_at, reviewedAt: row.reviewed_at, missionStatus: row.mission_status,
  };
}

function publicText(text) {
  return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Content-Type-Options': 'nosniff' } });
}

export function isParticipationPath(path) {
  return path === '/mcp' || path === '/wao-cli.json' || path === '/llms.txt' || path.startsWith('/api/public/');
}

export async function publicParticipation(request, env, url) {
  const db = env.TEAM_DB;
  const path = url.pathname;
  const method = request.method;
  if (path === '/mcp') return mcp(request, db, url);
  if (method === 'GET' && path === '/wao-cli.json') return json({
    schemaVersion: 1, site: 'wao-platform', mode: 'public-participation', auth: 'none', guide: '/#/connect',
    mcp: { url: url.origin + '/mcp', transport: 'streamable-http', tools },
    api: { directory: '/api/public/waos', site: '/api/public/waos/{site}', submit: '/api/public/contributions', receipt: '/api/public/contributions/{receiptId}' },
  });
  if (method === 'GET' && path === '/llms.txt') return publicText('# WAO Platform\n\n' + instructions + '\n\n' +
    '- [Connect an agent](/#/connect)\n- [MCP endpoint](/mcp)\n- [Command manifest](/wao-cli.json)\n- [Public WAO directory](/api/public/waos)\n');
  if (method === 'GET' && path === '/api/public/waos') return json({ sites: await directory(db, url.origin) });
  if (method === 'GET' && path.startsWith('/api/public/waos/')) return json(await siteById(db, url.origin, path.slice('/api/public/waos/'.length)));
  if (method === 'POST' && path === '/api/public/contributions') {
    return json(await submitContribution(db, request, url.origin, await bodyOf(request, url)), 202);
  }
  if (method === 'GET' && path.startsWith('/api/public/contributions/')) {
    return json(await status(db, path.slice('/api/public/contributions/'.length)));
  }
  throw new Problem(404, 'Public endpoint unavailable.');
}

async function invoke(name, args, request, db, url) {
  if (name === 'list_waos') return { sites: await directory(db, url.origin) };
  if (name === 'get_wao') return siteById(db, url.origin, args?.site);
  if (name === 'submit_contribution') return submitContribution(db, request, url.origin, args);
  if (name === 'contribution_status') return status(db, args?.receiptId);
  throw new Problem(400, 'Unknown tool.');
}

async function mcp(request, db, url) {
  if (request.method !== 'POST') return new Response(null, { status: 405, headers: { Allow: 'POST' } });
  const rpc = await bodyOf(request, url);
  const reply = (result) => json({ jsonrpc: '2.0', id: rpc.id, result });
  const error = (code, message, status = 200, data) => json({
    jsonrpc: '2.0', id: rpc.id ?? null, error: { code, message, ...(data ? { data } : {}) },
  }, status);
  if (rpc.jsonrpc !== '2.0' || typeof rpc.method !== 'string') return error(-32600, 'Invalid JSON-RPC request.', 400);
  if (rpc.id === undefined && rpc.method.startsWith('notifications/')) return new Response(null, { status: 202 });
  if (typeof rpc.id !== 'string' && typeof rpc.id !== 'number') return error(-32600, 'Request ID is required.', 400);
  const requested = request.headers.get('MCP-Protocol-Version');
  const modern = requested === modernVersion || rpc.method === 'server/discover';
  if (modern && request.headers.get('Mcp-Method') !== rpc.method) return error(-32020, 'Mcp-Method must match the request method.', 400);
  if (modern && rpc.method === 'tools/call' && request.headers.get('Mcp-Name') !== rpc.params?.name) {
    return error(-32020, 'Mcp-Name must match the requested tool.', 400);
  }
  if (requested && ![modernVersion, ...legacyVersions].includes(requested)) {
    return error(-32022, 'Unsupported protocol version.', 400, { supportedVersions: [modernVersion, ...legacyVersions] });
  }
  const complete = (result) => modern ? {
    resultType: 'complete', ...result, _meta: { 'io.modelcontextprotocol/serverInfo': serverInfo },
  } : result;
  if (rpc.method === 'server/discover') return reply(complete({ supportedVersions: [modernVersion], capabilities: { tools: {} }, instructions }));
  if (rpc.method === 'initialize' && !modern) return reply({
    protocolVersion: legacyVersions.includes(rpc.params?.protocolVersion) ? rpc.params.protocolVersion : legacyVersions[0],
    capabilities: { tools: {} }, serverInfo, instructions,
  });
  if (rpc.method === 'ping') return reply(complete({}));
  if (rpc.method === 'tools/list') return reply(complete({ tools }));
  if (rpc.method !== 'tools/call') return error(-32601, 'Method not found.');
  if (!tools.some(tool => tool.name === rpc.params?.name)) return error(-32602, 'Unknown tool name.');
  try {
    const value = await invoke(rpc.params.name, rpc.params.arguments ?? {}, request, db, url);
    return reply(complete({ content: [{ type: 'text', text: JSON.stringify(value) }], structuredContent: value }));
  } catch (failure) {
    if (!(failure instanceof Problem)) throw failure;
    return reply(complete({ isError: true, content: [{ type: 'text', text: failure.message }] }));
  }
}

export async function moderateContribution(request, url, db, member, endpoint) {
  if (endpoint === '/contributions' && request.method === 'GET') {
    const result = await db.prepare(`
      SELECT id,site,kind,title,summary,audience,criteria,evidence_url,byline,status,created_at
      FROM public_contributions WHERE status='pending' ORDER BY created_at,id LIMIT 100
    `).all();
    return json(result.results);
  }
  const id = endpoint.slice('/contributions/'.length);
  ensure(request.method === 'POST' && uuid.test(id), 404, 'Contribution endpoint unavailable.');
  const body = await bodyOf(request, url);
  ensure(['promoted', 'declined'].includes(body.status), 400, 'Choose Promote or Decline.');
  const result = await db.prepare(`
    UPDATE public_contributions SET status=?, reviewer=?, reviewed_at=CURRENT_TIMESTAMP
    WHERE id=? AND status='pending'
  `).bind(body.status, member.id, id).run();
  ensure(result.meta.changes > 0, 409, 'Contribution has already been reviewed or was removed.');
  return json({ receiptId: id, status: body.status });
}

export async function managePublicWAO(request, url, db, id) {
  ensure(uuid.test(id), 404, 'WAO profile unavailable.');
  const profile = await db.prepare("SELECT id FROM team_proposals WHERE id=? AND kind='wao' AND status='accepted'").bind(id).first();
  ensure(profile, 404, 'Accepted WAO profile unavailable.');
  if (request.method === 'GET') {
    return json({ listing: await db.prepare('SELECT focus,opportunity,website,active FROM public_waos WHERE id=?').bind(id).first() });
  }
  ensure(request.method === 'POST', 405, 'Use GET or POST.');
  const body = await bodyOf(request, url);
  if (body.action === 'hide') {
    await db.prepare('UPDATE public_waos SET active=0 WHERE id=?').bind(id).run();
    return json({ published: false });
  }
  ensure(body.action === 'publish', 400, 'Choose Publish or Remove.');
  const focus = field(body, 'focus', 'Public description', 10, 240);
  const opportunity = field(body, 'opportunity', 'Public contribution opportunity', 10, 500);
  const website = artifactUrl({ artifactUrl: body.website });
  await db.prepare(`
    INSERT INTO public_waos(id,focus,opportunity,website) VALUES (?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET focus=excluded.focus,opportunity=excluded.opportunity,website=excluded.website,active=1
  `).bind(id, focus, opportunity, website).run();
  return json({ published: true });
}
