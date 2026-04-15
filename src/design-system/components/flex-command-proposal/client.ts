import type { Command } from '../../../services/forms/shaping/commands'
import type { ProjectStateClient } from '../flex-form-editor/protocol'

function pageTitle(state: ProjectStateClient, id: string): string {
  return state.formSpec.pages.find((p) => p.id === id)?.title ?? id
}

function groupTitle(state: ProjectStateClient, id: string): string {
  return state.dataSpec.groups.find((g) => g.id === id)?.title ?? id
}

function fieldLabel(state: ProjectStateClient, id: string): string {
  for (const g of state.dataSpec.groups) {
    const f = g.requirements.find((r) => r.id === id)
    if (f) return f.label
  }
  return id
}

// Client-side humanizer. Mirrors services/forms/shaping/humanize.ts but lives
// in the design-system layer so the component owns its presentation logic
// without a runtime dependency on services/ (per P2 / dependency-rule test).
function describe(command: Command, state: ProjectStateClient): string {
  switch (command.kind) {
    case 'reorderPages':
      return `Reorder pages: ${command.order.map((id) => `"${pageTitle(state, id)}"`).join(', ')}`
    case 'swapPages':
      return `Swap pages "${pageTitle(state, command.a)}" and "${pageTitle(state, command.b)}"`
    case 'movePage':
      return `Move page "${pageTitle(state, command.id)}" to position ${command.toIndex + 1}`
    case 'addPage':
      return `Add page "${command.title}"${command.afterPageId ? ` after "${pageTitle(state, command.afterPageId)}"` : ''}`
    case 'removePage':
      return `Remove page "${pageTitle(state, command.id)}"`
    case 'renamePage':
      return `Rename page "${pageTitle(state, command.id)}" to "${command.title}"`
    case 'splitPage':
      return `Split page "${pageTitle(state, command.id)}" - move ${command.groupsToMove.length} group(s) to new page "${command.newTitle}"`
    case 'mergePages':
      return `Merge "${pageTitle(state, command.fromId)}" into "${pageTitle(state, command.intoId)}"`
    case 'setDeliveryMode':
      return `Set "${pageTitle(state, command.pageId)}" delivery mode to ${command.mode}`
    case 'moveGroup':
      return `Move group "${groupTitle(state, command.groupId)}" to page "${pageTitle(state, command.toPageId)}"`
    case 'renameGroup':
      return `Rename group "${groupTitle(state, command.id)}" to "${command.title}"`
    case 'addGroup':
      return `Add group "${command.title}" to page "${pageTitle(state, command.pageId)}"`
    case 'removeGroup':
      return `Remove group "${groupTitle(state, command.id)}"`
    case 'splitGroup':
      return `Split group "${groupTitle(state, command.id)}" - move ${command.fieldsToMove.length} field(s) to new group "${command.newTitle}"`
    case 'mergeGroups':
      return `Merge group "${groupTitle(state, command.fromId)}" into "${groupTitle(state, command.intoId)}"`
    case 'moveField':
      return `Move field "${fieldLabel(state, command.fieldId)}" to group "${groupTitle(state, command.toGroupId)}"`
    case 'reorderFields':
      return `Reorder fields in group "${groupTitle(state, command.groupId)}"`
    case 'relabelField':
      return `Relabel field "${fieldLabel(state, command.id)}" to "${command.label}"`
    case 'setRequired':
      return `Mark field "${fieldLabel(state, command.id)}" ${command.required ? 'required' : 'optional'}`
    case 'setFieldCondition':
      return command.condition
        ? `Set condition on field "${fieldLabel(state, command.id)}"`
        : `Clear condition on field "${fieldLabel(state, command.id)}"`
    case 'setFieldSensitivity':
      return `Set sensitivity of field "${fieldLabel(state, command.id)}" to ${command.level}`
    case 'changeFieldType':
      return `Change type of field "${fieldLabel(state, command.id)}" to ${command.fieldType}`
    case 'setFieldControl':
      return `Set control of field "${fieldLabel(state, command.id)}" to ${command.control}`
    case 'addField':
      return `Add ${command.fieldType} field "${command.label}" to group "${groupTitle(state, command.groupId)}"`
    case 'removeField':
      return `Remove field "${fieldLabel(state, command.id)}"`
  }
}

class FlexCommandProposal extends HTMLElement {
  private state: ProjectStateClient | null = null
  private proposal: { commands: Command[]; explanation: string } = {
    commands: [],
    explanation: '',
  }

