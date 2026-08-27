-- 工资记录工具：成员表与记录表
CREATE TABLE IF NOT EXISTS salary_records (
  id TEXT PRIMARY KEY,
  uid TEXT NOT NULL,
  monthly_income REAL NOT NULL,
  effective_date TEXT NOT NULL,
  source TEXT,
  note TEXT,
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_salary_records_uid ON salary_records(uid);
CREATE INDEX IF NOT EXISTS idx_salary_records_effective_date ON salary_records(effective_date);

CREATE TABLE IF NOT EXISTS salary_members (
  id TEXT PRIMARY KEY,
  uid TEXT NOT NULL,
  name TEXT NOT NULL,
  avatar_color TEXT,
  avatar_emoji TEXT,
  is_default INTEGER DEFAULT 0,
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_salary_members_uid ON salary_members(uid);

ALTER TABLE salary_records ADD COLUMN member_id TEXT;
CREATE INDEX IF NOT EXISTS idx_salary_records_member_id ON salary_records(member_id);
