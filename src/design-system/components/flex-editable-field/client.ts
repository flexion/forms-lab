import type {
  DataRequirement,
  RequirementGroup,
} from '../../../services/data-collection/types'
import type { Command } from '../../../services/forms/shaping/commands'
import type {
  ProjectStateClient,
  SelectionTarget,
} from '../flex-form-editor/protocol'

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
  private groupId = ''
  private draft: DataRequirement | null = null
  private selected = false
  private groups: RequirementGroup[] = []

  connectedCallback() {
    const root = this.closest('flex-form-editor')
    if (!root) return
    root.addEventListener('formeditor:state-projected', (e) => {
      const state = (e as CustomEvent).detail.state as ProjectStateClient
      this.groups = state.dataSpec.groups
      if (this.selected) this.render()
    })
    root.addEventListener('formeditor:selection-changed', (e) => {
      const sel = (e as CustomEvent).detail.selection as SelectionTarget | null
      const wasSelected = this.selected
      const isSelected = sel?.kind === 'field' && sel.id === this.field?.id
      if (!wasSelected && isSelected) {
        this.selected = true
        this.draft = this.field ? cloneField(this.field) : null
        this.render()
      } else if (wasSelected && !isSelected) {
        this.selected = false
        this.draft = null
        this.render()
      }
    })
  }

  update(field: DataRequirement, groupId: string): void {
    this.field = field
    this.groupId = groupId
    if (!this.selected) this.draft = null
    this.render()
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

  // --- Preview: looks identical to Carlos's view, clickable to select ---

  private renderPreview(f: DataRequirement) {
    const required = f.required === true
    this.innerHTML = `
      <div class="flex-form-group editable-field__preview" tabindex="0" data-action="select-field">
        <div class="l-stack" style="--stack-space: var(--flex-space-xs)">
          ${this.renderPreviewLabel(f, required)}
          ${f.helpText ? `<span class="flex-hint">${escapeHtml(f.helpText)}</span>` : ''}
          ${this.renderControlReadonly(f)}
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

  private renderControlReadonly(f: DataRequirement): string {
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

  // --- Edit: labeled-form panel with every property visible ---

  private renderEdit(draft: DataRequirement) {
    const required = draft.required === true
    const dirty = this.isDirty()
    const sensitivity = draft.sensitivity ?? 'low'
    const control = draft.control ?? ''
    const cond = draft.condition ?? null
    const typeOptions = FIELD_TYPES.map(
      (t) =>
        `<option value="${t}" ${t === draft.fieldType ? 'selected' : ''}>${t}</option>`,
    ).join('')
    const sensitivityOptions = SENSITIVITIES.map(
      (s) =>
        `<option value="${s}" ${s === sensitivity ? 'selected' : ''}>${s}</option>`,
    ).join('')
    const controlOptions = `
      <option value="">(default for type)</option>
      ${CONTROLS.map((c) => `<option value="${c}" ${c === control ? 'selected' : ''}>${c}</option>`).join('')}
    `
    const groupOptions = this.groups
      .map(
        (g) =>
          `<option value="${g.id}" ${g.id === this.groupId ? 'selected' : ''}>${escapeHtml(g.title)}</option>`,
      )
      .join('')
    const ops: ConditionOp[] = ['equals', 'notEquals', 'contains']
    const opOptions = ops
      .map(
        (op) =>
          `<option value="${op}" ${cond?.operator === op ? 'selected' : ''}>${op === 'equals' ? 'equals' : op === 'notEquals' ? 'not equals' : 'contains'}</option>`,
      )
      .join('')

    this.innerHTML = `
      <div class="editable-field__edit" role="group" aria-label="Edit field">
        <header class="editable-field__edit-header">
          <span class="editable-field__edit-badge">Editing field</span>
        </header>
        <div class="editable-field__form">
          <label for="ef-label-${draft.id}" class="flex-label">Label</label>
          <input id="ef-label-${draft.id}" class="flex-input editable-field__input" type="text" value="${escapeHtml(draft.label)}" data-prop="label" />

          <label for="ef-type-${draft.id}" class="flex-label">Type</label>
          <select id="ef-type-${draft.id}" class="flex-select" data-prop="fieldType">${typeOptions}</select>

          <label for="ef-required-${draft.id}" class="flex-label">Required</label>
          <label class="flex-checkbox editable-field__checkbox">
            <input id="ef-required-${draft.id}" type="checkbox" data-prop="required" ${required ? 'checked' : ''} />
            <span>This field must be answered</span>
          </label>

          <label for="ef-help-${draft.id}" class="flex-label">Help text</label>
          <input id="ef-help-${draft.id}" class="flex-input editable-field__input" type="text" value="${escapeHtml(draft.helpText ?? '')}" data-prop="helpText" placeholder="Optional hint shown below the label" />

          <label for="ef-sensitivity-${draft.id}" class="flex-label">Sensitivity</label>
          <select id="ef-sensitivity-${draft.id}" class="flex-select" data-prop="sensitivity">${sensitivityOptions}</select>

          <label for="ef-control-${draft.id}" class="flex-label">Control widget</label>
          <select id="ef-control-${draft.id}" class="flex-select" data-prop="control">${controlOptions}</select>

          <label for="ef-move-${draft.id}" class="flex-label">Group</label>
          <select id="ef-move-${draft.id}" class="flex-select" data-prop="moveToGroup">${groupOptions}</select>

          <label class="flex-label">Shown when</label>
          <div class="editable-field__condition">
            <input class="flex-input editable-field__condition-field" type="text" placeholder="field id" value="${cond ? escapeHtml(cond.field) : ''}" data-cond="field" />
            <select class="flex-select editable-field__condition-op" data-cond="operator">${opOptions}</select>
            <input class="flex-input editable-field__condition-value" type="text" placeholder="value" value="${cond ? escapeHtml(String(cond.value)) : ''}" data-cond="value" />
            <button type="button" class="flex-button" data-variant="outline" data-action="condition-clear">Clear</button>
          </div>
        </div>
        <footer class="editable-field__edit-footer">
          <button type="button" class="flex-button" data-variant="outline" data-action="remove-field">Delete field</button>
          <div class="editable-field__edit-actions">
            <span class="editable-field__dirty" aria-live="polite">${dirty ? 'Unsaved changes' : ''}</span>
            <button type="button" class="flex-button" data-variant="outline" data-action="cancel-field">Cancel</button>
            <button type="button" class="flex-button" data-action="save-field" ${dirty ? '' : 'disabled'}>Save</button>
          </div>
        </footer>
      </div>
    `
    this.bindEdit()
  }

  private bindEdit() {
    // Label
    this.querySelector<HTMLInputElement>(
      '[data-prop="label"]',
    )?.addEventListener('input', (e) =>
      this.patchDraft({ label: (e.target as HTMLInputElement).value }),
    )
    // Help text
    this.querySelector<HTMLInputElement>(
      '[data-prop="helpText"]',
    )?.addEventListener('input', (e) =>
      this.patchDraft({
        helpText: (e.target as HTMLInputElement).value || undefined,
      }),
    )
    // Field type
    this.querySelector<HTMLSelectElement>(
      '[data-prop="fieldType"]',
    )?.addEventListener('change', (e) =>
      this.patchDraft({
        fieldType: (e.target as HTMLSelectElement).value as FieldType,
      }),
    )
    // Required
    this.querySelector<HTMLInputElement>(
      '[data-prop="required"]',
    )?.addEventListener('change', (e) =>
      this.patchDraft({ required: (e.target as HTMLInputElement).checked }),
    )
    // Sensitivity
    this.querySelector<HTMLSelectElement>(
      '[data-prop="sensitivity"]',
    )?.addEventListener('change', (e) =>
      this.patchDraft({
        sensitivity: (e.target as HTMLSelectElement).value as Sensitivity,
      }),
    )
    // Control widget
    this.querySelector<HTMLSelectElement>(
      '[data-prop="control"]',
    )?.addEventListener('change', (e) =>
      this.patchDraft({
        control:
          ((e.target as HTMLSelectElement).value as ControlWidget) || undefined,
      }),
    )
    // Move to group (structural — dispatches immediately and deselects)
    this.querySelector<HTMLSelectElement>(
      '[data-prop="moveToGroup"]',
    )?.addEventListener('change', (e) => {
      const toGroupId = (e.target as HTMLSelectElement).value
      if (!this.field || !toGroupId || toGroupId === this.groupId) return
      const root = this.closest('flex-form-editor') as HTMLElement | null
      if (!root) return
      root.dispatchEvent(
        new CustomEvent('formeditor:stage-command', {
          detail: {
            command: {
              kind: 'moveField',
              fieldId: this.field.id,
              toGroupId,
            },
            explanation: `Move "${this.field.label}" to ${toGroupId}`,
          },
          bubbles: true,
          composed: true,
        }),
      )
      root.dispatchEvent(
        new CustomEvent('formeditor:deselect', {
          detail: {},
          bubbles: true,
          composed: true,
        }),
      )
    })

    // Condition inputs
    const condField = this.querySelector<HTMLInputElement>(
      '[data-cond="field"]',
    )
    const condOp = this.querySelector<HTMLSelectElement>(
      '[data-cond="operator"]',
    )
    const condValue = this.querySelector<HTMLInputElement>(
      '[data-cond="value"]',
    )
    const syncCondition = () => {
      const field = condField?.value.trim() ?? ''
      const op = (condOp?.value ?? 'equals') as ConditionOp
      const value = condValue?.value ?? ''
      if (!field || !value) {
        this.patchDraft({ condition: undefined })
        return
      }
      this.patchDraft({ condition: { field, operator: op, value } })
    }
    condField?.addEventListener('input', syncCondition)
    condOp?.addEventListener('change', syncCondition)
    condValue?.addEventListener('input', syncCondition)

    this.querySelector('[data-action="condition-clear"]')?.addEventListener(
      'click',
      () => {
        this.patchDraft({ condition: undefined })
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
    this.querySelector('[data-action="remove-field"]')?.addEventListener(
      'click',
      () => {
        if (!this.field) return
        const root = this.closest('flex-form-editor') as HTMLElement | null
        if (!root) return
        root.dispatchEvent(
          new CustomEvent('formeditor:stage-command', {
            detail: {
              command: { kind: 'removeField', id: this.field.id },
              explanation: `Remove "${this.field.label}"`,
            },
            bubbles: true,
            composed: true,
          }),
        )
        root.dispatchEvent(
          new CustomEvent('formeditor:deselect', {
            detail: {},
            bubbles: true,
            composed: true,
          }),
        )
      },
    )
  }

  private patchDraft(patch: Partial<DataRequirement>) {
    if (!this.draft) return
    this.draft = { ...this.draft, ...patch }
    // Update footer state in place so focused inputs aren't rebuilt.
    const dirty = this.isDirty()
    const saveBtn = this.querySelector<HTMLButtonElement>(
      '[data-action="save-field"]',
    )
    if (saveBtn) saveBtn.disabled = !dirty
    const dirtyLabel = this.querySelector<HTMLElement>('.editable-field__dirty')
    if (dirtyLabel) dirtyLabel.textContent = dirty ? 'Unsaved changes' : ''
  }

  private isDirty(): boolean {
    if (!this.draft || !this.field) return false
    const d = this.draft
    const f = this.field
    if (d.label !== f.label) return true
    if ((d.helpText ?? '') !== (f.helpText ?? '')) return true
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
    const root = this.closest('flex-form-editor') as HTMLElement | null
    if (!root) return
    const fire = (command: Command, explanation: string) => {
      root.dispatchEvent(
        new CustomEvent('formeditor:stage-command', {
          detail: { command, explanation },
          bubbles: true,
          composed: true,
        }),
      )
    }
    const d = this.draft
    const f = this.field
    const id = f.id
    if (d.label !== f.label) {
      fire(
        { kind: 'relabelField', id, label: d.label, helpText: d.helpText },
        `Relabel "${f.label}" to "${d.label}"`,
      )
    } else if ((d.helpText ?? '') !== (f.helpText ?? '')) {
      fire(
        { kind: 'relabelField', id, label: d.label, helpText: d.helpText },
        `Update help text for "${f.label}"`,
      )
    }
    if (d.fieldType !== f.fieldType) {
      fire(
        { kind: 'changeFieldType', id, fieldType: d.fieldType as FieldType },
        `Change "${f.label}" type to ${d.fieldType}`,
      )
    }
    if ((d.required === true) !== (f.required === true)) {
      fire(
        { kind: 'setRequired', id, required: d.required === true },
        `Mark "${f.label}" ${d.required === true ? 'required' : 'optional'}`,
      )
    }
    if ((d.sensitivity ?? 'low') !== (f.sensitivity ?? 'low')) {
      fire(
        {
          kind: 'setFieldSensitivity',
          id,
          level: (d.sensitivity ?? 'low') as Sensitivity,
        },
        `Set "${f.label}" sensitivity to ${d.sensitivity ?? 'low'}`,
      )
    }
    if ((d.control ?? '') !== (f.control ?? '') && (d.control ?? '')) {
      fire(
        {
          kind: 'setFieldControl',
          id,
          control: (d.control ?? '') as ControlWidget,
        },
        `Set "${f.label}" control to ${d.control}`,
      )
    }
    if (
      JSON.stringify(d.condition ?? null) !==
      JSON.stringify(f.condition ?? null)
    ) {
      fire(
        { kind: 'setFieldCondition', id, condition: d.condition ?? null },
        d.condition
          ? `Show "${f.label}" when ${d.condition.field} ${d.condition.operator} ${d.condition.value}`
          : `Clear condition on "${f.label}"`,
      )
    }
    root.dispatchEvent(
      new CustomEvent('formeditor:deselect', {
        detail: {},
        bubbles: true,
        composed: true,
      }),
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
