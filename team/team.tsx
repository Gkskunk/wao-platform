pyenv: cannot rehash: /Users/gregkerr/.pyenv/shims isn't writable
import React, { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowRight, ArrowUpRight, Boxes, FileText, KeyRound, Network, Plus } from 'lucide-react';
import './team.css';

type Site = { id: string; name: string; focus: string; status: string; url: string };
type Member = { id: string; name: string; home: string; role: 'owner' | 'member'; active?: number };
type Proposal = {
  id: string; kind: 'challenge' | 'wao'; title: string; site: string; problem: string; audience: string;
  criteria: string; proposer: string; proposer_name: string; contributor: string | null;
  contributor_name: string | null; contributor_home: string | null; status: string; revision: number;
  evidence: string | null; artifact_url: string | null; charter: string | null;
  review_notes: string | null; reviewer_name: string | null;
};
type Team = { member: Member; sites: Site[]; proposals: Proposal[]; ranking: { name: string; home: string; points: number }[] };
type Message = { speaker: string; body: string };
type PublicSite = Omit<Site, 'url'> & { website: string | null; opportunity: string };
type Receipt = { receiptId: string; status: 'pending' | 'promoted' | 'declined'; missionStatus?: string };
type Contribution = { id: string; site: string; kind: string; title: string; summary: string; audience: string; criteria: string; evidence_url: string; byline: string };
type Call = <T = { ok: boolean }>(path: string, data?: Record<string, unknown>) => Promise<T>;

class RequestError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

function api(prefix: string): Call {
  return async <T,>(path: string, data?: Record<string, unknown>) => {
    const res = await fetch(prefix + path, data === undefined ? undefined : {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    });
    const response = await res.json();
    if (!res.ok) throw new RequestError(response.error ?? 'Request failed.', res.status);
    return response as T;
  };
}
const request = api('/api/team');
const publicRequest = api('/api/public');

const statuses: Record<string, string> = {
  open: 'Open to claim', building: 'In progress', review: 'Ready for review', revision: 'Changes requested',
  accepted: 'Accepted', closed: 'Closed',
};

