import type { Command } from '../../../services/forms/shaping/commands'
import { executeBatch } from '../../../services/forms/shaping/executor'
import type { ProjectStateClient } from './protocol'

interface AssistantElement extends HTMLElement {
  addMessage: (role: string, html: string) => void
  toggle: () => void
  open: boolean
}

interface ProposalState {
  commands: Command[]
  explanation: string
  originalIntent: string
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function describeCommand(cmd: Command, state: ProjectStateClient): string {
  const pageTitle = (id: string) =>
    state.formSpec.pages.find((p) => p.id === id)?.title ?? id
  const groupTitle = (id: string) =>
    state.dataSpec.groups.find((g) => g.id === id)?.title ?? id
  const fieldLabel = (id: string) => {
    for (const g of state.dataSpec.groups) {
      const f = g.requirements.find((r) => r.id === id)
      if (f) return f.label
    }
    return id
  }
  switch (cmd.kind) {
    case 'swapPages':
      return `Swap pages "${pageTitle(cmd.a)}" and "${pageTitle(cmd.b)}"`
    case 'reorderPages':
      return 'Reorder pages'
    case 'movePage':
      return `Move page "${pageTitle(cmd.id)}" to position ${cmd.toIndex + 1}`
    case 'addPage':
      return `Add page "${cmd.title}"`
    case 'removePage':
      return `Remove page "${pageTitle(cmd.id)}"`
    case 'renamePage':
      return `Rename page "${pageTitle(cmd.id)}" to "${cmd.title}"`
    case 'splitPage':
      return `Split page "${pageTitle(cmd.id)}"`
    case 'mergePages':
      return `Merge "${pageTitle(cmd.fromId)}" into "${pageTitle(cmd.intoId)}"`
    case 'setDeliveryMode':
      return `Set "${pageTitle(cmd.pageId)}" delivery to ${cmd.mode}`
    case 'moveGroup':
      return `Move group "${groupTitle(cmd.groupId)}" to "${pageTitle(cmd.toPageId)}"`
    case 'renameGroup':
      return `Rename group "${groupTitle(cmd.id)}" to "${cmd.title}"`
    case 'addGroup':
      return `Add group "${cmd.title}"`
    case 'removeGroup':
      return `Remove group "${groupTitle(cmd.id)}"`
    case 'splitGroup':
      return `Split group "${groupTitle(cmd.id)}"`
    case 'mergeGroups':
      return 'Merge groups'
    case 'moveField':
      return `Move field "${fieldLabel(cmd.fieldId)}"`
    case 'reorderFields':
      return `Reorder fields in "${groupTitle(cmd.groupId)}"`
    case 'relabelField':
      return `Relabel "${fieldLabel(cmd.id)}" to "${cmd.label}"`
    case 'setRequired':
      return `Mark "${fieldLabel(cmd.id)}" ${cmd.required ? 'required' : 'optional'}`
    case 'setFieldCondition':
      return cmd.condition
        ? `Set condition on "${fieldLabel(cmd.id)}"`
        : `Clear condition on "${fieldLabel(cmd.id)}"`
    case 'setFieldSensitivity':
      return `Set "${fieldLabel(cmd.id)}" sensitivity to ${cmd.level}`
    case 'changeFieldType':
      return `Change "${fieldLabel(cmd.id)}" type to ${cmd.fieldType}`
    case 'setFieldControl':
      return `Set "${fieldLabel(cmd.id)}" control to ${cmd.control}`
    case 'addField':
      return `Add field "${cmd.label}"`
    case 'removeField':
      return `Remove field "${fieldLabel(cmd.id)}"`
    default:
      return (cmd as Command).kind
  }
}

class FlexFormEditor extends HTMLElement {
  private state: ProjectStateClient | null = null
  private canonicalState: ProjectStateClient | null = null
  private buffer: Command[] = []
  private proposal: ProposalState | null = null
  private selectedPageIndex = 0

  connectedCallback() {
    this.hydrateState()
    this.bindEvents()
    this.sizeStickyPanels()
    window.addEventListener('scroll', this.sizeStickyPanels.bind(this), {
      passive: true,
    })
    window.addEventListener('resize', this.sizeStickyPanels.bind(this), {
      passive: true,
    })
    queueMicrotask(() => this.broadcastSpec())
    queueMicrotask(() => this.dispatchProjected())
  }

