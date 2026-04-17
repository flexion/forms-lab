import type { DataRequirement } from '../../../services/data-collection/types'
import type { Command } from '../../../services/forms/shaping/commands'
import type { SelectionTarget } from '../flex-form-editor/protocol'

const FIELD_TYPES = [
  'text',
  'email',
  'phone',
  'url',
  'number',
  'currency',
  'date',
  'boolean',
  'choice',
  'longText',
] as const

const SENSITIVITIES = ['low', 'medium', 'high', 'pii'] as const
const CONTROLS = ['radio', 'select', 'checkbox', 'toggle'] as const

const INPUT_TYPE_FOR_FIELD: Record<(typeof FIELD_TYPES)[number], string> = {
  text: 'text',
  email: 'email',
  phone: 'tel',
  url: 'url',
  number: 'number',
  currency: 'number',
  date: 'date',
  boolean: 'checkbox',
  choice: 'text',
  longText: 'text',
}

class FlexEditableField extends HTMLElement {
  private field: DataRequirement | null = null
  private selected = false
  private moreOpen = false
  private editingLabel = false

  connectedCallback() {
    const root = this.closest('flex-form-editor')
    if (root) {
      root.addEventListener('formeditor:selection-changed', (e) => {
        const sel = (e as CustomEvent).detail
          .selection as SelectionTarget | null
        const wasSelected = this.selected
        this.selected = sel?.kind === 'field' && sel.id === this.field?.id
        if (wasSelected !== this.selected) {
          if (!this.selected) this.moreOpen = false
          this.render()
        }
      })
    }
  }

  update(field: DataRequirement, _groupId: string): void {
    this.field = field
    if (!this.editingLabel) this.render()
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
    const f = this.field
    if (!f) return
    if (this.selected) {
      this.renderEdit(f)
    } else {
      this.renderPreview(f)
    }
  }

