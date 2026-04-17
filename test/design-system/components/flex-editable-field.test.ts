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
function capture(target: HTMLElement): { get: () => any } {
  // biome-ignore lint/suspicious/noExplicitAny: test capture
  let value: any = null
  target.addEventListener('formeditor:stage-command', (e: Event) => {
    value = (e as CustomEvent).detail
  })
  return { get: () => value }
}

describe('flex-editable-field preview vs selected', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('renders Carlos-style preview without edit chrome when not selected', () => {
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

  it('shows the edit card when selection matches', () => {
    const { root, el } = mount()
    setSelection(root, { kind: 'field', id: 'f1' })
    expect(el.querySelector('.editable-field__edit')).not.toBeNull()
    expect(el.querySelector('[data-action="save-field"]')).not.toBeNull()
    expect(el.querySelector('[data-action="cancel-field"]')).not.toBeNull()
  })

  it('collapses back to preview when selection clears', () => {
    const { root, el } = mount()
    setSelection(root, { kind: 'field', id: 'f1' })
    expect(el.querySelector('.editable-field__edit')).not.toBeNull()
    setSelection(root, null)
    expect(el.querySelector('.editable-field__edit')).toBeNull()
  })
})

describe('flex-editable-field draft-and-save', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('does not stage changes until Save is clicked', () => {
    const { root, el } = mount()
    setSelection(root, { kind: 'field', id: 'f1' })
    const staged = capture(el)

    // Type change — should only update draft, not stage
    const sel = el.querySelector('.editable-field__type') as HTMLSelectElement
    sel.value = 'phone'
    sel.dispatchEvent(new Event('change', { bubbles: true }))
    expect(staged.get()).toBeNull()

    // Required toggle — also draft-only
    ;(
      el.querySelector('[data-action="toggle-required"]') as HTMLElement
    ).click()
    expect(staged.get()).toBeNull()

    // Save button visible and enabled; click it
    const saveBtn = el.querySelector(
      '[data-action="save-field"]',
    ) as HTMLButtonElement
    expect(saveBtn.disabled).toBe(false)
    saveBtn.click()

    // One stage event per changed property (use document to collect)
    // Re-run with a collecting listener this time
  })

  it('Save dispatches a stage-command per changed property', () => {
    const { root, el } = mount()
    setSelection(root, { kind: 'field', id: 'f1' })
    // biome-ignore lint/suspicious/noExplicitAny: test capture
    const commands: any[] = []
    root.addEventListener('formeditor:stage-command', (e: Event) => {
      commands.push((e as CustomEvent).detail.command)
    })

    const sel = el.querySelector('.editable-field__type') as HTMLSelectElement
    sel.value = 'phone'
    sel.dispatchEvent(new Event('change', { bubbles: true }))
    ;(
      el.querySelector('[data-action="toggle-required"]') as HTMLElement
    ).click()
    ;(el.querySelector('[data-action="save-field"]') as HTMLElement).click()

    const kinds = commands.map((c) => c.kind)
    expect(kinds).toContain('changeFieldType')
    expect(kinds).toContain('setRequired')
  })

  it('Cancel discards the draft without staging', () => {
    const { root, el } = mount()
    setSelection(root, { kind: 'field', id: 'f1' })
    const staged = capture(el)

    const sel = el.querySelector('.editable-field__type') as HTMLSelectElement
    sel.value = 'phone'
    sel.dispatchEvent(new Event('change', { bubbles: true }))
    ;(el.querySelector('[data-action="cancel-field"]') as HTMLElement).click()
    expect(staged.get()).toBeNull()
  })

  it('Save button is disabled while no changes are made', () => {
    const { root, el } = mount()
    setSelection(root, { kind: 'field', id: 'f1' })
    const saveBtn = el.querySelector(
      '[data-action="save-field"]',
    ) as HTMLButtonElement
    expect(saveBtn.disabled).toBe(true)
  })

  it('remove-field acts immediately (structural, not drafted)', () => {
    const { root, el } = mount()
    setSelection(root, { kind: 'field', id: 'f1' })
    // biome-ignore lint/suspicious/noExplicitAny: test capture
    let staged: any = null
    root.addEventListener('formeditor:stage-command', (e: Event) => {
      staged = (e as CustomEvent).detail
    })
    ;(el.querySelector('[data-action="remove-field"]') as HTMLElement).click()
    expect(staged.command).toEqual({ kind: 'removeField', id: 'f1' })
  })

  it('label edit updates the draft and only stages on Save', () => {
    const { root, el } = mount()
    setSelection(root, { kind: 'field', id: 'f1' })
    const staged = capture(root)
    ;(el.querySelector('.editable-field__label') as HTMLElement).click()
    const input = el.querySelector(
      '.editable-field__label-input',
    ) as HTMLInputElement
    input.value = 'Email address'
    input.dispatchEvent(new Event('blur', { bubbles: true }))
    expect(staged.get()).toBeNull()
    ;(el.querySelector('[data-action="save-field"]') as HTMLElement).click()
    expect(staged.get().command).toEqual({
      kind: 'relabelField',
      id: 'f1',
      label: 'Email address',
    })
  })
})
