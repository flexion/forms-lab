import { Database } from 'bun:sqlite'
import {
  isTask,
  type Task,
  type VariantPreference,
  type VariantPreferencesGateway,
} from './types'

export function createVariantPreferencesGateway(
  dbPath: string,
): VariantPreferencesGateway {
  const db = new Database(dbPath)
  db.run('PRAGMA journal_mode = WAL')
  db.run(`
    CREATE TABLE IF NOT EXISTS user_variant_preferences (
      user_login TEXT NOT NULL,
      task TEXT NOT NULL,
      variant_id TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (user_login, task)
    )
  `)

  function rowToPreference(row: {
    user_login: string
    task: string
    variant_id: string
    updated_at: number
  }): VariantPreference {
    if (!isTask(row.task)) {
      throw new Error(`Invalid task in DB: ${row.task}`)
    }
    return {
      userLogin: row.user_login,
      task: row.task,
      variantId: row.variant_id,
      updatedAt: row.updated_at,
    }
  }

  return {
    get(userLogin: string, task: Task): VariantPreference | null {
      const row = db
        .query(
          'SELECT user_login, task, variant_id, updated_at FROM user_variant_preferences WHERE user_login = ? AND task = ?',
        )
        .get(userLogin, task) as {
        user_login: string
        task: string
        variant_id: string
        updated_at: number
      } | null
      return row ? rowToPreference(row) : null
    },

    set(userLogin: string, task: Task, variantId: string): VariantPreference {
      const now = Math.floor(Date.now() / 1000)
      db.run(
        `INSERT INTO user_variant_preferences (user_login, task, variant_id, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(user_login, task) DO UPDATE SET
           variant_id = excluded.variant_id,
           updated_at = excluded.updated_at`,
        [userLogin, task, variantId, now],
      )
      return {
        userLogin,
        task,
        variantId,
        updatedAt: now,
      }
    },

    listByUser(userLogin: string): VariantPreference[] {
      const rows = db
        .query(
          'SELECT user_login, task, variant_id, updated_at FROM user_variant_preferences WHERE user_login = ?',
        )
        .all(userLogin) as {
        user_login: string
        task: string
        variant_id: string
        updated_at: number
      }[]
      return rows.map(rowToPreference)
    },
  }
}
