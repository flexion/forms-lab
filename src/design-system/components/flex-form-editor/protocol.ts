import type { DataCollectionSpec } from '../../../services/data-collection'
import type { Command, FormSpec } from '../../../services/forms'

export interface ProjectStateClient {
  formSpec: FormSpec
  dataSpec: DataCollectionSpec
}

export interface ShapingLogEntryClient {
  timestamp: string
  authorCommit: string
  source: 'llm' | 'manual'
  commands: Command[]
  explanation: string
  variantId?: string
  modelId?: string
}

export type SelectionTarget = {
  kind: 'page' | 'group' | 'field'
  id: string
}

export type FormEditorEvent =
  | {
      type: 'formeditor:select'
      detail: SelectionTarget
    }
  | {
      type: 'formeditor:deselect'
      detail: Record<string, never>
    }
  | {
      type: 'formeditor:selection-changed'
      detail: { selection: SelectionTarget | null }
    }
  | {
      type: 'formeditor:switch-page'
      detail: { id: string }
    }
  | {
      type: 'formeditor:proposal-received'
      detail: { commands: Command[]; explanation: string }
    }
  | { type: 'formeditor:proposal-accept'; detail: Record<string, never> }
  | { type: 'formeditor:proposal-reject'; detail: Record<string, never> }
  | { type: 'formeditor:proposal-refine'; detail: { feedback: string } }
  | {
      type: 'formeditor:spec-updated'
      detail: { state: ProjectStateClient }
    }
  | {
      type: 'formeditor:state-projected'
      detail: { state: ProjectStateClient; bufferLength: number }
    }
  | {
      type: 'formeditor:command-failed'
      detail: { error: string; command: Command | null }
    }
  | {
      type: 'formeditor:manual-command'
      detail: { command: Command; explanation: string }
    }
  | {
      type: 'formeditor:stage-command'
      detail: { command: Command; explanation: string }
    }
  | {
      type: 'formeditor:stage-batch'
      detail: { commands: Command[]; summary: string; source: 'llm' }
    }
  | {
      type: 'formeditor:intent-submitted'
      detail: { intent: string }
    }

export function dispatchEditorEvent(
  target: EventTarget,
  event: FormEditorEvent,
): void {
  target.dispatchEvent(
    new CustomEvent(event.type, {
      detail: event.detail,
      bubbles: true,
      composed: true,
    }),
  )
}
