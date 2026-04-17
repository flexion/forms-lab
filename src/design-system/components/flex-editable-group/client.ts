import type { RequirementGroup } from '../../../services/data-collection/types'
import type { Command } from '../../../services/forms/shaping/commands'

class FlexEditableGroup extends HTMLElement {
  private group: RequirementGroup | null = null
  private editingTitle = false

  update(group: RequirementGroup): void {
    this.group = group
    if (!this.editingTitle) this.render()
  }

  private dispatch(command: Command, explanation: string) {
    this.dispatchEvent(
      new CustomEvent('formeditor:stage-command', {
        detail: { command, explanation },
        bubbles: true,
        composed: true,
      }),
    )
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
        <h3 class="editable-group__title" tabindex="0" data-action="edit-title" title="Click to rename group">${escapeHtml(g.title)}</h3>
        <div class="editable-group__toolbar" role="toolbar" aria-label="Group actions">
          <button type="button" class="flex-button" data-variant="ghost" data-action="add-field" title="Add field">+ Field</button>
          <button type="button" class="flex-button" data-variant="ghost" data-action="remove-group" aria-label="Remove group" title="Delete group">&times;</button>
        </div>
      </header>
      <div class="editable-group__fields">${fields}</div>
    `
    const titleEl = this.querySelector<HTMLElement>('.editable-group__title')
    titleEl?.addEventListener('click', () => this.startEditingTitle())
    titleEl?.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Enter') {
        e.preventDefault()
        this.startEditingTitle()
      }
    })

    this.querySelector('[data-action="add-field"]')?.addEventListener(
      'click',
      () =>
        this.dispatch(
          {
            kind: 'addField',
            groupId: g.id,
            label: 'New field',
            fieldType: 'text',
            required: false,
          },
          `Add field to "${g.title}"`,
        ),
    )
    this.querySelector('[data-action="remove-group"]')?.addEventListener(
      'click',
      () =>
        this.dispatch(
          { kind: 'removeGroup', id: g.id },
          `Remove group "${g.title}"`,
        ),
    )
    for (const child of this.querySelectorAll('flex-editable-field')) {
      const fieldId = (child as HTMLElement).dataset.fieldId
      const field = g.requirements.find((r) => r.id === fieldId)
      const c = child as HTMLElement & {
        update?: (field: unknown, groupId: string) => void
      }
      if (field && typeof c.update === 'function') {
        c.update(field, g.id)
      }
    }
  }

  private startEditingTitle() {
    if (this.editingTitle || !this.group) return
    const titleEl = this.querySelector<HTMLElement>('.editable-group__title')
    if (!titleEl) return
    this.editingTitle = true
    const current = this.group.title
    const input = document.createElement('input')
    input.type = 'text'
    input.className = 'editable-group__title-input flex-input'
    input.value = current
    input.setAttribute('aria-label', 'Group title')
    titleEl.replaceWith(input)
    input.focus()
    input.select()

    let cancelled = false
    const finish = () => {
      if (!this.editingTitle) return
      this.editingTitle = false
      const next = input.value.trim()
      if (!cancelled && next && next !== current && this.group) {
        this.dispatch(
          { kind: 'renameGroup', id: this.group.id, title: next },
          `Rename group to "${next}"`,
        )
      } else {
        this.render()
      }
    }
    input.addEventListener('blur', finish)
    input.addEventListener('keydown', (e) => {
      const key = (e as KeyboardEvent).key
      if (key === 'Enter') {
        e.preventDefault()
        input.blur()
      } else if (key === 'Escape') {
        e.preventDefault()
        cancelled = true
        input.blur()
      }
    })
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

if (!customElements.get('flex-editable-group')) {
  customElements.define('flex-editable-group', FlexEditableGroup)
}
