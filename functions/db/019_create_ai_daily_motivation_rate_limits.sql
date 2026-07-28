CREATE TABLE IF NOT EXISTS ai_daily_motivation_generation_rate_limits (
  client_key TEXT PRIMARY KEY,
  window_started_at INTEGER NOT NULL,
  generation_count INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_daily_motivation_rate_limits_updated_at
  ON ai_daily_motivation_generation_rate_limits(updated_at);
