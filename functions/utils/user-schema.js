const USER_TABLE_SQL = `
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
  )
`

const REQUIRED_COLUMNS = [
  { name: 'email', sql: 'ALTER TABLE user ADD COLUMN email TEXT' },
  { name: 'avatar', sql: 'ALTER TABLE user ADD COLUMN avatar TEXT' },
  { name: 'created_at', sql: 'ALTER TABLE user ADD COLUMN created_at TEXT' },
  { name: 'last_login', sql: 'ALTER TABLE user ADD COLUMN last_login TEXT' },
  { name: 'third_party_uid', sql: 'ALTER TABLE user ADD COLUMN third_party_uid TEXT' },
  { name: 'username', sql: 'ALTER TABLE user ADD COLUMN username TEXT' },
  { name: 'user_level', sql: 'ALTER TABLE user ADD COLUMN user_level INTEGER DEFAULT 0' },
  { name: 'third_party_type', sql: 'ALTER TABLE user ADD COLUMN third_party_type TEXT' },
  { name: 'password', sql: 'ALTER TABLE user ADD COLUMN password TEXT' },
  { name: 'salt', sql: 'ALTER TABLE user ADD COLUMN salt TEXT' }
]

let ensurePromise = null

const getUserColumns = async (db) => {
  const result = await db.prepare('PRAGMA table_info(user)').all()
  return new Set((result.results || []).map((column) => column.name))
}

const isDuplicateColumnError = (error) =>
  String(error?.message || error).toLowerCase().includes('duplicate column')

const ensureUserAuthSchemaInternal = async (db) => {
  if (!db) {
    throw new Error('D1 database is not bound')
  }

  await db.prepare(USER_TABLE_SQL).run()

  const columns = await getUserColumns(db)
  for (const column of REQUIRED_COLUMNS) {
    if (columns.has(column.name)) continue

    try {
      await db.prepare(column.sql).run()
      columns.add(column.name)
    } catch (error) {
      if (!isDuplicateColumnError(error)) throw error
    }
  }

  await db.prepare('CREATE INDEX IF NOT EXISTS idx_user_email ON user(email)').run()
}

export const ensureUserAuthSchema = (db) => {
  if (!ensurePromise) {
    ensurePromise = ensureUserAuthSchemaInternal(db).catch((error) => {
      ensurePromise = null
      throw error
    })
  }

  return ensurePromise
}
