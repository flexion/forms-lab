import type { RequirementGroup } from '../../../services/data-collection'
import type { Command } from '../../../services/forms/shaping/commands'
import type { SelectionTarget } from '../flex-form-editor/protocol'

class FlexEditableGroup extends HTMLElement {
  private group: RequirementGroup | null = null
  private selected = false
  private editingTitle = false

  connectedCallback() {
    const root = this.closest('flex-form-editor')
    if (root) {
      root.addEventListener('formeditor:selection-changed', (e) => {
        const sel = (e as CustomEvent).detail
          .selection as SelectionTarget | null
        const wasSelected = this.selected
        this.selected = sel?.kind === 'group' && sel.id === this.group?.id
        if (wasSelected !== this.selected) this.render()
      })
    }
  }

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
    const titleMarkup = this.selected
      ? `<legend class="editable-group__legend editable-group__legend--selected">
          <span class="editable-group__title" tabindex="0" data-action="edit-title" title="Click to rename group">${escapeHtml(g.title)}</span>
          <span class="editable-group__toolbar" role="toolbar" aria-label="Group actions">
            <button type="button" class="flex-button" data-variant="ghost" data-action="add-field" title="Add field">+ Field</button>
            <button type="button" class="flex-button" data-variant="ghost" data-action="remove-group" aria-label="Remove group" title="Delete group">&times;</button>
            <button type="button" class="flex-button" data-variant="ghost" data-action="deselect-group" title="Done">Done</button>
          </span>
        </legend>`
      : `<legend class="editable-group__legend" tabindex="0" data-action="select-group">${escapeHtml(g.title)}</legend>`

    this.innerHTML = `
      <fieldset class="editable-group__fieldset${this.selected ? ' editable-group__fieldset--selected' : ''}">
        ${titleMarkup}
        <div class="editable-group__fields">${fields}</div>
      </fieldset>
    `

    if (!this.selected) {
      const legend = this.querySelector<HTMLElement>('.editable-group__legend')
      legend?.addEventListener('click', (e) => {
        e.stopPropagation()
        this.select()
      })
      legend?.addEventListener('keydown', (e) => {
        if ((e as KeyboardEvent).key === 'Enter') {
          e.preventDefault()
          this.select()
        }
      })
    } else {
      const titleEl = this.querySelector<HTMLElement>('.editable-group__title')
      titleEl?.addEventListener('click', (e) => {
        e.stopPropagation()
        this.startEditingTitle()
      })
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
      this.querySelector('[data-action="deselect-group"]')?.addEventListener(
        'click',
        () => this.deselect(),
      )
    }

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

  private select() {
    if (!this.group) return
    this.dispatchEvent(
      new CustomEvent('formeditor:select', {
        detail: { kind: 'group', id: this.group.id },
        bubbles: true,
        composed: true,
      }),
    )
  }

  private deselect() {
    this.dispatchEvent(
      new CustomEvent('formeditor:deselect', {
        detail: {},
        bubbles: true,
        composed: true,
      }),
    )
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
