CREATE TABLE IF NOT EXISTS vocabulary (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  unit TEXT NOT NULL,
  reference_min REAL NOT NULL,
  reference_max REAL NOT NULL,
  description TEXT,
  featured INTEGER NOT NULL DEFAULT 0,
  visible INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS readings (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  source TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS measurements (
  id TEXT PRIMARY KEY,
  reading_id TEXT NOT NULL REFERENCES readings(id) ON DELETE CASCADE,
  vocabulary_key TEXT NOT NULL REFERENCES vocabulary(key),
  value REAL NOT NULL,
  unit TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('normal', 'borderline', 'high', 'low'))
);

CREATE TABLE IF NOT EXISTS supplements (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  dose TEXT NOT NULL,
  frequency TEXT NOT NULL,
  started_at TEXT NOT NULL,
  stopped_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS supplement_changelog (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS health_metrics (
  date TEXT NOT NULL,
  metric TEXT NOT NULL,
  value REAL NOT NULL,
  unit TEXT NOT NULL,
  PRIMARY KEY (date, metric)
);

CREATE TABLE IF NOT EXISTS health_metric_config (
  metric TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  unit TEXT NOT NULL,
  aggregation TEXT NOT NULL,
  visible INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS revalidations (
  tag TEXT NOT NULL,
  revalidatedAt INTEGER NOT NULL,
  UNIQUE(tag) ON CONFLICT REPLACE
);

CREATE INDEX IF NOT EXISTS idx_readings_date
  ON readings(date DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_measurements_reading
  ON measurements(reading_id, vocabulary_key);

CREATE INDEX IF NOT EXISTS idx_measurements_vocabulary
  ON measurements(vocabulary_key, reading_id);

CREATE INDEX IF NOT EXISTS idx_active_supplements_name
  ON supplements(name)
  WHERE stopped_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_supplement_changelog_date
  ON supplement_changelog(date DESC, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_visible_health_config
  ON health_metric_config(visible, metric);

CREATE INDEX IF NOT EXISTS idx_health_metrics_metric_date
  ON health_metrics(metric, date);
