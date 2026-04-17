import { GlobalRegistrator } from '@happy-dom/global-registrator'

if (!('window' in globalThis)) GlobalRegistrator.register()

import { afterAll, beforeEach, describe, expect, it } from 'bun:test'

await import('../../../src/design-system/components/flex-editable-field/client')

const FIELD = {
  id: 'f1',
  label: 'Email',
  fieldType: 'email',
  required: false,
  // biome-ignore lint/suspicious/noExplicitAny: test fixture
} as any

function mount() {
  document.body.innerHTML = ''
  // Simulate a flex-form-editor ancestor so selection wiring activates
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

describe('flex-editable-field preview vs selected', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterAll(() => GlobalRegistrator.unregister())

  it('renders Carlos-style preview without edit chrome when not selected', () => {
    const { el } = mount()
    // Preview uses flex-form-group + flex-label + flex-input (Carlos-side)
    expect(el.querySelector('.flex-form-group')).not.toBeNull()
    expect(el.querySelector('.flex-label')).not.toBeNull()
    // No edit chrome
    expect(el.querySelector('.editable-field__toolbar')).toBeNull()
    expect(el.querySelector('.editable-field__type')).toBeNull()
    expect(el.querySelector('[data-action="toggle-required"]')).toBeNull()
    expect(el.querySelector('[data-action="remove-field"]')).toBeNull()
    expect(el.querySelector('.editable-field__edit')).toBeNull()
  })

  it('clicking the preview dispatches formeditor:select', () => {
    const { el } = mount()
    // biome-ignore lint/suspicious/noExplicitAny: test capture
    let selectDetail: any = null
    el.addEventListener('formeditor:select', (e: Event) => {
      selectDetail = (e as CustomEvent).detail
    })
    ;(el.querySelector('[data-action="select-field"]') as HTMLElement).click()
    expect(selectDetail).toEqual({ kind: 'field', id: 'f1' })
  })

  it('shows edit chrome when selection-changed names this field', () => {
    const { root, el } = mount()
    setSelection(root, { kind: 'field', id: 'f1' })
    expect(el.querySelector('.editable-field__edit')).not.toBeNull()
    expect(el.querySelector('.editable-field__type')).not.toBeNull()
    expect(el.querySelector('[data-action="toggle-required"]')).not.toBeNull()
    expect(el.querySelector('[data-action="remove-field"]')).not.toBeNull()
    expect(el.querySelector('[data-action="deselect-field"]')).not.toBeNull()
  })

  it('collapses back to preview when selection clears', () => {
    const { root, el } = mount()
    setSelection(root, { kind: 'field', id: 'f1' })
    expect(el.querySelector('.editable-field__edit')).not.toBeNull()
    setSelection(root, null)
    expect(el.querySelector('.editable-field__edit')).toBeNull()
    expect(el.querySelector('.flex-form-group')).not.toBeNull()
  })

  it('emits setRequired from the edit toolbar', () => {
    const { root, el } = mount()
    setSelection(root, { kind: 'field', id: 'f1' })
    // biome-ignore lint/suspicious/noExplicitAny: test capture
    let staged: any = null
    el.addEventListener('formeditor:stage-command', (e: Event) => {
      staged = (e as CustomEvent).detail
    })
    ;(
      el.querySelector('[data-action="toggle-required"]') as HTMLElement
    ).click()
    expect(staged.command).toEqual({
      kind: 'setRequired',
      id: 'f1',
      required: true,
    })
  })

  it('emits removeField from the edit toolbar', () => {
    const { root, el } = mount()
    setSelection(root, { kind: 'field', id: 'f1' })
    // biome-ignore lint/suspicious/noExplicitAny: test capture
    let staged: any = null
    el.addEventListener('formeditor:stage-command', (e: Event) => {
      staged = (e as CustomEvent).detail
    })
    ;(el.querySelector('[data-action="remove-field"]') as HTMLElement).click()
    expect(staged.command).toEqual({ kind: 'removeField', id: 'f1' })
  })

  it('emits changeFieldType when the type select changes', () => {
    const { root, el } = mount()
    setSelection(root, { kind: 'field', id: 'f1' })
    // biome-ignore lint/suspicious/noExplicitAny: test capture
    let staged: any = null
    el.addEventListener('formeditor:stage-command', (e: Event) => {
      staged = (e as CustomEvent).detail
    })
    const sel = el.querySelector('.editable-field__type') as HTMLSelectElement
    sel.value = 'phone'
    sel.dispatchEvent(new Event('change', { bubbles: true }))
    expect(staged.command).toEqual({
      kind: 'changeFieldType',
      id: 'f1',
      fieldType: 'phone',
    })
  })

  it('commits relabelField after clicking label and blurring the input', () => {
    const { root, el } = mount()
    setSelection(root, { kind: 'field', id: 'f1' })
    // biome-ignore lint/suspicious/noExplicitAny: test capture
    let staged: any = null
    el.addEventListener('formeditor:stage-command', (e: Event) => {
      staged = (e as CustomEvent).detail
    })
    ;(el.querySelector('.editable-field__label') as HTMLElement).click()
    const input = el.querySelector(
      '.editable-field__label-input',
    ) as HTMLInputElement | null
    expect(input).not.toBeNull()
    input!.value = 'Email address'
    input!.dispatchEvent(new Event('blur', { bubbles: true }))
    expect(staged.command).toEqual({
      kind: 'relabelField',
      id: 'f1',
      label: 'Email address',
    })
  })

  it('Escape during label edit cancels without staging', () => {
    const { root, el } = mount()
    setSelection(root, { kind: 'field', id: 'f1' })
    // biome-ignore lint/suspicious/noExplicitAny: test capture
    let staged: any = null
    el.addEventListener('formeditor:stage-command', (e: Event) => {
      staged = (e as CustomEvent).detail
    })
    ;(el.querySelector('.editable-field__label') as HTMLElement).click()
    const input = el.querySelector(
      '.editable-field__label-input',
    ) as HTMLInputElement
    input.value = 'Draft'
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    )
    input.dispatchEvent(new Event('blur', { bubbles: true }))
    expect(staged).toBeNull()
    expect(el.querySelector('.editable-field__label')!.textContent).toBe(
      'Email',
    )
  })

  it('Done button dispatches deselect', () => {
    const { root, el } = mount()
    setSelection(root, { kind: 'field', id: 'f1' })
    let deselected = false
    el.addEventListener('formeditor:deselect', () => {
      deselected = true
    })
    ;(el.querySelector('[data-action="deselect-field"]') as HTMLElement).click()
    expect(deselected).toBe(true)
  })
})
