import type {
  FieldEntry,
  FormSession,
  FormSessionGateway,
  Submission,
} from '../types/models'

export class InMemoryFormSessionGateway implements FormSessionGateway {
  private sessions = new Map<string, FormSession>()

  createSession(
    specId: string,
    formSpecId: string,
    ownerId: string,
  ): FormSession {
    const session: FormSession = {
      id: crypto.randomUUID(),
      specId,
      formSpecId,
      ownerId,
      fields: {},
      status: 'active',
      createdAt: new Date().toISOString(),
    }
    this.sessions.set(session.id, session)
    return session
  }

  getSession(id: string): FormSession | null {
    return this.sessions.get(id) ?? null
  }

  listByOwner(ownerId: string): FormSession[] {
    return [...this.sessions.values()].filter((s) => s.ownerId === ownerId)
  }

  writeFields(sessionId: string, fields: Record<string, FieldEntry>): void {
    const session = this.sessions.get(sessionId)
    if (!session) throw new Error(`Session "${sessionId}" not found`)
    session.fields = { ...session.fields, ...fields }
  }

  submit(sessionId: string): Submission {
    const session = this.sessions.get(sessionId)
    if (!session) throw new Error(`Session "${sessionId}" not found`)
    session.status = 'submitted'
    const data: Record<string, unknown> = {}
    for (const [key, entry] of Object.entries(session.fields)) {
      if (entry.value !== null) {
        data[key] = entry.value
      }
    }
    const submission: Submission = {
      id: crypto.randomUUID(),
      specId: session.specId,
      formSpecId: session.formSpecId,
      ownerId: session.ownerId,
      data,
      submittedAt: new Date().toISOString(),
    }
    return submission
  }
}
