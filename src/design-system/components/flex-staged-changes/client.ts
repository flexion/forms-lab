import type {
  Command,
  ProjectState,
} from '../../../services/forms/shaping/commands'
import { executeBatch } from '../../../services/forms/shaping/executor'
import { humanize } from '../../../services/forms/shaping/humanize'

class FlexStagedChanges extends HTMLElement {
  private commands: Command[] = []
  private baseState: ProjectState | null = null

  update(commands: Command[], baseState: ProjectState): void {
    this.commands = commands
    this.baseState = baseState
    this.render()
  }

  private render(): void {
    if (this.commands.length === 0 || !this.baseState) {
      this.innerHTML = `
        <div class="staged-changes">
          <div class="staged-changes__title">No pending changes</div>
          <p class="staged-changes__empty">Edits and accepted assistant suggestions will appear here.</p>
        </div>
      `
      return
    }
    let state = this.baseState
    const lines: string[] = []
    for (const cmd of this.commands) {
      lines.push(humanize(cmd, state))
      const next = executeBatch(state, [cmd])
      if (next.ok) state = next.state
    }
    const items = lines
      .map(
        (text, i) =>
          `<li class="staged-changes__item">
             <span>${escapeHtml(text)}</span>
             <button type="button" class="staged-changes__remove" data-index="${i}" aria-label="Remove">&times;</button>
           </li>`,
      )
      .join('')
    this.innerHTML = `
      <div class="staged-changes">
        <div class="staged-changes__title">Pending changes (${this.commands.length})</div>
        <ol class="staged-changes__list">${items}</ol>
      </div>
    `
    for (const btn of this.querySelectorAll<HTMLButtonElement>(
      '.staged-changes__remove',
    )) {
      btn.addEventListener('click', () => {
        const index = Number(btn.dataset.index)
        this.dispatchEvent(
          new CustomEvent('staged-changes:remove', {
            detail: { index },
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

if (!customElements.get('flex-staged-changes')) {
  customElements.define('flex-staged-changes', FlexStagedChanges)
}
