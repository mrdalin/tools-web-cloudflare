-- 闪卡复习系统：卡组 + 卡片 + 复习记录
CREATE TABLE IF NOT EXISTS flashcard_decks (
  id          TEXT PRIMARY KEY,
  uid         TEXT NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  daily_new_limit INTEGER DEFAULT 20,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS flashcards (
  id              TEXT PRIMARY KEY,
  deck_id         TEXT NOT NULL,
  uid             TEXT NOT NULL,
  front           TEXT NOT NULL,
  back            TEXT NOT NULL,
  ease_factor     REAL DEFAULT 2.5,
  interval_days   INTEGER DEFAULT 0,
  repetitions     INTEGER DEFAULT 0,
  due_at          INTEGER NOT NULL,
  is_suspended    INTEGER DEFAULT 0,
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL,
  FOREIGN KEY (deck_id) REFERENCES flashcard_decks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS flashcard_reviews (
  id              TEXT PRIMARY KEY,
  card_id         TEXT NOT NULL,
  uid             TEXT NOT NULL,
  grade           INTEGER NOT NULL,
  prev_interval   INTEGER,
  new_interval    INTEGER,
  reviewed_at     INTEGER NOT NULL,
  FOREIGN KEY (card_id) REFERENCES flashcards(id) ON DELETE CASCADE
);
