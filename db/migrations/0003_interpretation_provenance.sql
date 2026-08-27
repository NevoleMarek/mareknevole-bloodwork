ALTER TABLE vocabulary ADD COLUMN interpretation_source TEXT NOT NULL DEFAULT 'legacy';
ALTER TABLE vocabulary ADD COLUMN interpretation_model TEXT;
ALTER TABLE vocabulary ADD COLUMN interpretation_generated_at TEXT;
ALTER TABLE vocabulary ADD COLUMN interpretation_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE vocabulary ADD COLUMN interpretation_review_status TEXT NOT NULL DEFAULT 'unreviewed';
ALTER TABLE vocabulary ADD COLUMN interpretation_reviewed_at TEXT;
ALTER TABLE vocabulary ADD COLUMN interpretation_reviewed_by TEXT;
ALTER TABLE vocabulary ADD COLUMN interpretation_updated_at TEXT;

CREATE TABLE IF NOT EXISTS vocabulary_interpretation_history (
  id TEXT PRIMARY KEY,
  vocabulary_key TEXT NOT NULL REFERENCES vocabulary(key) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  description TEXT,
  reference_min REAL NOT NULL,
  reference_max REAL NOT NULL,
  source TEXT NOT NULL CHECK(source IN ('ai', 'manual', 'legacy')),
  model TEXT,
  generated_at TEXT,
  review_status TEXT NOT NULL CHECK(review_status IN ('unreviewed', 'pending_review', 'approved')),
  reviewed_at TEXT,
  reviewed_by TEXT,
  changed_at TEXT NOT NULL,
  UNIQUE(vocabulary_key, version)
);

CREATE INDEX IF NOT EXISTS idx_interpretation_history_key_version
  ON vocabulary_interpretation_history(vocabulary_key, version DESC);

INSERT INTO vocabulary_interpretation_history (
  id,
  vocabulary_key,
  version,
  description,
  reference_min,
  reference_max,
  source,
  model,
  generated_at,
  review_status,
  reviewed_at,
  reviewed_by,
  changed_at
)
SELECT
  lower(hex(randomblob(16))),
  key,
  interpretation_version,
  description,
  reference_min,
  reference_max,
  interpretation_source,
  interpretation_model,
  interpretation_generated_at,
  interpretation_review_status,
  interpretation_reviewed_at,
  interpretation_reviewed_by,
  COALESCE(interpretation_updated_at, '1970-01-01T00:00:00.000Z')
FROM vocabulary;
