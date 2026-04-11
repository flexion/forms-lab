import { Database } from 'bun:sqlite'
import type { DataCollectionSpec } from './data-collection/types'
import type { FormSpec } from './forms/types'
import type {
  FieldConfidence,
  NewProject,
  ProjectStatus,
  StoredProject,
} from './ingestion/types'

export interface CacheEntry {
  key: string
  model: string
  result: string
  createdAt: number
}

export interface CacheStore {
  get(key: string): CacheEntry | null
  set(key: string, model: string, result: string): void
}

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

export interface ProjectStore {
  create(project: NewProject): StoredProject
  get(id: string): StoredProject | null
  list(userId?: string): StoredProject[]
  update(
    id: string,
    changes: Partial<
      Pick<
        StoredProject,
        'status' | 'spec' | 'formSpec' | 'confidence' | 'error'
      >
    >,
  ): StoredProject
  delete(id: string): void
}

export function createProjectStore(dbPath: string): ProjectStore {
  const db = new Database(dbPath)
  db.run('PRAGMA journal_mode = WAL')
  db.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'extracting',
      source_pdf BLOB NOT NULL,
      spec TEXT,
      form_spec TEXT,
      confidence TEXT,
      error TEXT,
      created_by TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)

  function rowToProject(row: Record<string, unknown>): StoredProject {
    return {
      id: row.id as string,
      name: row.name as string,
      description: row.description as string,
      status: row.status as ProjectStatus,
      sourcePdf: row.source_pdf as Buffer,
      spec: row.spec
        ? (JSON.parse(row.spec as string) as DataCollectionSpec)
        : null,
      formSpec: row.form_spec
        ? (JSON.parse(row.form_spec as string) as FormSpec)
        : null,
      confidence: row.confidence
        ? (JSON.parse(row.confidence as string) as FieldConfidence[])
        : null,
      error: (row.error as string | null) ?? null,
      createdBy: row.created_by as string,
      createdAt: row.created_at as number,
      updatedAt: row.updated_at as number,
    }
  }

  return {
    create(project: NewProject): StoredProject {
      const id = crypto.randomUUID()
      const now = Math.floor(Date.now() / 1000)
      db.run(
        `INSERT INTO projects (id, name, description, status, source_pdf, created_by, created_at, updated_at)
         VALUES (?, ?, ?, 'extracting', ?, ?, ?, ?)`,
        [
          id,
          project.name,
          project.description,
          project.sourcePdf,
          project.createdBy,
          now,
          now,
        ],
      )
      // biome-ignore lint/style/noNonNullAssertion: row was just inserted
      return this.get(id)!
    },

    get(id: string): StoredProject | null {
      const row = db
        .query('SELECT * FROM projects WHERE id = ?')
        .get(id) as Record<string, unknown> | null
      if (!row) return null
      return rowToProject(row)
    },

    list(userId?: string): StoredProject[] {
      const query = userId
        ? db.query(
            'SELECT * FROM projects WHERE created_by = ? ORDER BY created_at DESC',
          )
        : db.query('SELECT * FROM projects ORDER BY created_at DESC')
      const rows = (userId ? query.all(userId) : query.all()) as Record<
        string,
        unknown
      >[]
      return rows.map(rowToProject)
    },

    update(
      id: string,
      changes: Partial<
        Pick<
          StoredProject,
          'status' | 'spec' | 'formSpec' | 'confidence' | 'error'
        >
      >,
    ): StoredProject {
      const sets: string[] = ['updated_at = ?']
      const values: (string | number | null)[] = [Math.floor(Date.now() / 1000)]

      if (changes.status !== undefined) {
        sets.push('status = ?')
        values.push(changes.status)
      }
      if (changes.spec !== undefined) {
        sets.push('spec = ?')
        values.push(JSON.stringify(changes.spec))
      }
      if (changes.formSpec !== undefined) {
        sets.push('form_spec = ?')
        values.push(JSON.stringify(changes.formSpec))
      }
      if (changes.confidence !== undefined) {
        sets.push('confidence = ?')
        values.push(JSON.stringify(changes.confidence))
      }
      if (changes.error !== undefined) {
        sets.push('error = ?')
        values.push(changes.error)
      }

      values.push(id)
      db.run(`UPDATE projects SET ${sets.join(', ')} WHERE id = ?`, values)
      // biome-ignore lint/style/noNonNullAssertion: row was just updated
      return this.get(id)!
    },

    delete(id: string): void {
      db.run('DELETE FROM projects WHERE id = ?', [id])
    },
  }
}