function download(name: string, body: string) {
  const url = URL.createObjectURL(new Blob([body], { type: 'text/plain;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Form({ onAction, children, label }: {
  onAction: (data: Record<string, string>) => Promise<unknown>; children?: ReactNode; label: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setPending(true);
    setError('');
    try {
      await onAction(Object.fromEntries(Array.from(new FormData(form), ([key, value]) => [key, String(value)])));
      form.reset();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Request failed.');
    } finally { setPending(false); }
  }
  return <form onSubmit={submit}><fieldset disabled={pending}>{children}<button className="button primary">{pending ? 'Saving…' : label}</button></fieldset>
    {error && <p className="error" role="alert">{error}</p>}
  </form>;
}

function SiteOptions({ sites }: { sites: Pick<Site, 'id' | 'name'>[] }) {
  return <>{sites.map(site => <option key={site.id} value={site.id}>{site.name}</option>)}</>;
}

const receiptLabels = {
  pending: 'Awaiting human review',
  promoted: 'Promoted to a team mission',
  declined: 'Reviewed and declined',
};
function receiptLabel(receipt: Receipt) {
  return receipt.missionStatus === 'accepted' ? 'Accepted after independent review' : receiptLabels[receipt.status];
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [notice, setNotice] = useState('');
  return <div><button className="button" type="button" onClick={async () => {
    try { await navigator.clipboard.writeText(value); setNotice('Copied'); }
    catch { setNotice('Select and copy the text above.'); }
  }}>{label}</button>{notice && <small role="status">{notice}</small>}</div>;
}

function Connect() {
  const [sites, setSites] = useState<PublicSite[]>([]);
  const [site, setSite] = useState('wao-platform');
  const [receipt, setReceipt] = useState<Receipt>();
  const [checked, setChecked] = useState<Receipt>();
  const [error, setError] = useState('');
  const url = location.origin + '/mcp';
  const mandate = 'Connect to WAO Platform at ' + url + ' using Streamable HTTP. List the WAOs, pick an opportunity with me, and draft one contribution using public sources. Ask me before submitting. Save its receipt ID.';
  useEffect(() => {
    publicRequest<{ sites: PublicSite[] }>('/waos').then(result => setSites(result.sites))
      .catch(reason => setError(reason instanceof Error ? reason.message : 'The directory could not be loaded.'));
  }, []);
  return <section className="stack">
    <div className="panel stack"><div><h2>Connect your AI agent</h2>
      <p>Add this URL as a remote MCP server using Streamable HTTP. Anyone can browse opportunities and submit work for human review.</p></div>
      <label>MCP server URL<input readOnly value={url} /></label>
      <CopyButton value={url} label="Copy MCP URL" />
      <details><summary>Prompt for your agent</summary><p>{mandate}</p><CopyButton value={mandate} label="Copy prompt" /></details>
      <p><a href="/wao-cli.json">Command manifest and HTTP endpoints</a> · <a href="/llms.txt">Agent instructions</a></p>
    </div>
    {error && <p className="error" role="alert">{error}</p>}
    <div><h2>Find a way to contribute</h2><p>Pick a site to see a concrete opportunity or propose a new WAO.</p></div>
    <div className="grid">{sites.map(item => <article className="panel site" key={item.id}>
      <h3>{item.name}</h3><p>{item.opportunity}</p>
      <span className="pill">{item.status}</span>
      <div className="site-footer"><button className="button" onClick={() => {
        setSite(item.id);
        document.getElementById('submit-a-contribution')?.scrollIntoView({ block: 'start' });
      }}>Contribute</button>
      {item.website && <a href={item.website} target="_blank" rel="noreferrer" aria-label={'Open ' + item.name}><ArrowUpRight size={19} /></a>}</div>
    </article>)}</div>
    <div className="panel stack" id="submit-a-contribution"><div><h2>Submit a contribution</h2><p>Use public information, an alias, and a concrete result a reviewer can check.</p></div>
      {!!sites.length && <Form label="Submit for review" onAction={async data => {
        setReceipt(await publicRequest<Receipt>('/contributions', { ...data, site }));
      }}>
        <div className="two"><label>WAO<select value={site} onChange={event => setSite(event.target.value)}><SiteOptions sites={sites} /></select></label>
          <label>Contribution type<select name="kind"><option value="challenge">Work or improvement</option><option value="wao">New WAO idea</option></select></label></div>
        <label>Title<input name="title" minLength={5} maxLength={120} required /></label>
        <label>Public alias<input name="byline" minLength={2} maxLength={70} required /></label>
        <label>Who benefits?<input name="audience" minLength={3} maxLength={200} required /></label>
        <label>What can you contribute?<textarea name="summary" minLength={20} maxLength={1400} required /></label>
        <label>What can a reviewer verify?<textarea name="criteria" minLength={10} maxLength={1400} required /></label>
        <label>Public evidence URL (optional)<input name="evidenceUrl" type="url" maxLength={1000} placeholder="https://" /></label>
      </Form>}
      {receipt && <div className="record" role="status"><strong>{receiptLabel(receipt)}</strong>
        <p>Save this receipt ID to check the decision.</p><code>{receipt.receiptId}</code></div>}
    </div>
    <div className="panel stack"><h2>Check a receipt</h2>
      <Form label="Check status" onAction={async data => {
        setChecked(undefined);
        setChecked(await publicRequest<Receipt>('/contributions/' + encodeURIComponent(data.receiptId.trim())));
      }}>
        <label>Receipt ID<input name="receiptId" minLength={36} maxLength={36} required /></label>
      </Form>
      {checked && <p role="status">{receiptLabel(checked)} · <code>{checked.receiptId}</code></p>}
    </div>
  </section>;
}

function Inbox({ sites }: { sites: Site[] }) {
  const [entries, setEntries] = useState<Contribution[]>();
  const [error, setError] = useState('');
  async function load() { setEntries(await request<Contribution[]>('/contributions')); }
  useEffect(() => { load().catch(reason => setError(reason.message)); }, []);
  return <section className="stack">
    <div><h2>Public contributions</h2><p>Review submitted material before moving it into the team’s missions.</p></div>
    {error && <p className="error" role="alert">{error}</p>}
    {entries?.length === 0 && <p>No contributions awaiting review.</p>}
    {!entries && !error && <p>Loading contributions…</p>}
    {entries?.map(entry => <article className="panel stack" key={entry.id}>
      <div><div className="eyebrow">{sites.find(site => site.id === entry.site)?.name} / {entry.kind === 'wao' ? 'New WAO idea' : 'Work or improvement'}</div><h3>{entry.title}</h3>
        <p>Submitted by {entry.byline}</p></div>
      <p className="prewrap">{entry.summary}</p>
      <dl><div><dt>Audience</dt><dd>{entry.audience}</dd></div><div><dt>Acceptance criteria</dt><dd className="prewrap">{entry.criteria}</dd></div></dl>
      {entry.evidence_url && <a href={entry.evidence_url} target="_blank" rel="noreferrer">Open submitted evidence <ArrowUpRight size={14} /></a>}
      <Form label="Save decision" onAction={async data => {
        await request('/contributions/' + entry.id, data);
        await load();
      }}>
        <label>Decision<select name="status" defaultValue="" required><option value="" disabled>Select decision</option>
          <option value="promoted">Promote to team mission</option><option value="declined">Decline contribution</option>
        </select></label>
      </Form>
    </article>)}
  </section>;
}

function Access({ sites }: { sites: Site[] }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  async function load() { setMembers(await request<Member[]>('/members')); }
  useEffect(() => { load().catch(reason => setError(reason.message)); }, []);
  return <section className="stack">
    <div><h2>Team access</h2><p>Create an individual key for each teammate and share it privately. A home site is the perspective they bring to the room.</p></div>
    <div className="panel"><Form label="Create access key" onAction={async data => {
      const result = await request<{ key: string }>('/members', data);
      setKey(result.key);
      setCopied(false);
      await load();
    }}>
      <label>Teammate name<input name="name" minLength={2} maxLength={70} required /></label>
      <label>Home site<select name="home"><SiteOptions sites={sites} /></select></label>
    </Form>
    {key && <div className="issued"><label>New teammate key<input readOnly value={key} /></label>
      <button className="button" onClick={() => navigator.clipboard.writeText(key).then(() => setCopied(true)).catch(() => setError('Select and copy the key.'))}>{copied ? 'Copied' : 'Copy key'}</button>
    </div>}</div>
    <div className="panel"><h3>Teammates</h3>
      {members.map(member => <div className="row" key={member.id}><div><strong>{member.name}</strong><small>{sites.find(site => site.id === member.home)?.name} · {member.role}{member.active ? '' : ' · revoked'}</small></div>
        {member.role === 'member' && member.active === 1 && <Form label="Revoke key" onAction={async () => {
          if (window.confirm('Revoke access for ' + member.name + '?')) {
            await request('/members/revoke', { id: member.id }); await load();
          }
        }} />}
      </div>)}
    </div>
    {error && <p className="error" role="alert">{error}</p>}
  </section>;
}

function Archive() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    request<Message[]>('/archive').then(setMessages).catch(reason => setError(reason.message)).finally(() => setLoading(false));
  }, []);
  return <section className="stack">
    <div className="section-heading"><div><h2>Build conversation</h2><p>The requests, decisions, results, and source briefs that shaped these sites.</p></div>
      <button className="button" disabled={!messages.length} onClick={() => download('wao-build-conversation.md',
        messages.map(message => '## ' + message.speaker + '\n\n' + message.body).join('\n\n---\n\n'))}>Download Markdown</button></div>
    {loading && <p>Loading the conversation…</p>}
    {error && <p className="error" role="alert">{error}</p>}
    {messages.map((message, index) => <details className="panel transcript" key={index}>
      <summary><strong>{message.speaker}</strong><span>{message.body.trim().split('\n').find(line => line.trim())?.slice(0, 125)}</span></summary>
      <pre>{message.body}</pre>
    </details>)}
  </section>;
}

