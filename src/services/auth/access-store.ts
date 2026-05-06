import { Database } from 'bun:sqlite'

export type AccessStatus = 'approved' | 'pending' | 'revoked'
export type AccessSource = 'domain' | 'env' | 'admin' | 'request'

export interface AccessEntry {
  login: string
  status: AccessStatus
  source: AccessSource
  requestedAt: number | null
  decidedAt: number | null
  decidedBy: string | null
}

export interface AccessStore {
  get(login: string): AccessEntry | null
  requestAccess(login: string): void
  approve(login: string, decidedBy: string): void
  deny(login: string, decidedBy: string): void
  revoke(login: string, decidedBy: string): void
  setApproved(login: string, source: AccessSource): void
  listByStatus(status: AccessStatus): AccessEntry[]
}

export function createAccessStore(dbPath: string): AccessStore {
  const db = new Database(dbPath)
  db.run('PRAGMA journal_mode = WAL')
  db.run(`
    CREATE TABLE IF NOT EXISTS user_access (
      login TEXT PRIMARY KEY,
      status TEXT NOT NULL CHECK (status IN ('approved', 'pending', 'revoked')),
      source TEXT NOT NULL CHECK (source IN ('domain', 'env', 'admin', 'request')),
      requested_at INTEGER,
      decided_at INTEGER,
      decided_by TEXT
    )
  `)

  function rowToEntry(row: Record<string, unknown>): AccessEntry {
    return {
      login: row.login as string,
      status: row.status as AccessStatus,
      source: row.source as AccessSource,
      requestedAt: (row.requested_at as number) ?? null,
      decidedAt: (row.decided_at as number) ?? null,
      decidedBy: (row.decided_by as string) ?? null,
    }
  }

  return {
    get(login: string): AccessEntry | null {
      const row = db
        .query(
          'SELECT login, status, source, requested_at, decided_at, decided_by FROM user_access WHERE login = ?',
        )
        .get(login) as Record<string, unknown> | null
      if (!row) return null
      return rowToEntry(row)
    },

    requestAccess(login: string): void {
      const now = Math.floor(Date.now() / 1000)
      db.run(
        `INSERT INTO user_access (login, status, source, requested_at)
         VALUES (?, 'pending', 'request', ?)
         ON CONFLICT(login) DO NOTHING`,
        [login, now],
      )
    },

    approve(login: string, decidedBy: string): void {
      const now = Math.floor(Date.now() / 1000)
      db.run(
        `UPDATE user_access SET status = 'approved', decided_at = ?, decided_by = ? WHERE login = ?`,
        [now, decidedBy, login],
      )
    },

    deny(login: string, decidedBy: string): void {
      const now = Math.floor(Date.now() / 1000)
      db.run(
        `UPDATE user_access SET status = 'revoked', decided_at = ?, decided_by = ? WHERE login = ?`,
        [now, decidedBy, login],
      )
    },

    revoke(login: string, decidedBy: string): void {
      const now = Math.floor(Date.now() / 1000)
      db.run(
        `UPDATE user_access SET status = 'revoked', decided_at = ?, decided_by = ? WHERE login = ?`,
        [now, decidedBy, login],
      )
    },

    setApproved(login: string, source: AccessSource): void {
      const now = Math.floor(Date.now() / 1000)
      db.run(
        `INSERT INTO user_access (login, status, source, decided_at)
         VALUES (?, 'approved', ?, ?)
         ON CONFLICT(login) DO UPDATE SET
           status = 'approved',
           source = CASE WHEN user_access.status = 'approved' THEN user_access.source ELSE excluded.source END,
           decided_at = CASE WHEN user_access.status = 'approved' THEN user_access.decided_at ELSE excluded.decided_at END`,
        [login, source, now],
      )
    },

    listByStatus(status: AccessStatus): AccessEntry[] {
      const rows = db
        .query(
          'SELECT login, status, source, requested_at, decided_at, decided_by FROM user_access WHERE status = ? ORDER BY requested_at DESC, decided_at DESC',
        )
        .all(status) as Record<string, unknown>[]
      return rows.map(rowToEntry)
    },
  }
}
