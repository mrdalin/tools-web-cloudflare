-- 阿里云 OSS 管理 /oss-manager/
-- 用户自填的 AccessKey 经 AES-GCM（密钥派生自 JWT_SECRET）加密后存 D1，运行时解密
-- STS 临时凭证走公共端点 https://sts.aliyuncs.com（有 roleArn 走 AssumeRole，无则 direct-AK）

CREATE TABLE IF NOT EXISTS oss_credentials (
  id                    TEXT PRIMARY KEY,
  uid                   TEXT NOT NULL,
  name                  TEXT NOT NULL,
  region                TEXT NOT NULL,
  bucket                TEXT NOT NULL,
  endpoint              TEXT NOT NULL DEFAULT '',
  access_key_id_enc     TEXT NOT NULL,
  access_key_secret_enc TEXT NOT NULL,
  role_arn              TEXT NOT NULL DEFAULT '',
  policy                TEXT NOT NULL DEFAULT '',
  duration_seconds      INTEGER NOT NULL DEFAULT 3600,
  is_default            INTEGER NOT NULL DEFAULT 0,
  create_time           TEXT NOT NULL,
  update_time           TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_oss_credentials_uid ON oss_credentials(uid);