function ProposalCard({ proposal, team, refresh }: { proposal: Proposal; team: Team; refresh: () => Promise<void> }) {
  const site = team.sites.find(item => item.id === proposal.site)!;
  const { member } = team;
  const claimed = proposal.contributor === member.id;
  const proposer = proposal.proposer === member.id;
  function act(operation: string, data: Record<string, unknown> = {}) {
    return request('/proposals/' + proposal.id + '/' + operation, { ...data, revision: proposal.revision }).then(refresh);
  }
  return <article className="panel stack">
    <div className="section-heading"><div><div className="eyebrow">{site.name} / {proposal.kind === 'wao' ? 'New WAO' : 'Challenge'}</div><h3>{proposal.title}</h3></div>
      <span className={proposal.status === 'accepted' ? 'pill accepted' : 'pill'}>{statuses[proposal.status]}</span></div>
    <p className="prewrap">{proposal.problem}</p>
    <dl><div><dt>Audience</dt><dd>{proposal.audience}</dd></div>
      <div><dt>Acceptance criteria</dt><dd className="prewrap">{proposal.criteria}</dd></div>
      <div><dt>Proposer</dt><dd>{proposal.proposer_name}</dd></div>
      {proposal.contributor_name && <div><dt>Contributor</dt><dd>{proposal.contributor_name} · {team.sites.find(item => item.id === proposal.contributor_home)?.name}</dd></div>}
    </dl>
    {proposal.evidence && <div className="record"><strong>Evidence · Revision {proposal.revision}</strong><p className="prewrap">{proposal.evidence}</p>
      {proposal.artifact_url && <a href={proposal.artifact_url} target="_blank" rel="noreferrer">Open submitted artifact <ArrowUpRight size={14} /></a>}
      {proposal.charter && <details><summary>Read charter</summary><p className="prewrap">{proposal.charter}</p></details>}
    </div>}
    {proposal.review_notes && <div className="record"><strong>Review by {proposal.reviewer_name}</strong><p className="prewrap">{proposal.review_notes}</p></div>}
    {proposal.status === 'open' && (proposer
      ? <Form label="Withdraw proposal" onAction={() => act('withdraw')} />
      : site.id !== member.home
        ? <Form label="Claim as cross-site contributor" onAction={() => act('claim')} />
        : <p>Open to contributors from another site.</p>)}
    {claimed && ['building', 'revision'].includes(proposal.status) && <Form label="Submit evidence for review" onAction={data => act('submit', data)}>
      <label>Evidence<textarea name="evidence" minLength={20} maxLength={5000} required placeholder="What was delivered? What did you verify?" /></label>
      <label>Artifact URL <small>Optional · HTTPS</small><input name="artifactUrl" type="url" maxLength={1000} /></label>
      {proposal.kind === 'wao' && <label>WAO charter<textarea name="charter" minLength={40} maxLength={5000} required placeholder="Mission, roles, actions agents can take, decisions humans retain, a first milestone, and how to measure it." /></label>}
    </Form>}
    {claimed && proposal.status === 'building' && <Form label="Release claim" onAction={() => act('release')} />}
    {proposal.status === 'review' && (claimed || proposer ? <p>Waiting for a teammate who did neither the proposing nor the implementation.</p>
      : <Form label="Record independent review" onAction={data => act('review', data)}>
        <label>Decision<select name="verdict"><option value="revision">Request changes</option><option value="accepted">Accept evidence</option><option value="closed">Close proposal</option></select></label>
        <label>Review notes<textarea name="notes" minLength={10} maxLength={2500} required placeholder="Explain how the evidence meets the criteria or what needs to change." /></label>
      </Form>)}
    {proposal.status === 'accepted' && proposal.kind === 'wao' && <a className="button" href={'#/waos/' + proposal.id}>Open WAO profile <ArrowRight size={15} /></a>}
  </article>;
}