  private renderPreview(f: DataRequirement) {
    const required = f.required === true
    this.innerHTML = `
      <div class="flex-form-group editable-field__preview" tabindex="0" data-action="select-field">
        <div class="l-stack" style="--stack-space: var(--flex-space-xs)">
          ${this.renderPreviewLabel(f, required)}
          ${f.helpText ? `<span class="flex-hint">${escapeHtml(f.helpText)}</span>` : ''}
          ${this.renderControl(f)}
        </div>
      </div>
    `
    const wrap = this.querySelector<HTMLElement>('[data-action="select-field"]')
    wrap?.addEventListener('click', () => this.select())
    wrap?.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Enter') {
        e.preventDefault()
        this.select()
      }
    })
  }

  private renderPreviewLabel(f: DataRequirement, required: boolean): string {
    if (f.fieldType === 'boolean' || f.fieldType === 'date') return ''
    const optional = !required
      ? ' <span class="flex-label__optional">(optional)</span>'
      : ''
    return `<label class="flex-label">${escapeHtml(f.label)}${optional}</label>`
  }

  private renderControl(f: DataRequirement): string {
    const inputType = INPUT_TYPE_FOR_FIELD[f.fieldType] ?? 'text'
    if (f.fieldType === 'longText') {
      return `<textarea class="flex-textarea" readonly tabindex="-1" aria-hidden="true" rows="2"></textarea>`
    }
    if (f.fieldType === 'boolean') {
      return `<label class="flex-checkbox"><input type="checkbox" disabled tabindex="-1" /> ${escapeHtml(f.label)}</label>`
    }
    if (
      f.fieldType === 'choice' &&
      Array.isArray(f.choices) &&
      f.choices.length > 0
    ) {
      const options = f.choices
        .map((c) => `<option>${escapeHtml(c)}</option>`)
        .join('')
      return `<select class="flex-select" disabled tabindex="-1" aria-hidden="true"><option>&mdash;</option>${options}</select>`
    }
    return `<input class="flex-input" type="${inputType}" readonly tabindex="-1" aria-hidden="true" />`
  }

  private renderEdit(f: DataRequirement) {
    const required = f.required === true
    this.innerHTML = `
      <div class="editable-field__edit">
        <div class="editable-field__edit-header">
          <span class="editable-field__label-wrap">
            <span class="editable-field__label" tabindex="0" data-action="edit-label" title="Click to rename">${escapeHtml(f.label)}</span>
            ${required ? '<span class="editable-field__required" aria-hidden="true">*</span>' : '<span class="editable-field__optional">(optional)</span>'}
          </span>
          <div class="editable-field__toolbar" role="toolbar" aria-label="Field actions">
            ${this.renderTypeSelect(f)}
            <button type="button" class="flex-button editable-field__chip" data-variant="ghost" data-action="toggle-required" aria-pressed="${required}" title="Toggle required">${required ? 'Required' : 'Optional'}</button>
            <button type="button" class="flex-button" data-variant="ghost" data-action="toggle-more" aria-expanded="${this.moreOpen}" title="More settings">&hellip;</button>
            <button type="button" class="flex-button" data-variant="ghost" data-action="remove-field" aria-label="Remove field" title="Delete field">&times;</button>
            <button type="button" class="flex-button" data-variant="ghost" data-action="deselect-field" aria-label="Done editing" title="Done">Done</button>
          </div>
        </div>
        ${this.renderControl(f)}
        <div class="editable-field__more" ${this.moreOpen ? '' : 'hidden'} data-more>
          ${this.renderMore(f)}
        </div>
      </div>
    `
    this.bindEdit()
  }

  private renderTypeSelect(f: DataRequirement): string {
    const options = FIELD_TYPES.map(
      (t) =>
        `<option value="${t}" ${t === f.fieldType ? 'selected' : ''}>${t}</option>`,
    ).join('')
    return `<select class="editable-field__type flex-select" aria-label="Field type" title="Field type">${options}</select>`
  }

  private renderMore(f: DataRequirement): string {
    const sensitivity = f.sensitivity ?? 'low'
    const control = f.control ?? ''
    return `
      <label>Sensitivity</label>
      <select class="editable-field__sensitivity flex-select">
        ${SENSITIVITIES.map((s) => `<option value="${s}" ${s === sensitivity ? 'selected' : ''}>${s}</option>`).join('')}
      </select>
      <label>Control</label>
      <select class="editable-field__control-widget flex-select">
        <option value="">(default)</option>
        ${CONTROLS.map((c) => `<option value="${c}" ${c === control ? 'selected' : ''}>${c}</option>`).join('')}
      </select>
      <label>Move to group</label>
      <input type="text" class="editable-field__move-target flex-input" placeholder="group id..." />
      <label>Condition</label>
      <div class="editable-field__condition">
        <input type="text" class="editable-field__cond-field flex-input" placeholder="field id" />
        <select class="editable-field__cond-op flex-select">
          <option value="equals">equals</option>
          <option value="notEquals">not equals</option>
          <option value="contains">contains</option>
        </select>
        <input type="text" class="editable-field__cond-value flex-input" placeholder="value" />
        <button type="button" class="flex-button" data-variant="ghost" data-action="condition-set">Set</button>
        <button type="button" class="flex-button" data-variant="ghost" data-action="condition-clear">Clear</button>
      </div>
    `
  }

  private bindEdit() {
    const labelEl = this.querySelector<HTMLElement>('.editable-field__label')
    labelEl?.addEventListener('click', (e) => {
      e.stopPropagation()
      this.startEditingLabel()
    })
    labelEl?.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Enter') {
        e.preventDefault()
        this.startEditingLabel()
      }
    })

    const typeSel = this.querySelector<HTMLSelectElement>(
      '.editable-field__type',
    )
    typeSel?.addEventListener('change', () => {
      if (!this.field) return
      this.dispatch(
        {
          kind: 'changeFieldType',
          id: this.field.id,
          fieldType: typeSel.value as (typeof FIELD_TYPES)[number],
        },
        `Change "${this.field.label}" type to ${typeSel.value}`,
      )
    })

    this.querySelector('[data-action="toggle-required"]')?.addEventListener(
      'click',
      () => {
        if (!this.field) return
        const next = !(this.field.required === true)
        this.dispatch(
          { kind: 'setRequired', id: this.field.id, required: next },
          `Mark "${this.field.label}" ${next ? 'required' : 'optional'}`,
        )
      },
    )

    this.querySelector('[data-action="remove-field"]')?.addEventListener(
      'click',
      () => {
        if (!this.field) return
        this.dispatch(
          { kind: 'removeField', id: this.field.id },
          `Remove "${this.field.label}"`,
        )
      },
    )

    this.querySelector('[data-action="toggle-more"]')?.addEventListener(
      'click',
      () => {
        this.moreOpen = !this.moreOpen
        const more = this.querySelector<HTMLElement>('[data-more]')
        if (more) more.hidden = !this.moreOpen
        const btn = this.querySelector('[data-action="toggle-more"]')
        btn?.setAttribute('aria-expanded', String(this.moreOpen))
      },
    )

    this.querySelector('[data-action="deselect-field"]')?.addEventListener(
      'click',
      () => this.deselect(),
    )

    const sensSel = this.querySelector<HTMLSelectElement>(
      '.editable-field__sensitivity',
    )
    sensSel?.addEventListener('change', () => {
      if (!this.field) return
      this.dispatch(
        {
          kind: 'setFieldSensitivity',
          id: this.field.id,
          level: sensSel.value as (typeof SENSITIVITIES)[number],
        },
        `Set "${this.field.label}" sensitivity to ${sensSel.value}`,
      )
    })

    const ctrlSel = this.querySelector<HTMLSelectElement>(
      '.editable-field__control-widget',
    )
    ctrlSel?.addEventListener('change', () => {
      if (!this.field || !ctrlSel.value) return
      this.dispatch(
        {
          kind: 'setFieldControl',
          id: this.field.id,
          control: ctrlSel.value as (typeof CONTROLS)[number],
        },
        `Set "${this.field.label}" control to ${ctrlSel.value}`,
      )
    })

    const moveInput = this.querySelector<HTMLInputElement>(
      '.editable-field__move-target',
    )
    moveInput?.addEventListener('change', () => {
      if (!this.field || !moveInput.value) return
      this.dispatch(
        {
          kind: 'moveField',
          fieldId: this.field.id,
          toGroupId: moveInput.value,
        },
        `Move "${this.field.label}" to ${moveInput.value}`,
      )
      moveInput.value = ''
    })

    this.querySelector('[data-action="condition-clear"]')?.addEventListener(
      'click',
      () => {
        if (!this.field) return
        this.dispatch(
          { kind: 'setFieldCondition', id: this.field.id, condition: null },
          `Clear condition on "${this.field.label}"`,
        )
      },
    )

    this.querySelector('[data-action="condition-set"]')?.addEventListener(
      'click',
      () => {
        if (!this.field) return
        const fieldRef = this.querySelector<HTMLInputElement>(
          '.editable-field__cond-field',
        )
        const opSel = this.querySelector<HTMLSelectElement>(
          '.editable-field__cond-op',
        )
        const valInput = this.querySelector<HTMLInputElement>(
          '.editable-field__cond-value',
        )
        if (!fieldRef?.value || !opSel || !valInput?.value) return
        this.dispatch(
          {
            kind: 'setFieldCondition',
            id: this.field.id,
            condition: {
              field: fieldRef.value,
              operator: opSel.value as 'equals' | 'notEquals' | 'contains',
              value: valInput.value,
            },
          },
          `Show "${this.field.label}" when ${fieldRef.value} ${opSel.value} ${valInput.value}`,
        )
      },
    )
  }

  private select() {
    if (!this.field) return
    this.dispatchEvent(
      new CustomEvent('formeditor:select', {
        detail: { kind: 'field', id: this.field.id },
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

  private startEditingLabel() {
    if (this.editingLabel || !this.field) return
    const labelEl = this.querySelector<HTMLElement>('.editable-field__label')
    if (!labelEl) return
    this.editingLabel = true
    const currentLabel = this.field.label
    const input = document.createElement('input')
    input.type = 'text'
    input.className = 'editable-field__label-input flex-input'
    input.value = currentLabel
    input.setAttribute('aria-label', 'Field label')
    labelEl.replaceWith(input)
    input.focus()
    input.select()

    let cancelled = false
    const finish = () => {
      if (!this.editingLabel) return
      this.editingLabel = false
      const newValue = input.value.trim()
      if (!cancelled && newValue && newValue !== currentLabel && this.field) {
        this.dispatch(
          { kind: 'relabelField', id: this.field.id, label: newValue },
          `Relabel "${currentLabel}" to "${newValue}"`,
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

if (!customElements.get('flex-editable-field')) {
  customElements.define('flex-editable-field', FlexEditableField)
}
