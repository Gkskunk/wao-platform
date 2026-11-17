pyenv: cannot rehash: /Users/gregkerr/.pyenv/shims isn't writable
CREATE TABLE IF NOT EXISTS team_members (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  home TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner','member')),
  key_hash TEXT NOT NULL UNIQUE,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS team_sessions (
  token_hash TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES team_members(id),
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS team_sessions_member ON team_sessions(member_id);

CREATE TABLE IF NOT EXISTS team_archive (
  sequence INTEGER PRIMARY KEY,
  speaker TEXT NOT NULL,
  body TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS team_proposals (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('challenge','wao')),
  title TEXT NOT NULL,
  site TEXT NOT NULL,
  problem TEXT NOT NULL,
  audience TEXT NOT NULL,
  criteria TEXT NOT NULL,
  proposer TEXT NOT NULL REFERENCES team_members(id),
  contributor TEXT REFERENCES team_members(id),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','building','review','revision','accepted','closed')),
  revision INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS team_submissions (
  proposal TEXT NOT NULL REFERENCES team_proposals(id),
  revision INTEGER NOT NULL,
  evidence TEXT NOT NULL,
  artifact_url TEXT NOT NULL DEFAULT '',
  charter TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (proposal, revision)
);
CREATE TABLE IF NOT EXISTS team_reviews (
  proposal TEXT NOT NULL,
  revision INTEGER NOT NULL,
  reviewer TEXT NOT NULL REFERENCES team_members(id),
  verdict TEXT NOT NULL CHECK (verdict IN ('accepted','revision','closed')),
  notes TEXT NOT NULL,
  reviewed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (proposal, revision),
  FOREIGN KEY (proposal, revision) REFERENCES team_submissions(proposal, revision)
);
CREATE TRIGGER IF NOT EXISTS team_submission_progress AFTER INSERT ON team_submissions
BEGIN
  UPDATE team_proposals SET status='review', revision=NEW.revision WHERE id=NEW.proposal;
END;
CREATE TRIGGER IF NOT EXISTS team_review_progress AFTER INSERT ON team_reviews
BEGIN
  UPDATE team_proposals SET status=NEW.verdict WHERE id=NEW.proposal;
END;
