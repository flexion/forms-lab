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

describe('flex-editable-field', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterAll(() => GlobalRegistrator.unregister())

  it('renders the label as text in preview mode', () => {
    // biome-ignore lint/suspicious/noExplicitAny: test access to update()
    const el = document.createElement('flex-editable-field') as any
    document.body.appendChild(el)
    el.update(FIELD, 'g1')
    const labelSpan = el.querySelector('.editable-field__label')
    expect(labelSpan).not.toBeNull()
    expect(labelSpan.textContent).toBe('Email')
    // No input in preview mode
    expect(el.querySelector('.editable-field__label-input')).toBeNull()
    // Toolbar and expander trigger still present
    expect(el.querySelector('.editable-field__type')).not.toBeNull()
    expect(el.querySelector('[data-action="toggle-required"]')).not.toBeNull()
    expect(el.querySelector('[data-action="remove-field"]')).not.toBeNull()
    expect(el.querySelector('[data-action="toggle-more"]')).not.toBeNull()
  })

  it('enters edit mode on label click; commits relabelField on blur', () => {
    // biome-ignore lint/suspicious/noExplicitAny: test access to update()
    const el = document.createElement('flex-editable-field') as any
    document.body.appendChild(el)
    el.update(FIELD, 'g1')
    // biome-ignore lint/suspicious/noExplicitAny: test-scoped staged capture
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

  it('Escape cancels label edit without staging', () => {
    // biome-ignore lint/suspicious/noExplicitAny: test access to update()
    const el = document.createElement('flex-editable-field') as any
    document.body.appendChild(el)
    el.update(FIELD, 'g1')
    // biome-ignore lint/suspicious/noExplicitAny: test-scoped staged capture
    let staged: any = null
    el.addEventListener('formeditor:stage-command', (e: Event) => {
      staged = (e as CustomEvent).detail
    })

    ;(el.querySelector('.editable-field__label') as HTMLElement).click()
    const input = el.querySelector(
      '.editable-field__label-input',
    ) as HTMLInputElement | null
    input!.value = 'Email address (draft)'
    input!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    )
    input!.dispatchEvent(new Event('blur', { bubbles: true }))

    expect(staged).toBeNull()
    expect(el.querySelector('.editable-field__label')!.textContent).toBe(
      'Email',
    )
  })

  it('emits setRequired on toggle', () => {
    // biome-ignore lint/suspicious/noExplicitAny: test access to update()
    const el = document.createElement('flex-editable-field') as any
    document.body.appendChild(el)
    el.update(FIELD, 'g1')
    // biome-ignore lint/suspicious/noExplicitAny: test-scoped staged capture
    let staged: any = null
    el.addEventListener('formeditor:stage-command', (e: Event) => {
      staged = (e as CustomEvent).detail
    })
    el.querySelector('[data-action="toggle-required"]').dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    )
    expect(staged.command).toEqual({
      kind: 'setRequired',
      id: 'f1',
      required: true,
    })
  })

  it('emits removeField on delete', () => {
    // biome-ignore lint/suspicious/noExplicitAny: test access to update()
    const el = document.createElement('flex-editable-field') as any
    document.body.appendChild(el)
    el.update(FIELD, 'g1')
    // biome-ignore lint/suspicious/noExplicitAny: test-scoped staged capture
    let staged: any = null
    el.addEventListener('formeditor:stage-command', (e: Event) => {
      staged = (e as CustomEvent).detail
    })
    el.querySelector('[data-action="remove-field"]').dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    )
    expect(staged.command).toEqual({ kind: 'removeField', id: 'f1' })
  })

  it('emits changeFieldType on type select', () => {
    // biome-ignore lint/suspicious/noExplicitAny: test access to update()
    const el = document.createElement('flex-editable-field') as any
    document.body.appendChild(el)
    el.update(FIELD, 'g1')
    // biome-ignore lint/suspicious/noExplicitAny: test-scoped staged capture
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
})