function Proposals({ team, refresh }: { team: Team; refresh: () => Promise<void> }) {
  const [creating, setCreating] = useState(false);
  return <section className="stack">
    <div className="section-heading"><div><h2>Cross-site missions</h2><p>Propose a challenge or a new WAO. A teammate from another site builds it, then a third person reviews the evidence.</p></div>
      <button className="button primary" onClick={() => setCreating(!creating)}><Plus size={18} />{creating ? 'Close form' : 'New proposal'}</button></div>
    {creating && <div className="panel"><Form label="Open proposal" onAction={async data => {
      await request('/proposals', data); await refresh(); setCreating(false);
    }}>
      <div className="two"><label>Proposal type<select name="kind"><option value="wao">New WAO</option><option value="challenge">Cross-site challenge</option></select></label>
        <label>Focus site<select name="site" defaultValue={team.member.home}><SiteOptions sites={team.sites} /></select></label></div>
      <label>Title<input name="title" minLength={5} maxLength={120} required /></label>
      <label>Who will use it?<input name="audience" minLength={3} maxLength={200} required /></label>
      <label>What do they need?<textarea name="problem" minLength={10} maxLength={1600} required /></label>
      <label>What should a reviewer verify?<textarea name="criteria" minLength={10} maxLength={1600} required /></label>
    </Form></div>}
    {team.proposals.length === 0 && <div className="panel"><h3>Start with a practical problem</h3><p>Choose a site with a real need and specify a deliverable another teammate can verify.</p></div>}
    {team.proposals.map(proposal => <ProposalCard key={proposal.id} proposal={proposal} team={team} refresh={refresh} />)}
  </section>;
}

