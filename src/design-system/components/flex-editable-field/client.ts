import type { DataRequirement } from '../../../services/data-collection/types'
import type { Command } from '../../../services/forms/shaping/commands'

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

class FlexEditableField extends HTMLElement {
  private field: DataRequirement | null = null
  private groupId = ''
  private moreOpen = false
  private debounceTimer: ReturnType<typeof setTimeout> | null = null

  update(field: DataRequirement, groupId: string): void {
    this.field = field
    this.groupId = groupId
    this.render()
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
    const required = f.required === true
    const typeOptions = FIELD_TYPES.map(
      (t) => `<option value="${t}" ${t === f.fieldType ? 'selected' : ''}>${t}</option>`,
    ).join('')
    this.innerHTML = `
      <div class="editable-field__row">
        <input type="text" class="editable-field__label-input flex-input" value="${escapeHtml(f.label)}" aria-label="Field label" />
        <select class="editable-field__type flex-select" aria-label="Field type">${typeOptions}</select>
        <button type="button" class="flex-button editable-field__chip" data-variant="ghost" data-action="toggle-required" aria-pressed="${required}">${required ? 'Required' : 'Optional'}</button>
        <button type="button" class="flex-button" data-variant="ghost" data-action="toggle-more" aria-expanded="${this.moreOpen}">&hellip;more</button>
        <button type="button" class="flex-button" data-variant="ghost" data-action="remove-field" aria-label="Remove field">&times;</button>
      </div>
      <div class="editable-field__more" ${this.moreOpen ? '' : 'hidden'} data-more>
        ${this.renderMore(f)}
      </div>
    `
    this.bind()
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
      <select class="editable-field__control flex-select">
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

  private bind() {
    const labelInput = this.querySelector<HTMLInputElement>('.editable-field__label-input')
    labelInput?.addEventListener('input', () => {
      if (this.debounceTimer) clearTimeout(this.debounceTimer)
      this.debounceTimer = setTimeout(() => {
        if (!this.field) return
        if (labelInput.value === this.field.label) return
        this.dispatch(
          { kind: 'relabelField', id: this.field.id, label: labelInput.value },
          `Relabel "${this.field.label}" to "${labelInput.value}"`,
        )
      }, 400)
    })

    const typeSel = this.querySelector<HTMLSelectElement>('.editable-field__type')
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

    this.querySelector('[data-action="toggle-required"]')?.addEventListener('click', () => {
      if (!this.field) return
      const next = !(this.field.required === true)
      this.dispatch(
        { kind: 'setRequired', id: this.field.id, required: next },
        `Mark "${this.field.label}" ${next ? 'required' : 'optional'}`,
      )
    })

    this.querySelector('[data-action="remove-field"]')?.addEventListener('click', () => {
      if (!this.field) return
      this.dispatch(
        { kind: 'removeField', id: this.field.id },
        `Remove "${this.field.label}"`,
      )
    })

    this.querySelector('[data-action="toggle-more"]')?.addEventListener('click', () => {
      this.moreOpen = !this.moreOpen
      const more = this.querySelector<HTMLElement>('[data-more]')
      if (more) more.hidden = !this.moreOpen
      const btn = this.querySelector('[data-action="toggle-more"]')
      btn?.setAttribute('aria-expanded', String(this.moreOpen))
    })

    const sensSel = this.querySelector<HTMLSelectElement>('.editable-field__sensitivity')
    sensSel?.addEventListener('change', () => {
      if (!this.field) return
      this.dispatch(
        { kind: 'setFieldSensitivity', id: this.field.id, level: sensSel.value as (typeof SENSITIVITIES)[number] },
        `Set "${this.field.label}" sensitivity to ${sensSel.value}`,
      )
    })

    const ctrlSel = this.querySelector<HTMLSelectElement>('.editable-field__control')
    ctrlSel?.addEventListener('change', () => {
      if (!this.field || !ctrlSel.value) return
      this.dispatch(
        { kind: 'setFieldControl', id: this.field.id, control: ctrlSel.value as (typeof CONTROLS)[number] },
        `Set "${this.field.label}" control to ${ctrlSel.value}`,
      )
    })

    const moveInput = this.querySelector<HTMLInputElement>('.editable-field__move-target')
    moveInput?.addEventListener('change', () => {
      if (!this.field || !moveInput.value) return
      this.dispatch(
        { kind: 'moveField', fieldId: this.field.id, toGroupId: moveInput.value },
        `Move "${this.field.label}" to ${moveInput.value}`,
      )
      moveInput.value = ''
    })

    this.querySelector('[data-action="condition-clear"]')?.addEventListener('click', () => {
      if (!this.field) return
      this.dispatch(
        { kind: 'setFieldCondition', id: this.field.id, condition: null },
        `Clear condition on "${this.field.label}"`,
      )
    })

    this.querySelector('[data-action="condition-set"]')?.addEventListener('click', () => {
      if (!this.field) return
      const fieldRef = this.querySelector<HTMLInputElement>('.editable-field__cond-field')
      const opSel = this.querySelector<HTMLSelectElement>('.editable-field__cond-op')
      const valInput = this.querySelector<HTMLInputElement>('.editable-field__cond-value')
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
    })
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

if (!customElements.get('flex-editable-field')) {
  customElements.define('flex-editable-field', FlexEditableField)
}
