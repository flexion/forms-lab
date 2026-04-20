// SQLite implementation of CacheStore.

import { Database } from 'bun:sqlite'
import type { CacheEntry, CacheStore } from './types'

export function createCacheStore(dbPath: string): CacheStore {
  const db = new Database(dbPath)
  db.run('PRAGMA journal_mode = WAL')
  db.run(`
    CREATE TABLE IF NOT EXISTS cache (
      key TEXT PRIMARY KEY,
      model TEXT NOT NULL,
      result TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `)

  return {
    get(key: string): CacheEntry | null {
      const row = db
        .query('SELECT key, model, result, created_at FROM cache WHERE key = ?')
        .get(key) as {
        key: string
        model: string
        result: string
        created_at: number
      } | null
      if (!row) return null
      return {
        key: row.key,
        model: row.model,
        result: row.result,
        createdAt: row.created_at,
      }
    },

    set(key: string, model: string, result: string): void {
      db.run(
        'INSERT OR REPLACE INTO cache (key, model, result, created_at) VALUES (?, ?, ?, ?)',
        [key, model, result, Math.floor(Date.now() / 1000)],
      )
    },
  }
}