function Directory({ team }: { team: Team }) {
  return <section className="stack">
    <div><h2>WAO directory</h2><p>Open a site or bring its expertise into a cross-site mission.</p></div>
    <div className="grid">{team.sites.map(site => <article className="panel site" key={site.id}>
      <Boxes size={20} /><h3>{site.name}</h3><p>{site.focus}</p><div className="site-footer"><span className="pill">{site.status}</span>
        {site.url && <a href={site.url} target={site.url.startsWith('https://') ? '_blank' : undefined} rel="noreferrer" aria-label={'Open ' + site.name}><ArrowUpRight size={19} /></a>}</div>
    </article>)}</div>
  </section>;
}

type Listing = { focus: string; opportunity: string; website: string; active: number };
function EditPublicListing({ proposal }: { proposal: Proposal }) {
  const [listing, setListing] = useState<Listing | null>();
  const [error, setError] = useState('');
  const endpoint = '/public-waos/' + proposal.id;
  async function load() { setListing((await request<{ listing: Listing | null }>(endpoint)).listing); }
  useEffect(() => { load().catch(reason => setError(reason.message)); }, [proposal.id]);
  if (error) return <p className="error" role="alert">{error}</p>;
  if (listing === undefined) return <p>Loading listing…</p>;
  return <section className="panel stack">
    <div><h3>Public agent listing</h3><p>{listing?.active ? 'Agents can discover this WAO.' : 'This WAO is visible only to the team.'} Publishing shares its title and the fields below.</p></div>
    <Form key={JSON.stringify(listing)} label="Publish listing" onAction={async data => {
      await request(endpoint, { ...data, action: 'publish' });
      await load();
    }}>
      <label>Public description<input name="focus" minLength={10} maxLength={240} defaultValue={listing?.focus} required /></label>
      <label>Public contribution opportunity<textarea name="opportunity" minLength={10} maxLength={500} defaultValue={listing?.opportunity} required /></label>
      <label>Public website (optional)<input name="website" type="url" maxLength={1000} defaultValue={listing?.website} /></label>
    </Form>
    {!!listing?.active && <Form label="Remove public listing" onAction={async () => {
      await request(endpoint, { action: 'hide' });
      await load();
    }} />}
  </section>;
}

function Profile({ proposal, owner }: { proposal: Proposal; owner: boolean }) {
  const blueprint = ['# ' + proposal.title, '## Audience', proposal.audience, '## Need', proposal.problem,
    '## Acceptance criteria', proposal.criteria, '## Charter', proposal.charter, '## Evidence', proposal.evidence,
    '## Independent review', proposal.review_notes, ...(proposal.artifact_url ? ['## Artifact', proposal.artifact_url] : [])].join('\n\n');
  return <section className="panel stack"><div className="section-heading"><div><span className="pill accepted">Accepted team WAO</span><h2>{proposal.title}</h2></div>
    <button className="button" onClick={() => download('wao-blueprint.md', blueprint)}>Download blueprint</button></div>
    <p className="prewrap">{proposal.problem}</p>
    <h3>Charter</h3><p className="prewrap">{proposal.charter}</p>
    <h3>Verified evidence</h3><p className="prewrap">{proposal.evidence}</p>
    <h3>Review by {proposal.reviewer_name}</h3><p className="prewrap">{proposal.review_notes}</p>
    {proposal.artifact_url && <a href={proposal.artifact_url} target="_blank" rel="noreferrer">Open submitted artifact <ArrowUpRight size={14} /></a>}
    {owner && <EditPublicListing key={proposal.id} proposal={proposal} />}
  </section>;
}

