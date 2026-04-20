// SQLite implementation of ProjectStore.

import { Database } from 'bun:sqlite'
import type {
  NewProjectIndex,
  ProjectIndex,
  ProjectStatus,
} from '../../types/models'
import type { ProjectStore } from './types'

export function createProjectStore(dbPath: string): ProjectStore {
  const db = new Database(dbPath)
  db.run('PRAGMA journal_mode = WAL')
  db.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      forked_from TEXT,
      corpus_slug TEXT,
      status TEXT NOT NULL DEFAULT 'extracting',
      error TEXT,
      created_by TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)

  // Migration: handle incompatible old schema
  const columns = (
    db.query("SELECT name FROM pragma_table_info('projects')").all() as Array<{
      name: string
    }>
  ).map((row) => row.name)

  const hasOldColumns =
    columns.includes('description') || columns.includes('source_pdf')

  if (hasOldColumns) {
    // Old incompatible schema - drop and recreate
    console.warn('Incompatible old schema detected - recreating projects table')
    console.warn('Existing project data will be lost')
    db.run('DROP TABLE projects')
    db.run(`
      CREATE TABLE projects (
        id TEXT PRIMARY KEY,
        slug TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        forked_from TEXT,
        corpus_slug TEXT,
        status TEXT NOT NULL DEFAULT 'extracting',
        error TEXT,
        created_by TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `)
    console.log('Projects table recreated with current schema')
  } else if (!columns.includes('corpus_slug')) {
    // Forward-compatible migration: add corpus_slug to existing
    // projects tables. Nullable so historical PDF-based rows stay
    // valid.
    db.run('ALTER TABLE projects ADD COLUMN corpus_slug TEXT')
  }

  function rowToProject(row: Record<string, unknown>): ProjectIndex {
    return {
      id: row.id as string,
      slug: row.slug as string,
      name: row.name as string,
      forkedFrom: (row.forked_from as string | null) ?? null,
      corpusSlug: (row.corpus_slug as string | null) ?? null,
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
        `INSERT INTO projects (id, slug, name, forked_from, corpus_slug, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          project.slug,
          project.name,
          project.forkedFrom ?? null,
          project.corpusSlug ?? null,
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
