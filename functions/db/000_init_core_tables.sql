-- Core D1 tables that are referenced by Cloudflare Pages Functions.
-- Run this once before 001/002/003/005...016 migrations.
-- 004_alter_user_table.sql is intentionally skipped because this file creates
-- the user table with password and salt columns already included.

CREATE TABLE IF NOT EXISTS user (
  id TEXT PRIMARY KEY,
  email TEXT,
  avatar TEXT,
  created_at TEXT,
  last_login TEXT,
  third_party_uid TEXT,
  username TEXT,
  user_level INTEGER DEFAULT 0,
  third_party_type TEXT,
  password TEXT,
  salt TEXT
);
CREATE INDEX IF NOT EXISTS idx_user_email ON user(email);

CREATE TABLE IF NOT EXISTS verification_codes (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  type TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  failures INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  consumed_at INTEGER,
  UNIQUE(email, type)
);
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires_at ON verification_codes(expires_at);

CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  uid TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notes_uid ON notes(uid);

CREATE TABLE IF NOT EXISTS resumes (
  id TEXT PRIMARY KEY,
  uid TEXT NOT NULL,
  name TEXT NOT NULL,
  template TEXT DEFAULT 'modern',
  personal_info TEXT,
  work_experience TEXT,
  education TEXT,
  skills TEXT,
  projects TEXT,
  certificates TEXT,
  others TEXT,
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_resumes_uid ON resumes(uid);

CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  uid TEXT NOT NULL,
  name TEXT NOT NULL,
  position TEXT NOT NULL,
  salary TEXT,
  benefits TEXT,
  work_days TEXT,
  work_hours TEXT,
  location TEXT,
  welfare TEXT,
  overtime TEXT,
  leave_policy TEXT,
  notes TEXT,
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_companies_uid ON companies(uid);

CREATE TABLE IF NOT EXISTS todos (
  id TEXT PRIMARY KEY,
  uid TEXT NOT NULL,
  title TEXT NOT NULL,
  completed INTEGER DEFAULT 0,
  priority TEXT DEFAULT 'medium',
  due_date TEXT,
  category TEXT DEFAULT '',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_todos_uid ON todos(uid);

CREATE TABLE IF NOT EXISTS qa_pages (
  id TEXT PRIMARY KEY,
  uid TEXT NOT NULL,
  title TEXT NOT NULL,
  qa_items TEXT NOT NULL DEFAULT '[]',
  header_content TEXT DEFAULT '',
  footer_content TEXT DEFAULT '',
  is_public INTEGER DEFAULT 0,
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_qa_pages_uid ON qa_pages(uid);

CREATE TABLE IF NOT EXISTS password_groups (
  id TEXT PRIMARY KEY,
  uid TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_password_groups_uid ON password_groups(uid);

CREATE TABLE IF NOT EXISTS password_entries (
  id TEXT PRIMARY KEY,
  uid TEXT NOT NULL,
  title TEXT NOT NULL,
  username TEXT,
  password TEXT NOT NULL,
  url TEXT,
  group_id TEXT,
  notes TEXT,
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_password_entries_uid ON password_entries(uid);
CREATE INDEX IF NOT EXISTS idx_password_entries_group_id ON password_entries(group_id);

CREATE TABLE IF NOT EXISTS weight_members (
  id TEXT PRIMARY KEY,
  uid TEXT NOT NULL,
  name TEXT NOT NULL,
  height REAL,
  avatar_color TEXT,
  avatar_emoji TEXT,
  is_default INTEGER DEFAULT 0,
  goal_weight REAL,
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_weight_members_uid ON weight_members(uid);

CREATE TABLE IF NOT EXISTS weight_records (
  id TEXT PRIMARY KEY,
  uid TEXT NOT NULL,
  member_id TEXT NOT NULL,
  weight REAL NOT NULL,
  height REAL,
  note TEXT,
  record_date TEXT NOT NULL,
  record_time TEXT NOT NULL,
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_weight_records_uid ON weight_records(uid);
CREATE INDEX IF NOT EXISTS idx_weight_records_member_id ON weight_records(member_id);

CREATE TABLE IF NOT EXISTS mock_schemas (
  id TEXT PRIMARY KEY,
  uid TEXT,
  name TEXT NOT NULL,
  description TEXT,
  schema TEXT NOT NULL,
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_mock_schemas_uid ON mock_schemas(uid);