  private get assistant(): AssistantElement | null {
    return this.querySelector('flex-assistant') as AssistantElement | null
  }

  private hydrateState() {
    const stateScript = this.querySelector('script[data-initial-state]')
    if (stateScript?.textContent) {
      this.canonicalState = JSON.parse(
        stateScript.textContent,
      ) as ProjectStateClient
      this.state = this.canonicalState
    }
  }

  private sizeStickyPanels() {
    const panels = this.querySelectorAll<HTMLElement>(
      '.editor-structure, .editor-assistant',
    )
    for (const panel of panels) {
      const top = Math.max(0, panel.getBoundingClientRect().top)
      panel.style.height = `${window.innerHeight - top}px`
    }
  }

  private bindEvents() {
    // From flex-assistant: user typed a message
    this.addEventListener('assistant:message-submitted', (e) => {
      const detail = (e as CustomEvent).detail
      this.handleIntent(detail.text)
    })

    // From flex-form-structure: manual commands
    this.addEventListener('formeditor:manual-command', (e) =>
      this.handleManual((e as CustomEvent).detail),
    )

    // From flex-form-structure: page selection
    this.addEventListener('formeditor:select', (e) =>
      this.handleSelect((e as CustomEvent).detail),
    )

    // Stage a single command into the buffer
    this.addEventListener('formeditor:stage-command', (e) => {
      const detail = (e as CustomEvent).detail as {
        command: Command
        explanation: string
      }
      this.appendToBuffer([detail.command])
    })

    // Stage a batch of commands into the buffer
    this.addEventListener('formeditor:stage-batch', (e) => {
      const detail = (e as CustomEvent).detail as {
        commands: Command[]
        summary: string
      }
      this.appendToBuffer(detail.commands)
    })

    // Event delegation for accept/reject buttons inside assistant messages
    this.addEventListener('click', (e) => {
      const target = e.target as HTMLElement
      const action = target.closest<HTMLElement>('[data-proposal-action]')
      if (action) {
        const actionType = action.dataset.proposalAction
        if (actionType === 'accept') this.handleAccept()
        if (actionType === 'reject') this.handleReject()
        return
      }
      // "Open assistant" button in breadcrumb
      if (target.closest('[data-action="open-assistant"]')) {
        this.assistant?.toggle()
      }
    })
  }

  private editBase(): string {
    return this.dataset.editBase ?? ''
  }