  connectedCallback() {
    this.render()
    const root = this.closest('flex-form-editor')
    if (root) {
      root.addEventListener('formeditor:spec-updated', (e) => {
        this.state = (e as CustomEvent).detail.state
        this.render()
      })
      root.addEventListener('formeditor:proposal-received', (e) => {
        this.proposal = (e as CustomEvent).detail
        this.render()
      })
      root.addEventListener('formeditor:command-failed', (e) => {
        const detail = (e as CustomEvent).detail
        this.renderError(detail.error)
      })
    }
  }

  private render() {
    const hasProposal = this.proposal.commands.length > 0
    this.innerHTML = `
      <section class="command-proposal">
        <h2>Reshape with AI</h2>
        <form class="command-proposal__intent-form">
          <label class="flex-label" for="intent-input">Describe how you want to change the form</label>
          <textarea id="intent-input" name="intent" class="flex-textarea" rows="3"
            placeholder="e.g., Add an eligibility screener before the employment section"></textarea>
          <button type="submit" class="flex-button">Suggest changes</button>
        </form>
        ${hasProposal ? this.renderProposal() : ''}
      </section>
    `
    this.bindHandlers()
  }

  private renderProposal(): string {
    const list = this.proposal.commands
      .map((c) => {
        const text = this.state ? describe(c, this.state) : c.kind
        return `<li>${escapeHtml(text)}</li>`
      })
      .join('')
    return `
      <div class="command-proposal__preview">
        <p class="command-proposal__explanation">${escapeHtml(this.proposal.explanation)}</p>
        <ol class="command-proposal__list">${list}</ol>
        <form class="command-proposal__refine-form">
          <label class="flex-label" for="refine-input">Not quite? Refine it:</label>
          <input type="text" id="refine-input" name="feedback" class="flex-text-input" />
          <div class="l-cluster">
            <button type="button" class="flex-button" data-action="accept">Accept</button>
            <button type="button" class="flex-button" data-variant="outline" data-action="reject">Reject</button>
            <button type="submit" class="flex-button" data-variant="outline">Refine</button>
          </div>
        </form>
      </div>
    `
  }

  private renderError(msg: string) {
    const existing = this.querySelector('.command-proposal__error')
    if (existing) existing.remove()
    const div = document.createElement('div')
    div.className = 'command-proposal__error flex-alert'
    div.setAttribute('data-variant', 'error')
    div.innerHTML = `<div class="flex-alert__body"><p class="flex-alert__text">${escapeHtml(msg)}</p></div>`
    this.querySelector('.command-proposal')?.appendChild(div)
  }

  private bindHandlers() {
    const intentForm = this.querySelector<HTMLFormElement>(
      '.command-proposal__intent-form',
    )
    if (intentForm) {
      intentForm.addEventListener('submit', (e) => {
        e.preventDefault()
        const data = new FormData(intentForm)
        const intent = String(data.get('intent') ?? '').trim()
        if (!intent) return
        this.dispatchEvent(
          new CustomEvent('formeditor:intent-submitted', {
            detail: { intent },
            bubbles: true,
            composed: true,
          }),
        )
      })
    }
    const refineForm = this.querySelector<HTMLFormElement>(
      '.command-proposal__refine-form',
    )
    if (refineForm) {
      refineForm.addEventListener('submit', (e) => {
        e.preventDefault()
        const data = new FormData(refineForm)
        const feedback = String(data.get('feedback') ?? '').trim()
        if (!feedback) return
        this.dispatchEvent(
          new CustomEvent('formeditor:proposal-refine', {
            detail: { feedback },
            bubbles: true,
            composed: true,
          }),
        )
      })
      refineForm
        .querySelector('[data-action="accept"]')
        ?.addEventListener('click', () => {
          this.dispatchEvent(
            new CustomEvent('formeditor:proposal-accept', {
              detail: {},
              bubbles: true,
              composed: true,
            }),
          )
        })
      refineForm
        .querySelector('[data-action="reject"]')
        ?.addEventListener('click', () => {
          this.dispatchEvent(
            new CustomEvent('formeditor:proposal-reject', {
              detail: {},
              bubbles: true,
              composed: true,
            }),
          )
        })
    }
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

if (!customElements.get('flex-command-proposal')) {
  customElements.define('flex-command-proposal', FlexCommandProposal)
}