function Score({ team }: { team: Team }) {
  return <section className="panel stack"><div><h3>Contribution credits</h3><p>Acceptance awards 3 credits to the contributor and 2 to the independent reviewer. A team member who originated a mission earns 1. Public participants can see the outcome on their receipt.</p></div>
    {team.ranking.map((row, index) => <div className="row" key={index}><div><strong>{row.name}</strong><small>{team.sites.find(site => site.id === row.home)?.name}</small></div><strong>{row.points} credits</strong></div>)}
  </section>;
}

function App() {
  const [team, setTeam] = useState<Team>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState(location.hash.slice(2) || 'directory');
  async function refresh() {
    try { setTeam(await request<Team>('/state')); setError(''); }
    catch (reason) {
      if (reason instanceof RequestError && reason.status === 401) setTeam(undefined);
      else setError(reason instanceof Error ? reason.message : 'Unable to load the team room.');
    } finally { setLoading(false); }
  }
  useEffect(() => {
    const sync = () => setTab(location.hash.slice(2) || 'directory');
    window.addEventListener('hashchange', sync);
    refresh();
    return () => window.removeEventListener('hashchange', sync);
  }, []);
  const profile = team?.proposals.find(item => item.kind === 'wao' && item.status === 'accepted' && tab === 'waos/' + item.id);
  const links = [
    ['directory', 'Directory', Network], ['missions', 'Missions', Boxes], ['conversation', 'Conversation', FileText],
    ...(team?.member.role === 'owner' ? [['inbox', 'Public contributions', FileText] as const, ['access', 'Team access', KeyRound] as const] : []),
  ] as const;
  return <>
    <header className="header"><div className="shell header-inner">
      <a className="brand" href="#/directory"><span><Network size={22} /></span>WAO Platform</a>
      <div className="account">
        <a href={tab === 'connect' ? '#/directory' : '#/connect'}>{tab === 'connect' ? 'Team room' : 'Connect an agent'}</a>
        {team && <Form label="Sign out" onAction={async () => {
          await request('/sign-out', {}); setTeam(undefined);
        }} />}
      </div>
    </div></header>
    <main className="shell">
      <div className="hero"><div className="eyebrow">Wise Autonomous Organizations</div>
        <h1>{tab === 'connect' || team ? 'Build the next WAO.' : 'WAO Platform team room'}</h1>
        <p>Share the work so far, collaborate across sites, and turn reviewed evidence into new WAOs.</p>
      </div>
      {error && <p className="error" role="alert">{error} <button className="button" onClick={refresh}>Retry</button></p>}
      {tab === 'connect' ? <Connect /> : loading ? <p>Opening the team room…</p> : !team ? <section className="panel signin">
        <h2>Join your team</h2><p>Enter the access key issued to you by the room owner.</p>
        <Form label="Sign in" onAction={async data => { await request('/sign-in', data); await refresh(); }}>
          <label>Team access key<input type="password" name="key" minLength={64} maxLength={64} required autoComplete="current-password" /></label>
        </Form><p><a href="#/connect">Browse public opportunities or connect your agent</a></p></section> : <>
        <nav className="navigation" aria-label="Team room">{links.map(([id, label, Icon]) => <a key={id} href={'#/' + id}
          aria-current={tab === id ? 'page' : undefined}><Icon size={17} />{label}</a>)}</nav>
        {tab === 'missions' ? <div className="mission-layout"><Proposals team={team} refresh={refresh} /><aside><Score team={team} /></aside></div>
          : tab === 'conversation' ? <Archive />
          : tab === 'inbox' && team.member.role === 'owner' ? <Inbox sites={team.sites} />
          : tab === 'access' && team.member.role === 'owner' ? <Access sites={team.sites} />
          : profile ? <Profile proposal={profile} owner={team.member.role === 'owner'} />
          : <Directory team={team} />}
      </>}
    </main>
  </>;
}

createRoot(document.getElementById('root')!).render(<App />);
