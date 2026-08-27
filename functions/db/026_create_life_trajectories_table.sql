-- 人生轨迹表
CREATE TABLE IF NOT EXISTS life_trajectories (
  id TEXT PRIMARY KEY,
  uid TEXT NOT NULL,
  content TEXT NOT NULL,
  mood TEXT DEFAULT '🌡',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP
);
