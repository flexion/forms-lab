import { Database } from 'bun:sqlite'
import type { Submission, SubmissionGateway } from './types'

export class SqliteSubmissionGateway implements SubmissionGateway {
  private db: Database

  constructor(dbPath: string) {
    this.db = new Database(dbPath)
    this.db.run('PRAGMA journal_mode = WAL')
    this.db.run(`
      CREATE TABLE IF NOT EXISTS form_submissions (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        spec_id TEXT NOT NULL,
        form_spec_id TEXT NOT NULL,
        owner_id TEXT NOT NULL,
        data TEXT NOT NULL,
        spec_version TEXT NOT NULL,
        submitted_at TEXT NOT NULL
      )
    `)
  }

  private rowToSubmission(row: Record<string, unknown>): Submission {
    return {
      id: row.id as string,
      sessionId: row.session_id as string,
      specId: row.spec_id as string,
      formSpecId: row.form_spec_id as string,
      ownerId: row.owner_id as string,
      data: JSON.parse(row.data as string) as Record<string, unknown>,
      specVersion: row.spec_version as string,
      submittedAt: row.submitted_at as string,
    }
  }

  save(submission: Submission): void {
    this.db.run(
      `INSERT OR REPLACE INTO form_submissions
       (id, session_id, spec_id, form_spec_id, owner_id, data, spec_version, submitted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        submission.id,
        submission.sessionId,
        submission.specId,
        submission.formSpecId,
        submission.ownerId,
        JSON.stringify(submission.data),
        submission.specVersion,
        submission.submittedAt,
      ],
    )
  }

  getSubmission(id: string): Submission | null {
    const row = this.db
      .query('SELECT * FROM form_submissions WHERE id = ?')
      .get(id) as Record<string, unknown> | null
    if (!row) return null
    return this.rowToSubmission(row)
  }

  listByOwner(ownerId: string): Submission[] {
    const rows = this.db
      .query(
        'SELECT * FROM form_submissions WHERE owner_id = ? ORDER BY submitted_at DESC',
      )
      .all(ownerId) as Record<string, unknown>[]
    return rows.map((row) => this.rowToSubmission(row))
  }
}
