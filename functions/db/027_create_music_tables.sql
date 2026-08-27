-- 音乐播放列表 /music-playlist/
-- 用户上传 mp3/m4a/wav 到 Cloudflare R2；歌曲与歌单相互独立，歌曲可归属 0/N 个歌单
-- play_count 每次播放 +1（不去重）；view_count 每次公开访问 +1

-- 歌曲主表
CREATE TABLE IF NOT EXISTS music_songs (
  id            TEXT PRIMARY KEY,
  uid           TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  title         TEXT NOT NULL,
  artist        TEXT NOT NULL DEFAULT '',
  album         TEXT NOT NULL DEFAULT '',
  cover_r2_key  TEXT,
  audio_r2_key  TEXT NOT NULL,
  mime_type     TEXT NOT NULL,
  file_size     INTEGER NOT NULL DEFAULT 0,
  duration_sec  REAL,
  is_public     INTEGER NOT NULL DEFAULT 0,
  play_count    INTEGER NOT NULL DEFAULT 0,
  file_sha256   TEXT NOT NULL,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  CONSTRAINT uq_music_songs_uid_sha256 UNIQUE (uid, file_sha256)
);

-- 歌单主表
CREATE TABLE IF NOT EXISTS music_playlists (
  id           TEXT PRIMARY KEY,
  uid          TEXT NOT NULL,
  slug         TEXT NOT NULL UNIQUE,
  title        TEXT NOT NULL,
  description  TEXT NOT NULL DEFAULT '',
  is_public    INTEGER NOT NULL DEFAULT 0,
  view_count   INTEGER NOT NULL DEFAULT 0,
  song_count   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);

-- 歌曲-歌单 多对多关联
CREATE TABLE IF NOT EXISTS music_playlist_songs (
  playlist_id  TEXT NOT NULL,
  song_id      TEXT NOT NULL,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  added_at     TEXT NOT NULL,
  PRIMARY KEY (playlist_id, song_id),
  FOREIGN KEY (playlist_id) REFERENCES music_playlists(id) ON DELETE CASCADE,
  FOREIGN KEY (song_id)     REFERENCES music_songs(id)      ON DELETE CASCADE
);
