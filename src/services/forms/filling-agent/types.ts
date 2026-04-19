// src/services/forms/filling-agent/types.ts
import type { RequirementGroup } from '../../data-collection/types'
import type { FieldEntry } from '../types'

export interface ConversationMessage {
  id: string
  sessionId: string
  role: 'user' | 'assistant'
  content: string
  toolCalls?: ToolCallRecord[]
  createdAt: string
}

export interface ToolCallRecord {
  tool: 'collect_field' | 'explain_field' | 'skip_field'
  input: Record<string, string>
}

export interface FillingContext {
  groups: RequirementGroup[]
  collectedFields: Record<string, FieldEntry>
  messages: ConversationMessage[]
}

export interface FillingTurn {
  message: string
  fieldsCollected: Record<string, FieldEntry>
  finished: boolean
  toolCalls: ToolCallRecord[]
}

export interface FillingAgent {
  advance(context: FillingContext, userResponse: string | null): Promise<FillingTurn>
}

export interface ConversationGateway {
  appendMessage(sessionId: string, message: ConversationMessage): void
  getMessages(sessionId: string): ConversationMessage[]
  clear(sessionId: string): void
}
