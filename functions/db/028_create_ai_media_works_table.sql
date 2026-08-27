-- AI 媒体作品画廊 /ai-media-works/
-- 只存外链 URL（不存媒体文件本身，节省 R2/OSS）
-- media_type 区分 image / video；audit_status = 'approved' 公开浏览

CREATE TABLE IF NOT EXISTS ai_media_works (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    media_type      TEXT NOT NULL,
    media_url       TEXT NOT NULL,
    thumbnail_url   TEXT,
    prompt          TEXT NOT NULL,
    category        TEXT NOT NULL,
    model_name      TEXT,
    source_name     TEXT,
    source_url      TEXT,
    width           INTEGER,
    height          INTEGER,
    duration        INTEGER,
    file_size       INTEGER,
    tags            TEXT,
    audit_status    TEXT NOT NULL DEFAULT 'approved',
    view_count      INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL
);
