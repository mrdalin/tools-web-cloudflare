-- 身高记录工具：成员表与记录表
CREATE TABLE IF NOT EXISTS height_members (
  id TEXT PRIMARY KEY,
  uid TEXT NOT NULL,
  name TEXT NOT NULL,
  birth_date TEXT,
  sex TEXT,
  goal_height REAL,
  avatar_color TEXT,
  avatar_emoji TEXT,
  is_default INTEGER DEFAULT 0,
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS height_records (
  id TEXT PRIMARY KEY,
  uid TEXT NOT NULL,
  member_id TEXT NOT NULL,
  height REAL NOT NULL,
  note TEXT,
  record_date TEXT NOT NULL,
  record_time TEXT NOT NULL,
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP
);
