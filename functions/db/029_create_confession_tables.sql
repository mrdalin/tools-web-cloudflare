-- 匿名告白墙 /confession-wall/
-- 从上游 Supabase schema 适配为 D1：id 用 TEXT、时间用 TEXT、去掉 RLS/Realtime
-- 管理操作（分组创建/删除、删消息）由后端 JWT 鉴权（当前 user 表无 is_admin，仅要求登录）

CREATE TABLE IF NOT EXISTS confession_groups (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  icon        TEXT,
  color       TEXT,
  description TEXT,
  sort_order  INTEGER DEFAULT 0,
  is_default  INTEGER DEFAULT 0,
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS confession_messages (
  id           TEXT PRIMARY KEY,
  group_id     TEXT,
  content      TEXT NOT NULL,
  mood         TEXT,
  color        TEXT,
  likes_count  INTEGER DEFAULT 0,
  hugs_count   INTEGER DEFAULT 0,
  created_at   TEXT NOT NULL,
  FOREIGN KEY (group_id) REFERENCES confession_groups(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS confession_reactions (
  id               TEXT PRIMARY KEY,
  message_id       TEXT NOT NULL,
  reaction_type    TEXT NOT NULL CHECK (reaction_type IN ('like','hug')),
  user_fingerprint TEXT NOT NULL,
  created_at       TEXT NOT NULL,
  UNIQUE(message_id, reaction_type, user_fingerprint),
  FOREIGN KEY (message_id) REFERENCES confession_messages(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_confession_created ON confession_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_confession_group   ON confession_messages(group_id, created_at DESC);

-- 默认分组数据（幂等，可重复执行）
INSERT INTO confession_groups (id, name, slug, icon, color, description, sort_order, is_default, created_at) VALUES
  ('conf-group-plaza',      '广场', 'plaza',      '🌆', '#FFE4E1', '随便聊聊，看到什么说什么', 1, 1, '2026-08-27T00:00:00.000Z'),
  ('conf-group-treehole',   '树洞', 'treehole',   '🌳', '#E0FFE0', '匿名倾诉，秘密只属于你',     2, 0, '2026-08-27T00:00:00.000Z'),
  ('conf-group-confession', '表白', 'confession', '💌', '#FFDAB9', '说出那句藏在心底的话',       3, 0, '2026-08-27T00:00:00.000Z'),
  ('conf-group-wish',       '许愿', 'wish',       '✨', '#FFFACD', '写下心愿，说不定会实现',     4, 0, '2026-08-27T00:00:00.000Z'),
  ('conf-group-roast',      '吐槽', 'roast',      '🤬', '#F0E0FF', '今天的不开心，吐出来就好',   5, 0, '2026-08-27T00:00:00.000Z')
ON CONFLICT(slug) DO NOTHING;
