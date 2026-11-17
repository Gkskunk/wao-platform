pyenv: cannot rehash: /Users/gregkerr/.pyenv/shims isn't writable
CREATE TABLE IF NOT EXISTS contribution_settings (
  id INTEGER PRIMARY KEY CHECK (id=1),
  salt TEXT NOT NULL
);
INSERT OR IGNORE INTO contribution_settings VALUES (1,lower(hex(randomblob(32))));

CREATE TABLE IF NOT EXISTS public_contributions (
  id TEXT PRIMARY KEY,
  site TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('challenge','wao')),
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  audience TEXT NOT NULL,
  criteria TEXT NOT NULL,
  evidence_url TEXT NOT NULL DEFAULT '',
  byline TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','promoted','declined')),
  reviewer TEXT REFERENCES team_members(id),
  reviewed_at TEXT,
  bucket TEXT NOT NULL,
  day TEXT NOT NULL,
  fingerprint TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS public_contributions_day_bucket ON public_contributions(day,bucket);
CREATE INDEX IF NOT EXISTS public_contributions_status ON public_contributions(status,created_at);

CREATE TABLE IF NOT EXISTS public_waos (
  id TEXT PRIMARY KEY REFERENCES team_proposals(id),
  focus TEXT NOT NULL,
  opportunity TEXT NOT NULL,
  website TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1))
);

CREATE TRIGGER IF NOT EXISTS public_contribution_promotion
AFTER UPDATE OF status ON public_contributions
WHEN NEW.status='promoted' AND OLD.status='pending'
BEGIN
  INSERT INTO team_proposals(id,kind,title,site,problem,audience,criteria,proposer)
  VALUES(NEW.id,NEW.kind,NEW.title,NEW.site,
    NEW.summary || char(10) || char(10) || 'Public contribution by ' || NEW.byline ||
    CASE WHEN NEW.evidence_url='' THEN '' ELSE char(10) || 'Submitted evidence: ' || NEW.evidence_url END,
    NEW.audience,NEW.criteria,NEW.reviewer);
END;
