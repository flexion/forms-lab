import type { RequirementGroup } from '../../../services/data-collection/types'
import type { Command } from '../../../services/forms/shaping/commands'

class FlexEditableGroup extends HTMLElement {
  private group: RequirementGroup | null = null

  update(group: RequirementGroup): void {
    this.group = group
    this.render()
  }

  private render() {
    if (!this.group) {
      this.innerHTML = ''
      return
    }
    const g = this.group
    const fields = g.requirements
      .map(
        (req) =>
          `<flex-editable-field data-field-id="${req.id}" data-group-id="${g.id}"></flex-editable-field>`,
      )
      .join('')
    this.innerHTML = `
      <header class="editable-group__header">
        <input type="text" class="editable-group__title-input flex-input" value="${escapeHtml(g.title)}" aria-label="Group title" />
        <button type="button" class="flex-button" data-variant="ghost" data-action="add-field">+ Field</button>
        <button type="button" class="flex-button" data-variant="ghost" data-action="remove-group" aria-label="Remove group">&times;</button>
      </header>
      <div class="editable-group__fields">${fields}</div>
    `
    const dispatch = (command: Command, explanation: string) => {
      this.dispatchEvent(
        new CustomEvent('formeditor:stage-command', {
          detail: { command, explanation },
          bubbles: true,
          composed: true,
        }),
      )
    }
    const titleInput = this.querySelector<HTMLInputElement>('.editable-group__title-input')
    titleInput?.addEventListener('change', () => {
      if (titleInput.value === g.title) return
      dispatch(
        { kind: 'renameGroup', id: g.id, title: titleInput.value },
        `Rename group to "${titleInput.value}"`,
      )
    })
    this.querySelector('[data-action="add-field"]')?.addEventListener('click', () =>
      dispatch(
        { kind: 'addField', groupId: g.id, label: 'New field', fieldType: 'text', required: false },
        `Add field to "${g.title}"`,
      ),
    )
    this.querySelector('[data-action="remove-group"]')?.addEventListener('click', () =>
      dispatch({ kind: 'removeGroup', id: g.id }, `Remove group "${g.title}"`),
    )
    // Hand off to flex-editable-field children (component from Task 15 — may not exist yet)
    for (const child of this.querySelectorAll('flex-editable-field')) {
      const fieldId = (child as HTMLElement).dataset.fieldId
      const field = g.requirements.find((r) => r.id === fieldId)
      const c = child as HTMLElement & { update?: (field: unknown, groupId: string) => void }
      if (field && typeof c.update === 'function') {
        c.update(field, g.id)
      }
    }
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

if (!customElements.get('flex-editable-group')) {
  customElements.define('flex-editable-group', FlexEditableGroup)
}
