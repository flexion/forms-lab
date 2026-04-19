import { Database } from 'bun:sqlite'
import type {
  ConversationGateway,
  ConversationMessage,
} from './filling-agent/types'

export class SqliteConversationGateway implements ConversationGateway {
  private db: Database

  constructor(dbPath: string) {
    this.db = new Database(dbPath)
    this.db.run('PRAGMA journal_mode = WAL')
    this.db.run(`
      CREATE TABLE IF NOT EXISTS conversation_messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        tool_calls TEXT,
        created_at TEXT NOT NULL
      )
    `)
    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_conversation_messages_session_id
      ON conversation_messages(session_id)
    `)
  }

  appendMessage(sessionId: string, message: ConversationMessage): void {
    const toolCallsJson = message.toolCalls
      ? JSON.stringify(message.toolCalls)
      : null

    this.db.run(
      `INSERT INTO conversation_messages (id, session_id, role, content, tool_calls, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        message.id,
        sessionId,
        message.role,
        message.content,
        toolCallsJson,
        message.createdAt,
      ],
    )
  }

  getMessages(sessionId: string): ConversationMessage[] {
    const rows = this.db
      .query(
        `SELECT * FROM conversation_messages
         WHERE session_id = ?
         ORDER BY created_at ASC, id ASC`,
      )
      .all(sessionId) as Record<string, unknown>[]

    return rows.map((row) => this.rowToMessage(row))
  }

  clear(sessionId: string): void {
    this.db.run('DELETE FROM conversation_messages WHERE session_id = ?', [
      sessionId,
    ])
  }

  private rowToMessage(row: Record<string, unknown>): ConversationMessage {
    const message: ConversationMessage = {
      id: row.id as string,
      sessionId: row.session_id as string,
      role: row.role as 'user' | 'assistant',
      content: row.content as string,
      createdAt: row.created_at as string,
    }

    if (row.tool_calls) {
      message.toolCalls = JSON.parse(row.tool_calls as string)
    }

    return message
  }
}