  private async handleIntent(text: string) {
    if (!this.state) return
    const assistant = this.assistant
    if (!assistant) return

    // Show user message
    assistant.addMessage('user', escapeHtml(text))

    // Show thinking indicator
    assistant.addMessage('system', 'Thinking...')

    try {
      const response = await fetch(`${this.editBase()}/intent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          intent: text,
          previousAttempt: this.proposal
            ? { commands: this.proposal.commands, feedback: text }
            : undefined,
        }),
      })
      if (!response.ok) {
        const body = await response.json()
        this.replaceLastSystemMessage(
          `<span style="color:var(--flex-color-error)">Error: ${escapeHtml(body.error ?? 'Request failed')}</span>`,
        )
        return
      }
      const body = (await response.json()) as {
        commands: Command[]
        explanation: string
      }
      this.proposal = {
        commands: body.commands,
        explanation: body.explanation,
        originalIntent: text,
      }

      this.replaceLastSystemMessage(
        this.renderProposal(body.commands, body.explanation),
      )
    } catch (err) {
      this.replaceLastSystemMessage(
        `<span style="color:var(--flex-color-error)">Error: ${escapeHtml(err instanceof Error ? err.message : String(err))}</span>`,
      )
    }
  }

  private renderProposal(commands: Command[], explanation: string): string {
    const state = this.state
    if (!state) return explanation
    const list = commands
      .map((c) => `<li>${escapeHtml(describeCommand(c, state))}</li>`)
      .join('')
    return `
      <div>
        <p style="margin:0 0 var(--flex-space-xs);font-weight:600;">${escapeHtml(explanation)}</p>
        <ol style="margin:var(--flex-space-xs) 0;padding-inline-start:1.2em;font-size:var(--flex-text-xs);">${list}</ol>
        <div style="display:flex;gap:var(--flex-space-xs);margin-block-start:var(--flex-space-sm);">
          <button class="flex-button" data-proposal-action="accept" style="font-size:var(--flex-text-xs);padding:var(--flex-space-xs) var(--flex-space-sm);">Accept</button>
          <button class="flex-button" data-variant="outline" data-proposal-action="reject" style="font-size:var(--flex-text-xs);padding:var(--flex-space-xs) var(--flex-space-sm);">Reject</button>
        </div>
      </div>
    `
  }

  private replaceLastSystemMessage(html: string) {
    const messages = this.querySelectorAll('.assistant__message--system')
    const last = messages[messages.length - 1]
    if (last) {
      last.className = 'assistant__message assistant__message--assistant'
      last.innerHTML = html
    }
  }

  private handleReject() {
    this.proposal = null
    this.assistant?.addMessage('system', 'Proposal discarded.')
  }

  private async handleAccept() {
    if (!this.proposal) return
    const assistant = this.assistant
    assistant?.addMessage('system', 'Applying changes...')

    try {
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
        this.replaceLastSystemMessage(
          `<span style="color:var(--flex-color-error)">Failed: ${escapeHtml(body.error ?? 'Unknown error')}</span>`,
        )
        return
      }
      const body = (await response.json()) as { state: ProjectStateClient }
      this.state = body.state
      this.proposal = null
      this.broadcastSpec()
      this.replaceLastSystemMessage('Changes applied.')
    } catch (err) {
      this.replaceLastSystemMessage(
        `<span style="color:var(--flex-color-error)">Failed: ${escapeHtml(err instanceof Error ? err.message : String(err))}</span>`,
      )
    }
  }

  private async handleManual(detail: {
    command: Command
    explanation: string
  }) {
    try {
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
        this.assistant?.addMessage(
          'system',
          `<span style="color:var(--flex-color-error)">Failed: ${escapeHtml(body.error ?? 'Unknown error')}</span>`,
        )
        return
      }
      const body = (await response.json()) as { state: ProjectStateClient }
      this.state = body.state
      this.broadcastSpec()
      this.assistant?.addMessage('system', escapeHtml(detail.explanation))
    } catch (err) {
      this.assistant?.addMessage(
        'system',
        `<span style="color:var(--flex-color-error)">Failed: ${escapeHtml(err instanceof Error ? err.message : String(err))}</span>`,
      )
    }
  }

  private handleSelect(detail: {
    kind: 'page' | 'group' | 'field'
    id: string
  }) {
    if (detail.kind === 'page' && this.state) {
      const idx = this.state.formSpec.pages.findIndex((p) => p.id === detail.id)
      if (idx >= 0) {
        this.selectedPageIndex = idx
        this.reloadPreview()
      }
    }
  }

  private appendToBuffer(commands: Command[]) {
    if (!this.canonicalState) return
    const candidate = [...this.buffer, ...commands]
    const result = executeBatch(this.canonicalState, candidate)
    if (!result.ok) {
      this.dispatchEvent(
        new CustomEvent('formeditor:command-failed', {
          detail: { error: result.error, command: result.command },
          bubbles: true,
          composed: true,
        }),
      )
      return
    }
    this.buffer = candidate
    this.state = result.state
    this.dispatchProjected()
  }

  private dispatchProjected() {
    if (!this.state) return
    this.dispatchEvent(
      new CustomEvent('formeditor:state-projected', {
        detail: { state: this.state, bufferLength: this.buffer.length },
        bubbles: false,
      }),
    )
  }

  discardStaged(): void {
    this.buffer = []
    if (this.canonicalState) this.state = this.canonicalState
    this.dispatchProjected()
  }

  private broadcastSpec() {
    if (!this.state) return
    this.dispatchEvent(
      new CustomEvent('formeditor:spec-updated', {
        detail: { state: this.state },
        bubbles: false,
      }),
    )
    this.reloadPreview()
  }

  private reloadPreview() {
    const iframe = this.querySelector<HTMLIFrameElement>(
      'iframe.editor-preview-frame',
    )
    if (!iframe) return
    const base = this.dataset.previewBase ?? ''
    const ts = Date.now()
    iframe.src = `${base}?page=${this.selectedPageIndex}&t=${ts}`
  }
}

if (!customElements.get('flex-form-editor')) {
  customElements.define('flex-form-editor', FlexFormEditor)
}
