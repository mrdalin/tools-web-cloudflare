-- 旅游地图：地图主表 + 点位表 + 路线表
CREATE TABLE IF NOT EXISTS travel_maps (
  id             TEXT PRIMARY KEY,
  uid            TEXT NOT NULL,
  slug           TEXT NOT NULL UNIQUE,
  title          TEXT NOT NULL,
  description    TEXT NOT NULL DEFAULT '',
  center_lng     REAL NOT NULL DEFAULT 116.397428,
  center_lat     REAL NOT NULL DEFAULT 39.90923,
  zoom           INTEGER NOT NULL DEFAULT 12,
  base_layer     TEXT NOT NULL DEFAULT 'vec',
  is_public      INTEGER NOT NULL DEFAULT 0,
  view_count     INTEGER NOT NULL DEFAULT 0,
  point_count    INTEGER NOT NULL DEFAULT 0,
  route_count    INTEGER NOT NULL DEFAULT 0,
  total_distance REAL NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS travel_map_points (
  id         TEXT PRIMARY KEY,
  map_id     TEXT NOT NULL,
  name       TEXT NOT NULL,
  category   TEXT NOT NULL DEFAULT 'other',
  lng        REAL NOT NULL,
  lat        REAL NOT NULL,
  elevation  REAL,
  note       TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS travel_map_routes (
  id         TEXT PRIMARY KEY,
  map_id     TEXT NOT NULL,
  name       TEXT NOT NULL,
  color      TEXT NOT NULL DEFAULT '#2563eb',
  path       TEXT NOT NULL,
  distance   REAL NOT NULL DEFAULT 0,
  note       TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

ALTER TABLE travel_map_routes ADD COLUMN kind TEXT NOT NULL DEFAULT 'straight';
