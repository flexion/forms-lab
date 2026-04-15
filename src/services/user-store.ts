import { Database } from 'bun:sqlite'
import type { UserProfile } from '../types/models'

export interface UserStore {
  upsert(user: { login: string; name: string; avatarUrl: string }): void
  get(login: string): UserProfile | null
  exists(login: string): boolean
}

export function createUserStore(dbPath: string): UserStore {
  const db = new Database(dbPath)
  db.run('PRAGMA journal_mode = WAL')
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      login TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      avatar_url TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)

  return {
    upsert(user: { login: string; name: string; avatarUrl: string }): void {
      const now = Math.floor(Date.now() / 1000)
      db.run(
        `INSERT INTO users (login, name, avatar_url, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(login) DO UPDATE SET
           name = excluded.name,
           avatar_url = excluded.avatar_url,
           updated_at = excluded.updated_at`,
        [user.login, user.name, user.avatarUrl, now, now],
      )
    },

    get(login: string): UserProfile | null {
      const row = db
        .query(
          'SELECT login, name, avatar_url, created_at, updated_at FROM users WHERE login = ?',
        )
        .get(login) as {
        login: string
        name: string
        avatar_url: string
        created_at: number
        updated_at: number
      } | null
      if (!row) return null
      return {
        login: row.login,
        name: row.name,
        avatarUrl: row.avatar_url,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }
    },

    exists(login: string): boolean {
      const row = db.query('SELECT 1 FROM users WHERE login = ?').get(login)
      return row !== null
    },
  }
}
