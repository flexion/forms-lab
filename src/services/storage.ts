import { Database } from 'bun:sqlite'
import type {
  NewProjectIndex,
  ProjectIndex,
  ProjectStatus,
} from '../types/models'

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
  create(project: NewProjectIndex): ProjectIndex
  get(id: string): ProjectIndex | null
  getBySlug(slug: string): ProjectIndex | null
  list(userId?: string): ProjectIndex[]
  update(
    id: string,
    changes: Partial<Pick<ProjectIndex, 'status' | 'error'>>,
  ): ProjectIndex
  delete(id: string): void
}

export function createProjectStore(dbPath: string): ProjectStore {
  const db = new Database(dbPath)
  db.run('PRAGMA journal_mode = WAL')
  db.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      forked_from TEXT,
      status TEXT NOT NULL DEFAULT 'extracting',
      error TEXT,
      created_by TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)

  // Migration: ensure all columns exist (for databases created with old schemas)
  const columns = (
    db.query("SELECT name FROM pragma_table_info('projects')").all() as Array<{
      name: string
    }>
  ).map((row) => row.name)

  const requiredColumns = [
    'id',
    'slug',
    'name',
    'forked_from',
    'status',
    'error',
    'created_by',
    'created_at',
    'updated_at',
  ]
  const missingColumns = requiredColumns.filter((col) => !columns.includes(col))

  if (missingColumns.length > 0) {
    // Add missing columns one by one
    for (const col of missingColumns) {
      if (col === 'slug') {
        db.run('ALTER TABLE projects ADD COLUMN slug TEXT')
      } else if (col === 'forked_from') {
        db.run('ALTER TABLE projects ADD COLUMN forked_from TEXT')
      } else if (col === 'error') {
        db.run('ALTER TABLE projects ADD COLUMN error TEXT')
      }
    }

    // Backfill slug from name for existing rows if slug was missing
    if (missingColumns.includes('slug')) {
      const projects = db.query('SELECT id, name FROM projects').all() as Array<{
        id: string
        name: string
      }>
      for (const project of projects) {
        const slug = project.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
        db.run('UPDATE projects SET slug = ? WHERE id = ?', [slug, project.id])
      }
    }

    // Recreate table with proper constraints
    db.run(`
      CREATE TABLE projects_new (
        id TEXT PRIMARY KEY,
        slug TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        forked_from TEXT,
        status TEXT NOT NULL DEFAULT 'extracting',
        error TEXT,
        created_by TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `)
    db.run('INSERT INTO projects_new SELECT * FROM projects')
    db.run('DROP TABLE projects')
    db.run('ALTER TABLE projects_new RENAME TO projects')
  }

  function rowToProject(row: Record<string, unknown>): ProjectIndex {
    return {
      id: row.id as string,
      slug: row.slug as string,
      name: row.name as string,
      forkedFrom: (row.forked_from as string | null) ?? null,
      status: row.status as ProjectStatus,
      error: (row.error as string | null) ?? null,
      createdBy: row.created_by as string,
      createdAt: row.created_at as number,
      updatedAt: row.updated_at as number,
    }
  }

  return {
    create(project: NewProjectIndex): ProjectIndex {
      const id = crypto.randomUUID()
      const now = Math.floor(Date.now() / 1000)
      db.run(
        `INSERT INTO projects (id, slug, name, forked_from, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          project.slug,
          project.name,
          project.forkedFrom ?? null,
          project.createdBy,
          now,
          now,
        ],
      )
      // biome-ignore lint/style/noNonNullAssertion: row was just inserted
      return this.get(id)!
    },

    get(id: string): ProjectIndex | null {
      const row = db
        .query('SELECT * FROM projects WHERE id = ?')
        .get(id) as Record<string, unknown> | null
      if (!row) return null
      return rowToProject(row)
    },

    getBySlug(slug: string): ProjectIndex | null {
      const row = db
        .query('SELECT * FROM projects WHERE slug = ?')
        .get(slug) as Record<string, unknown> | null
      if (!row) return null
      return rowToProject(row)
    },

    list(userId?: string): ProjectIndex[] {
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
      changes: Partial<Pick<ProjectIndex, 'status' | 'error'>>,
    ): ProjectIndex {
      const sets: string[] = ['updated_at = ?']
      const values: (string | number | null)[] = [Math.floor(Date.now() / 1000)]

      if (changes.status !== undefined) {
        sets.push('status = ?')
        values.push(changes.status)
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
