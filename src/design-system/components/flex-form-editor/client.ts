import type { Command } from '../../../services/forms/shaping/commands'
import type {
  FormEditorEvent,
  ProjectStateClient,
  ShapingLogEntryClient,
} from './protocol'

interface ProposalState {
  commands: Command[]
  explanation: string
  originalIntent: string
}

class FlexFormEditor extends HTMLElement {
  private state: ProjectStateClient | null = null
  private log: ShapingLogEntryClient[] = []
  private proposal: ProposalState | null = null
  private selection: {
    kind: 'page' | 'group' | 'field'
    id: string
  } | null = null

  connectedCallback() {
    this.hydrateState()
    this.bindEvents()
    this.broadcastSpec()
  }

  private hydrateState() {
    const stateScript = this.querySelector('script[data-initial-state]')
    if (stateScript?.textContent) {
      this.state = JSON.parse(stateScript.textContent) as ProjectStateClient
    }
    const logScript = this.querySelector('script[data-shaping-log]')
    if (logScript?.textContent) {
      this.log = JSON.parse(logScript.textContent) as ShapingLogEntryClient[]
    }
  }

  private bindEvents() {
    this.addEventListener('formeditor:intent-submitted', (e) =>
      this.handleIntent((e as CustomEvent).detail),
    )
    this.addEventListener('formeditor:proposal-accept', () =>
      this.handleAccept(),
    )
    this.addEventListener('formeditor:proposal-reject', () =>
      this.handleReject(),
    )
    this.addEventListener('formeditor:proposal-refine', (e) =>
      this.handleRefine((e as CustomEvent).detail),
    )
    this.addEventListener('formeditor:manual-command', (e) =>
      this.handleManual((e as CustomEvent).detail),
    )
    this.addEventListener('formeditor:select', (e) =>
      this.handleSelect((e as CustomEvent).detail),
    )
  }

  private editBase(): string {
    return this.dataset.editBase ?? ''
  }

  private async handleIntent(detail: { intent: string }) {
    if (!this.state) return
    try {
      const response = await fetch(`${this.editBase()}/intent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          intent: detail.intent,
          previousAttempt: undefined,
        }),
      })
      if (!response.ok) {
        const body = await response.json()
        this.dispatchOwn({
          type: 'formeditor:command-failed',
          detail: { error: body.error ?? 'request failed', command: null },
        })
        return
      }
      const body = (await response.json()) as {
        commands: Command[]
        explanation: string
      }
      this.proposal = {
        commands: body.commands,
        explanation: body.explanation,
        originalIntent: detail.intent,
      }
      this.dispatchOwn({
        type: 'formeditor:proposal-received',
        detail: { commands: body.commands, explanation: body.explanation },
      })
    } catch (err) {
      this.dispatchOwn({
        type: 'formeditor:command-failed',
        detail: {
          error: err instanceof Error ? err.message : String(err),
          command: null,
        },
      })
    }
  }

  private async handleRefine(detail: { feedback: string }) {
    if (!this.state || !this.proposal) return
    try {
      const response = await fetch(`${this.editBase()}/intent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          intent: this.proposal.originalIntent,
          previousAttempt: {
            commands: this.proposal.commands,
            feedback: detail.feedback,
          },
        }),
      })
      if (!response.ok) return
      const body = (await response.json()) as {
        commands: Command[]
        explanation: string
      }
      this.proposal = {
        commands: body.commands,
        explanation: body.explanation,
        originalIntent: this.proposal.originalIntent,
      }
      this.dispatchOwn({
        type: 'formeditor:proposal-received',
        detail: { commands: body.commands, explanation: body.explanation },
      })
    } catch {
      // refine failures leave previous proposal visible
    }
  }

  private handleReject() {
    this.proposal = null
    this.dispatchOwn({
      type: 'formeditor:proposal-received',
      detail: { commands: [], explanation: '' },
    })
  }

  private async handleAccept() {
    if (!this.proposal) return
    const response = await fetch(`${this.editBase()}/accept`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        commands: this.proposal.commands,
        explanation: this.proposal.explanation,
        source: 'llm',
      }),
    })
    if (!response.ok) {
      const body = await response.json()
      this.dispatchOwn({
        type: 'formeditor:command-failed',
        detail: { error: body.error ?? 'accept failed', command: null },
      })
      return
    }
    const body = (await response.json()) as { state: ProjectStateClient }
    this.state = body.state
    this.proposal = null
    this.broadcastSpec()
    this.dispatchOwn({
      type: 'formeditor:proposal-received',
      detail: { commands: [], explanation: '' },
    })
  }

  private async handleManual(detail: {
    command: Command
    explanation: string
  }) {
    const response = await fetch(`${this.editBase()}/execute`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        command: detail.command,
        explanation: detail.explanation,
      }),
    })
    if (!response.ok) {
      const body = await response.json()
      this.dispatchOwn({
        type: 'formeditor:command-failed',
        detail: {
          error: body.error ?? 'manual command failed',
          command: detail.command,
        },
      })
      return
    }
    const body = (await response.json()) as { state: ProjectStateClient }
    this.state = body.state
    this.broadcastSpec()
  }

  private handleSelect(detail: {
    kind: 'page' | 'group' | 'field'
    id: string
  }) {
    this.selection = detail
  }

  private broadcastSpec() {
    if (!this.state) return
    this.dispatchOwn({
      type: 'formeditor:spec-updated',
      detail: { state: this.state },
    })
    this.reloadPreview()
  }

  private reloadPreview() {
    const iframe = this.querySelector<HTMLIFrameElement>('iframe.editor-preview-frame')
    if (!iframe) return
    // Add a cache-busting query param to force reload
    const base = this.dataset.previewBase ?? ''
    const ts = Date.now()
    iframe.src = `${base}?page=0&t=${ts}`
  }

  private dispatchOwn(event: FormEditorEvent) {
    this.dispatchEvent(
      new CustomEvent(event.type, {
        detail: event.detail,
        bubbles: false,
      }),
    )
  }
}

if (!customElements.get('flex-form-editor')) {
  customElements.define('flex-form-editor', FlexFormEditor)
}
