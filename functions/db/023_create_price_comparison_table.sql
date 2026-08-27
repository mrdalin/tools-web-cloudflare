-- 物品比价工具：物品主表 + 价格条目表
CREATE TABLE IF NOT EXISTS price_comparison_items (
  id TEXT PRIMARY KEY,
  uid TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  spec TEXT,
  note TEXT,
  status INTEGER DEFAULT 0,
  chosen_entry_id TEXT,
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS price_comparison_entries (
  id TEXT PRIMARY KEY,
  uid TEXT NOT NULL,
  item_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  unit_price REAL NOT NULL,
  shipping_fee REAL DEFAULT 0,
  discount REAL DEFAULT 0,
  final_price REAL NOT NULL,
  quantity INTEGER DEFAULT 1,
  currency TEXT DEFAULT 'CNY',
  status INTEGER DEFAULT 0,
  purchase_date TEXT,
  link TEXT,
  seller TEXT,
  note TEXT,
  is_chosen INTEGER DEFAULT 0,
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP
);
