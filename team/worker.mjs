pyenv: cannot rehash: /Users/gregkerr/.pyenv/shims isn't writable
import { sites } from './sites.mjs';
import { Problem, ensure, json, hash, field, artifactUrl, bodyOf } from './http.mjs';
import { publicParticipation, moderateContribution, managePublicWAO, isParticipationPath } from './participation.mjs';

const cookieName = '__Host-wao-team';
const tokenPattern = /^[0-9a-f]{64}$/;
const week = 7 * 24 * 60 * 60;
const siteIds = new Set(sites.map((site) => site.id));
const profileQuery = "SELECT id,title,audience FROM team_proposals WHERE kind='wao' AND status='accepted'";

function token() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function sessionCookie(value, age) {
  return `${cookieName}=${value}; Path=/; Max-Age=${age}; Secure; HttpOnly; SameSite=Strict`;
}

function cookie(request) {
  return request.headers.get('Cookie')?.split(';').map((chunk) => chunk.trim())
    .find((chunk) => chunk.startsWith(cookieName + '='))?.slice(cookieName.length + 1) ?? '';
}

async function knownSite(db, id) {
  if (typeof id !== 'string' || id.length > 80) return false;
  return siteIds.has(id) || !!(await db.prepare(profileQuery + ' AND id=?').bind(id).first());
}

const proposalDetails = `
 SELECT p.*, proposer.name AS proposer_name, proposer.home AS proposer_home,
   contributor.name AS contributor_name, contributor.home AS contributor_home,
   submission.evidence, submission.artifact_url, submission.charter,
   review.verdict, review.notes AS review_notes, reviewer.name AS reviewer_name
 FROM team_proposals p
 JOIN team_members proposer ON proposer.id=p.proposer
 LEFT JOIN team_members contributor ON contributor.id=p.contributor
 LEFT JOIN team_submissions submission ON submission.proposal=p.id AND submission.revision=p.revision
 LEFT JOIN team_reviews review ON review.proposal=p.id AND review.revision=p.revision
 LEFT JOIN team_members reviewer ON reviewer.id=review.reviewer`;

