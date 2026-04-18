import { Database } from 'bun:sqlite'
import type {
  FieldEntry,
  FormSession,
  FormSessionGateway,
  Submission,
} from './types'

export class SqliteFormSessionGateway implements FormSessionGateway {
  private db: Database

  constructor(dbPath: string) {
    this.db = new Database(dbPath)
    this.db.run('PRAGMA journal_mode = WAL')
    this.db.run(`
      CREATE TABLE IF NOT EXISTS form_sessions (
        id TEXT PRIMARY KEY,
        spec_id TEXT NOT NULL,
        form_spec_id TEXT NOT NULL,
        owner_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        fields TEXT NOT NULL DEFAULT '{}',
        spec_version TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `)
  }

  private rowToSession(row: Record<string, unknown>): FormSession {
    return {
      id: row.id as string,
      specId: row.spec_id as string,
      formSpecId: row.form_spec_id as string,
      ownerId: row.owner_id as string,
      status: row.status as 'active' | 'submitted',
      fields: JSON.parse(row.fields as string) as Record<string, FieldEntry>,
      specVersion: row.spec_version as string,
      createdAt: row.created_at as string,
    }
  }

  createSession(
    specId: string,
    formSpecId: string,
    ownerId: string,
    specVersion: string,
  ): FormSession {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    this.db.run(
      `INSERT INTO form_sessions (id, spec_id, form_spec_id, owner_id, spec_version, fields, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, '{}', ?, ?)`,
      [id, specId, formSpecId, ownerId, specVersion, now, now],
    )
    // biome-ignore lint/style/noNonNullAssertion: row was just inserted
    return this.getSession(id)!
  }

  getSession(id: string): FormSession | null {
    const row = this.db
      .query('SELECT * FROM form_sessions WHERE id = ?')
      .get(id) as Record<string, unknown> | null
    if (!row) return null
    return this.rowToSession(row)
  }

  listByOwner(ownerId: string): FormSession[] {
    const rows = this.db
      .query(
        'SELECT * FROM form_sessions WHERE owner_id = ? ORDER BY created_at DESC',
      )
      .all(ownerId) as Record<string, unknown>[]
    return rows.map((row) => this.rowToSession(row))
  }

  writeFields(sessionId: string, fields: Record<string, FieldEntry>): void {
    const session = this.getSession(sessionId)
    if (!session) throw new Error(`Session "${sessionId}" not found`)
    const merged = { ...session.fields, ...fields }
    this.db.run(
      'UPDATE form_sessions SET fields = ?, updated_at = ? WHERE id = ?',
      [JSON.stringify(merged), new Date().toISOString(), sessionId],
    )
  }

  submit(sessionId: string): Submission {
    const session = this.getSession(sessionId)
    if (!session) throw new Error(`Session "${sessionId}" not found`)
    this.db.run(
      'UPDATE form_sessions SET status = ?, updated_at = ? WHERE id = ?',
      ['submitted', new Date().toISOString(), sessionId],
    )
    const data: Record<string, unknown> = {}
    for (const [key, entry] of Object.entries(session.fields)) {
      if (entry.value !== null) {
        data[key] = entry.value
      }
    }
    return {
      id: crypto.randomUUID(),
      sessionId,
      specId: session.specId,
      formSpecId: session.formSpecId,
      ownerId: session.ownerId,
      data,
      specVersion: session.specVersion,
      submittedAt: new Date().toISOString(),
    }
  }
}
