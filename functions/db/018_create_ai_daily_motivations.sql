CREATE TABLE IF NOT EXISTS ai_daily_motivations (
  id TEXT PRIMARY KEY,
  style TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(style, content)
);

CREATE INDEX IF NOT EXISTS idx_ai_daily_motivations_style_created_at
  ON ai_daily_motivations(style, created_at);

CREATE TABLE IF NOT EXISTS ai_daily_motivation_generation_locks (
  style TEXT PRIMARY KEY,
  locked_until INTEGER NOT NULL
);
