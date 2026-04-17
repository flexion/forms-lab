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

type FieldType = (typeof FIELD_TYPES)[number]
type Sensitivity = (typeof SENSITIVITIES)[number]
type ControlWidget = (typeof CONTROLS)[number]
type ConditionOp = 'equals' | 'notEquals' | 'contains'

const INPUT_TYPE_FOR_FIELD: Record<FieldType, string> = {
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
  private draft: DataRequirement | null = null
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
        const isSelected = sel?.kind === 'field' && sel.id === this.field?.id
        if (!wasSelected && isSelected) {
          this.selected = true
          this.draft = this.field ? cloneField(this.field) : null
          this.render()
        } else if (wasSelected && !isSelected) {
          this.selected = false
          this.draft = null
          this.moreOpen = false
          this.render()
        }
      })
    }
  }

  update(field: DataRequirement, _groupId: string): void {
    this.field = field
    // If user isn't actively editing, keep the draft synced to the latest
    // canonical data; if they are, leave their in-flight edits alone.
    if (!this.selected) this.draft = null
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
    if (this.selected && this.draft) {
      this.renderEdit(this.draft)
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
    const inputType = INPUT_TYPE_FOR_FIELD[f.fieldType as FieldType] ?? 'text'
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

  private renderEdit(draft: DataRequirement) {
    const required = draft.required === true
    const dirty = this.isDirty()
    this.innerHTML = `
      <div class="editable-field__edit">
        <div class="editable-field__edit-header">
          <span class="editable-field__label-wrap">
            <span class="editable-field__label" tabindex="0" data-action="edit-label" title="Click to rename">${escapeHtml(draft.label)}</span>
            ${required ? '<span class="editable-field__required" aria-hidden="true">*</span>' : '<span class="editable-field__optional">(optional)</span>'}
          </span>
          <div class="editable-field__toolbar" role="toolbar" aria-label="Field actions">
            ${this.renderTypeSelect(draft)}
            <button type="button" class="flex-button editable-field__chip" data-variant="ghost" data-action="toggle-required" aria-pressed="${required}" title="Toggle required">${required ? 'Required' : 'Optional'}</button>
            <button type="button" class="flex-button" data-variant="ghost" data-action="toggle-more" aria-expanded="${this.moreOpen}" title="More settings">&hellip;</button>
            <button type="button" class="flex-button" data-variant="ghost" data-action="remove-field" aria-label="Remove field" title="Delete field">&times;</button>
          </div>
        </div>
        ${this.renderControl(draft)}
        <div class="editable-field__more" ${this.moreOpen ? '' : 'hidden'} data-more>
          ${this.renderMore(draft)}
        </div>
        <div class="editable-field__footer">
          <span class="editable-field__dirty" aria-live="polite">${dirty ? 'Unsaved changes' : ''}</span>
          <span class="editable-field__footer-actions">
            <button type="button" class="flex-button" data-variant="outline" data-action="cancel-field">Cancel</button>
            <button type="button" class="flex-button" data-action="save-field" ${dirty ? '' : 'disabled'}>Save</button>
          </span>
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
    const cond = f.condition ?? null
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
        <input type="text" class="editable-field__cond-field flex-input" placeholder="field id" value="${cond ? escapeHtml(cond.field) : ''}" />
        <select class="editable-field__cond-op flex-select">
          ${(['equals', 'notEquals', 'contains'] as ConditionOp[])
            .map(
              (op) =>
                `<option value="${op}" ${cond?.operator === op ? 'selected' : ''}>${op === 'equals' ? 'equals' : op === 'notEquals' ? 'not equals' : 'contains'}</option>`,
            )
            .join('')}
        </select>
        <input type="text" class="editable-field__cond-value flex-input" placeholder="value" value="${cond ? escapeHtml(String(cond.value)) : ''}" />
        <button type="button" class="flex-button" data-variant="ghost" data-action="condition-clear">Clear</button>
      </div>
    `
  }

  private bindEdit() {
    const draft = this.draft
    if (!draft) return

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
      this.patchDraft({ fieldType: typeSel.value as FieldType })
    })

    this.querySelector('[data-action="toggle-required"]')?.addEventListener(
      'click',
      () => {
        this.patchDraft({ required: !(draft.required === true) })
      },
    )

    // Remove and move-to-group are structural actions, not drafted:
    // a delete is always a discrete intent, and moveField's target group
    // isn't part of the field itself.
    this.querySelector('[data-action="remove-field"]')?.addEventListener(
      'click',
      () => {
        if (!this.field) return
        this.dispatch(
          { kind: 'removeField', id: this.field.id },
          `Remove "${this.field.label}"`,
        )
        this.deselect()
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

    this.querySelector('[data-action="cancel-field"]')?.addEventListener(
      'click',
      () => this.deselect(),
    )

    this.querySelector('[data-action="save-field"]')?.addEventListener(
      'click',
      () => this.saveDraft(),
    )

    const sensSel = this.querySelector<HTMLSelectElement>(
      '.editable-field__sensitivity',
    )
    sensSel?.addEventListener('change', () => {
      this.patchDraft({ sensitivity: sensSel.value as Sensitivity })
    })

    const ctrlSel = this.querySelector<HTMLSelectElement>(
      '.editable-field__control-widget',
    )
    ctrlSel?.addEventListener('change', () => {
      this.patchDraft({
        control: (ctrlSel.value || undefined) as ControlWidget | undefined,
      })
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

    const condField = this.querySelector<HTMLInputElement>(
      '.editable-field__cond-field',
    )
    const condOp = this.querySelector<HTMLSelectElement>(
      '.editable-field__cond-op',
    )
    const condValue = this.querySelector<HTMLInputElement>(
      '.editable-field__cond-value',
    )
    const syncCondition = () => {
      const field = condField?.value.trim() ?? ''
      const op = (condOp?.value ?? 'equals') as ConditionOp
      const value = condValue?.value ?? ''
      if (!field || !value) {
        this.patchDraft({ condition: undefined })
        return
      }
      this.patchDraft({
        condition: { field, operator: op, value },
      })
    }
    condField?.addEventListener('change', syncCondition)
    condOp?.addEventListener('change', syncCondition)
    condValue?.addEventListener('change', syncCondition)

    this.querySelector('[data-action="condition-clear"]')?.addEventListener(
      'click',
      () => {
        this.patchDraft({ condition: undefined })
      },
    )
  }

  private patchDraft(patch: Partial<DataRequirement>) {
    if (!this.draft) return
    this.draft = { ...this.draft, ...patch }
    this.render()
  }

  private isDirty(): boolean {
    if (!this.draft || !this.field) return false
    const d = this.draft
    const f = this.field
    if (d.label !== f.label) return true
    if (d.fieldType !== f.fieldType) return true
    if ((d.required === true) !== (f.required === true)) return true
    if ((d.sensitivity ?? 'low') !== (f.sensitivity ?? 'low')) return true
    if ((d.control ?? '') !== (f.control ?? '')) return true
    if (
      JSON.stringify(d.condition ?? null) !==
      JSON.stringify(f.condition ?? null)
    )
      return true
    return false
  }

  private saveDraft() {
    if (!this.draft || !this.field) {
      this.deselect()
      return
    }
    const d = this.draft
    const f = this.field
    const id = f.id
    if (d.label !== f.label) {
      this.dispatch(
        { kind: 'relabelField', id, label: d.label },
        `Relabel "${f.label}" to "${d.label}"`,
      )
    }
    if (d.fieldType !== f.fieldType) {
      this.dispatch(
        { kind: 'changeFieldType', id, fieldType: d.fieldType as FieldType },
        `Change "${f.label}" type to ${d.fieldType}`,
      )
    }
    if ((d.required === true) !== (f.required === true)) {
      this.dispatch(
        { kind: 'setRequired', id, required: d.required === true },
        `Mark "${f.label}" ${d.required === true ? 'required' : 'optional'}`,
      )
    }
    const dSens = d.sensitivity ?? 'low'
    const fSens = f.sensitivity ?? 'low'
    if (dSens !== fSens) {
      this.dispatch(
        { kind: 'setFieldSensitivity', id, level: dSens as Sensitivity },
        `Set "${f.label}" sensitivity to ${dSens}`,
      )
    }
    const dCtrl = d.control ?? ''
    const fCtrl = f.control ?? ''
    if (dCtrl !== fCtrl && dCtrl) {
      this.dispatch(
        { kind: 'setFieldControl', id, control: dCtrl as ControlWidget },
        `Set "${f.label}" control to ${dCtrl}`,
      )
    }
    const dCond = JSON.stringify(d.condition ?? null)
    const fCond = JSON.stringify(f.condition ?? null)
    if (dCond !== fCond) {
      this.dispatch(
        { kind: 'setFieldCondition', id, condition: d.condition ?? null },
        d.condition
          ? `Show "${f.label}" when ${d.condition.field} ${d.condition.operator} ${d.condition.value}`
          : `Clear condition on "${f.label}"`,
      )
    }
    this.deselect()
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
    if (this.editingLabel || !this.draft) return
    const labelEl = this.querySelector<HTMLElement>('.editable-field__label')
    if (!labelEl) return
    this.editingLabel = true
    const currentLabel = this.draft.label
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
      if (!cancelled && newValue && newValue !== currentLabel) {
        this.patchDraft({ label: newValue })
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

function cloneField(f: DataRequirement): DataRequirement {
  return {
    ...f,
    condition: f.condition ? { ...f.condition } : undefined,
    choices: f.choices ? [...f.choices] : undefined,
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