async function route(request, env, url) {
  const db = env.TEAM_DB;
  const endpoint = url.pathname.slice('/api/team'.length);
  const method = request.method;
  ensure(db, 503, 'Team storage is unavailable.');
  if (endpoint === '/health' && method === 'GET') {
    await db.prepare('SELECT 1 FROM team_members LIMIT 1').first();
    return json({ ok: true, release: 'team-room' });
  }

  if (endpoint === '/sign-in' && method === 'POST') {
    const body = await bodyOf(request, url);
    const key = field(body, 'key', 'Access key', 64, 64);
    ensure(tokenPattern.test(key), 401, 'Invalid access key.');
    const member = await db.prepare('SELECT id,name,home,role FROM team_members WHERE active=1 AND key_hash=?').bind(await hash(key)).first();
    ensure(member, 401, 'Invalid access key.');
    const session = token();
    const sessionHash = await hash(session);
    const existing = cookie(request);
    const writes = [
      db.prepare('DELETE FROM team_sessions WHERE expires_at<=?').bind(Date.now()),
      db.prepare('INSERT INTO team_sessions VALUES(?,?,?)').bind(sessionHash, member.id, Date.now() + week * 1000),
    ];
    if (tokenPattern.test(existing)) writes.unshift(db.prepare('DELETE FROM team_sessions WHERE token_hash=?').bind(await hash(existing)));
    await db.batch(writes);
    return json({ member }, 200, { 'Set-Cookie': sessionCookie(session, week) });
  }

  const session = cookie(request);
  ensure(tokenPattern.test(session), 401, 'Sign in with your team access key.');
  const sessionHash = await hash(session);
  const member = await db.prepare(`
    SELECT m.id,m.name,m.home,m.role FROM team_members m JOIN team_sessions s ON s.member_id=m.id
    WHERE m.active=1 AND s.token_hash=? AND s.expires_at>?
  `).bind(sessionHash, Date.now()).first();
  ensure(member, 401, 'Sign in with your team access key.');

  if (endpoint === '/state' && method === 'GET') {
    const [proposals, ranking, profiles] = await db.batch([
      db.prepare(proposalDetails + ' ORDER BY p.created_at DESC,p.id DESC'),
      db.prepare(`
        WITH credits AS (
          SELECT p.proposer AS member, 1 AS points FROM team_proposals p WHERE p.status='accepted'
            AND NOT EXISTS (SELECT 1 FROM public_contributions c WHERE c.id=p.id)
          UNION ALL SELECT p.contributor, 3 FROM team_proposals p WHERE p.status='accepted'
          UNION ALL SELECT reviewer, 2 FROM team_reviews WHERE verdict='accepted'
        )
        SELECT m.name,m.home,COALESCE(SUM(c.points),0) AS points
        FROM team_members m LEFT JOIN credits c ON c.member=m.id WHERE m.active=1
        GROUP BY m.id ORDER BY points DESC,m.name ASC
      `),
      db.prepare(profileQuery + ' ORDER BY created_at DESC,id DESC'),
    ]);
    const directory = sites.concat(profiles.results.map((profile) => ({
      id: profile.id, name: profile.title, focus: profile.audience,
      status: 'Accepted team WAO', url: '/#/waos/' + profile.id,
    })));
    return json({ member, sites: directory, proposals: proposals.results, ranking: ranking.results });
  }
  if (endpoint === '/contributions' || endpoint.startsWith('/contributions/')) {
    ensure(member.role === 'owner', 403, 'Only the room owner can review public contributions.');
    return moderateContribution(request, url, db, member, endpoint);
  }
  if (endpoint.startsWith('/public-waos/')) {
    ensure(member.role === 'owner', 403, 'Only the room owner can publish a WAO listing.');
    return managePublicWAO(request, url, db, endpoint.slice('/public-waos/'.length));
  }
  if (endpoint === '/archive' && method === 'GET') {
    const result = await db.prepare('SELECT speaker,body FROM team_archive ORDER BY sequence').all();
    return json(result.results);
  }
  if (endpoint === '/members' && method === 'GET') {
    ensure(member.role === 'owner', 403, 'Only the room owner can manage access.');
    return json((await db.prepare('SELECT id,name,home,role,active FROM team_members ORDER BY created_at,id').all()).results);
  }
  ensure(method === 'POST', 404, 'Team endpoint unavailable.');
  const body = await bodyOf(request, url);

  if (endpoint === '/sign-out') {
    await db.prepare('DELETE FROM team_sessions WHERE token_hash=?').bind(sessionHash).run();
    return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie('', 0) });
  }
  if (endpoint === '/members') {
    ensure(member.role === 'owner', 403, 'Only the room owner can issue an access key.');
    const name = field(body, 'name', 'Display name', 2, 70);
    ensure(await knownSite(db, body.home), 400, 'Choose a home site.');
    const key = token();
    await db.prepare("INSERT INTO team_members(id,name,home,role,key_hash) VALUES(?,?,?,'member',?)")
      .bind(crypto.randomUUID(), name, body.home, await hash(key)).run();
    return json({ key }, 201);
  }
  if (endpoint === '/members/revoke') {
    ensure(member.role === 'owner', 403, 'Only the room owner can revoke access.');
    const target = field(body, 'id', 'Member ID', 1, 80);
    const result = await db.prepare("UPDATE team_members SET active=0 WHERE id=? AND role='member' AND active=1").bind(target).run();
    ensure(result.meta.changes === 1, 404, 'Active teammate not found.');
    return json({ ok: true });
  }
  if (endpoint === '/proposals') {
    ensure(['challenge', 'wao'].includes(body.kind), 400, 'Choose a challenge or a new WAO.');
    ensure(await knownSite(db, body.site), 400, 'Choose a site for this proposal.');
    const id = crypto.randomUUID();
    await db.prepare('INSERT INTO team_proposals(id,kind,title,site,problem,audience,criteria,proposer) VALUES(?,?,?,?,?,?,?,?)')
      .bind(id, body.kind, field(body, 'title', 'Title', 5, 120), body.site, field(body, 'problem', 'Problem', 10, 1600),
        field(body, 'audience', 'Audience', 3, 200), field(body, 'criteria', 'Acceptance criteria', 10, 1600), member.id).run();
    return json({ id }, 201);
  }

  const action = endpoint.match(/^\/proposals\/([0-9a-f-]{36})\/(claim|release|submit|review|withdraw)$/);
  ensure(action, 404, 'Team endpoint unavailable.');
  const [, proposal, operation] = action;
  let result;
  if (operation === 'claim') {
    result = await db.prepare(`
      UPDATE team_proposals SET contributor=?, status='building'
      WHERE id=? AND status='open' AND proposer<>? AND site<>?
    `).bind(member.id, proposal, member.id, member.home).run();
  } else if (operation === 'release') {
    result = await db.prepare(`
      UPDATE team_proposals SET contributor=NULL,status='open'
      WHERE id=? AND contributor=? AND status='building' AND revision=0
    `).bind(proposal, member.id).run();
  } else if (operation === 'withdraw') {
    result = await db.prepare("UPDATE team_proposals SET status='closed' WHERE id=? AND proposer=? AND status='open'")
      .bind(proposal, member.id).run();
  } else if (operation === 'submit') {
    const record = await db.prepare('SELECT kind FROM team_proposals WHERE id=?').bind(proposal).first();
    ensure(record, 404, 'Proposal unavailable.');
    const charter = record.kind === 'wao' ? field(body, 'charter', 'WAO charter', 40, 5000) : '';
    const evidence = field(body, 'evidence', 'Evidence', 20, 5000);
    result = await db.prepare(`
      INSERT INTO team_submissions(proposal,revision,evidence,artifact_url,charter)
      SELECT id,revision+1,?,?,? FROM team_proposals
      WHERE id=? AND contributor=? AND status IN ('building','revision') AND revision=?
    `).bind(evidence, artifactUrl(body), charter, proposal, member.id, revisionOf(body)).run();
  } else {
    ensure(['accepted', 'revision', 'closed'].includes(body.verdict), 400, 'Choose a review decision.');
    result = await db.prepare(`
      INSERT INTO team_reviews(proposal,revision,reviewer,verdict,notes)
      SELECT id,revision,?,?,? FROM team_proposals
      WHERE id=? AND status='review' AND revision=? AND proposer<>? AND contributor<>?
    `).bind(member.id, body.verdict, field(body, 'notes', 'Review notes', 10, 2500),
      proposal, revisionOf(body), member.id, member.id).run();
  }
  ensure(result.meta.changes > 0, 409, 'This move is unavailable for your role, site, or proposal revision. Refresh and try again.');
  return json({ ok: true });
}

function revisionOf(body) {
  ensure(Number.isSafeInteger(body.revision) && body.revision >= 0, 400, 'Use the current proposal revision.');
  return body.revision;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/team/') && !isParticipationPath(url.pathname)) {
      const asset = await env.ASSETS.fetch(request);
      const response = new Response(asset.body, asset);
      response.headers.set('Content-Security-Policy', "default-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
      response.headers.set('X-Content-Type-Options', 'nosniff');
      response.headers.set('Referrer-Policy', 'no-referrer');
      return response;
    }
    try {
      return await (isParticipationPath(url.pathname) ? publicParticipation(request, env, url) : route(request, env, url));
    } catch (error) {
      if (error instanceof Problem) return json({ error: error.message }, error.status);
      console.error('Team operation failed', error.constructor?.name ?? 'Error');
      return json({ error: 'Team operation failed.' }, 500);
    }
  },
};
