import { GlobalRegistrator } from '@happy-dom/global-registrator'

if (!('window' in globalThis)) GlobalRegistrator.register()

import { afterAll, beforeEach, describe, expect, it } from 'bun:test'

await import('../../../src/design-system/components/flex-editable-field/client')

afterAll(() => GlobalRegistrator.unregister())

const FIELD = {
  id: 'f1',
  label: 'Email',
  fieldType: 'email',
  required: false,
  // biome-ignore lint/suspicious/noExplicitAny: test fixture
} as any

function mount() {
  document.body.innerHTML = ''
  const root = document.createElement('flex-form-editor')
  const el = document.createElement('flex-editable-field')
  root.appendChild(el)
  document.body.appendChild(root)
  // biome-ignore lint/suspicious/noExplicitAny: test access to update()
  ;(el as any).update(FIELD, 'g1')
  return { root, el }
}

function setSelection(
  root: HTMLElement,
  selection: { kind: string; id: string } | null,
) {
  root.dispatchEvent(
    new CustomEvent('formeditor:selection-changed', {
      detail: { selection },
      bubbles: false,
    }),
  )
}

// biome-ignore lint/suspicious/noExplicitAny: generic capture
function captureStageCommands(target: HTMLElement): { all: () => any[] } {
  // biome-ignore lint/suspicious/noExplicitAny: test capture
  const commands: any[] = []
  target.addEventListener('formeditor:stage-command', (e: Event) => {
    commands.push((e as CustomEvent).detail.command)
  })
  return { all: () => commands }
}

describe('flex-editable-field preview', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('renders a Carlos-style preview with no edit chrome when not selected', () => {
    const { el } = mount()
    expect(el.querySelector('.flex-form-group')).not.toBeNull()
    expect(el.querySelector('.flex-label')).not.toBeNull()
    expect(el.querySelector('.editable-field__edit')).toBeNull()
  })

  it('clicking the preview dispatches formeditor:select', () => {
    const { el } = mount()
    // biome-ignore lint/suspicious/noExplicitAny: test capture
    let detail: any = null
    el.addEventListener('formeditor:select', (e: Event) => {
      detail = (e as CustomEvent).detail
    })
    ;(el.querySelector('[data-action="select-field"]') as HTMLElement).click()
    expect(detail).toEqual({ kind: 'field', id: 'f1' })
  })
})

describe('flex-editable-field edit panel', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('shows the full labeled-form layout when selected', () => {
    const { root, el } = mount()
    setSelection(root, { kind: 'field', id: 'f1' })
    expect(el.querySelector('.editable-field__edit')).not.toBeNull()
    expect(el.querySelector('[data-prop="label"]')).not.toBeNull()
    expect(el.querySelector('[data-prop="fieldType"]')).not.toBeNull()
    expect(el.querySelector('[data-prop="required"]')).not.toBeNull()
    expect(el.querySelector('[data-prop="helpText"]')).not.toBeNull()
    expect(el.querySelector('[data-prop="sensitivity"]')).not.toBeNull()
    expect(el.querySelector('[data-prop="control"]')).not.toBeNull()
    expect(el.querySelector('[data-prop="moveToGroup"]')).not.toBeNull()
    expect(el.querySelector('[data-action="save-field"]')).not.toBeNull()
    expect(el.querySelector('[data-action="cancel-field"]')).not.toBeNull()
    expect(el.querySelector('[data-action="remove-field"]')).not.toBeNull()
  })

  it('Save button starts disabled and enables after any property changes', () => {
    const { root, el } = mount()
    setSelection(root, { kind: 'field', id: 'f1' })
    const saveBtn = el.querySelector<HTMLButtonElement>(
      '[data-action="save-field"]',
    )!
    expect(saveBtn.disabled).toBe(true)
    const typeSel = el.querySelector<HTMLSelectElement>(
      '[data-prop="fieldType"]',
    )!
    typeSel.value = 'phone'
    typeSel.dispatchEvent(new Event('change', { bubbles: true }))
    expect(saveBtn.disabled).toBe(false)
  })

  it('edits do not stage until Save is clicked', () => {
    const { root, el } = mount()
    setSelection(root, { kind: 'field', id: 'f1' })
    const staged = captureStageCommands(root)
    const typeSel = el.querySelector<HTMLSelectElement>(
      '[data-prop="fieldType"]',
    )!
    typeSel.value = 'phone'
    typeSel.dispatchEvent(new Event('change', { bubbles: true }))
    const req = el.querySelector<HTMLInputElement>('[data-prop="required"]')!
    req.checked = true
    req.dispatchEvent(new Event('change', { bubbles: true }))
    expect(staged.all()).toEqual([])
  })

  it('Save dispatches one stage-command per changed property', () => {
    const { root, el } = mount()
    setSelection(root, { kind: 'field', id: 'f1' })
    const staged = captureStageCommands(root)
    const typeSel = el.querySelector<HTMLSelectElement>(
      '[data-prop="fieldType"]',
    )!
    typeSel.value = 'phone'
    typeSel.dispatchEvent(new Event('change', { bubbles: true }))
    const req = el.querySelector<HTMLInputElement>('[data-prop="required"]')!
    req.checked = true
    req.dispatchEvent(new Event('change', { bubbles: true }))
    ;(el.querySelector('[data-action="save-field"]') as HTMLElement).click()
    const kinds = staged.all().map((c) => c.kind)
    expect(kinds).toContain('changeFieldType')
    expect(kinds).toContain('setRequired')
  })

  it('Cancel leaves nothing staged', () => {
    const { root, el } = mount()
    setSelection(root, { kind: 'field', id: 'f1' })
    const staged = captureStageCommands(root)
    const typeSel = el.querySelector<HTMLSelectElement>(
      '[data-prop="fieldType"]',
    )!
    typeSel.value = 'phone'
    typeSel.dispatchEvent(new Event('change', { bubbles: true }))
    ;(el.querySelector('[data-action="cancel-field"]') as HTMLElement).click()
    expect(staged.all()).toEqual([])
  })

  it('Delete field stages immediately and deselects', () => {
    const { root, el } = mount()
    setSelection(root, { kind: 'field', id: 'f1' })
    const staged = captureStageCommands(root)
    let deselected = false
    root.addEventListener('formeditor:deselect', () => {
      deselected = true
    })
    ;(el.querySelector('[data-action="remove-field"]') as HTMLElement).click()
    expect(staged.all()).toEqual([{ kind: 'removeField', id: 'f1' }])
    expect(deselected).toBe(true)
  })
})
