-- 每月固定开销工具
CREATE TABLE IF NOT EXISTS fixed_expenses (
  id TEXT PRIMARY KEY,
  uid TEXT NOT NULL,
  name TEXT NOT NULL,
  amount REAL NOT NULL,
  category TEXT,
  billing_day INTEGER,
  start_date TEXT NOT NULL,
  end_date TEXT,
  note TEXT,
  is_active INTEGER DEFAULT 1,
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fixed_expenses_uid ON fixed_expenses(uid);
CREATE INDEX IF NOT EXISTS idx_fixed_expenses_uid_active ON fixed_expenses(uid, is_active);
CREATE INDEX IF NOT EXISTS idx_fixed_expenses_billing_day ON fixed_expenses(billing_day);
