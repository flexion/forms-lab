import { GlobalRegistrator } from '@happy-dom/global-registrator'
if (!('window' in globalThis)) GlobalRegistrator.register()

import { afterAll, beforeEach, describe, expect, it } from 'bun:test'
await import('../../../src/design-system/components/flex-editable-field/client')

const FIELD = {
  id: 'f1',
  label: 'Email',
  fieldType: 'email',
  required: false,
} as any

describe('flex-editable-field chips', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterAll(() => GlobalRegistrator.unregister())

  it('renders label, type, required, delete chips', () => {
    const el = document.createElement('flex-editable-field') as any
    document.body.appendChild(el)
    el.update(FIELD, 'g1')
    expect(el.querySelector('.editable-field__label-input')!.getAttribute('value')).toBe('Email')
    expect(el.querySelector('.editable-field__type')).not.toBeNull()
    expect(el.querySelector('[data-action="toggle-required"]')).not.toBeNull()
    expect(el.querySelector('[data-action="remove-field"]')).not.toBeNull()
  })

  it('emits relabelField on label change after debounce', async () => {
    const el = document.createElement('flex-editable-field') as any
    document.body.appendChild(el)
    el.update(FIELD, 'g1')
    let staged: any = null
    el.addEventListener('formeditor:stage-command', (e: any) => { staged = e.detail })
    const input = el.querySelector('.editable-field__label-input') as HTMLInputElement
    input.value = 'Email address'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await new Promise((r) => setTimeout(r, 450))
    expect(staged.command).toEqual({
      kind: 'relabelField',
      id: 'f1',
      label: 'Email address',
    })
  })

  it('emits setRequired on toggle', () => {
    const el = document.createElement('flex-editable-field') as any
    document.body.appendChild(el)
    el.update(FIELD, 'g1')
    let staged: any = null
    el.addEventListener('formeditor:stage-command', (e: any) => { staged = e.detail })
    el.querySelector('[data-action="toggle-required"]').dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(staged.command).toEqual({ kind: 'setRequired', id: 'f1', required: true })
  })

  it('emits removeField on delete', () => {
    const el = document.createElement('flex-editable-field') as any
    document.body.appendChild(el)
    el.update(FIELD, 'g1')
    let staged: any = null
    el.addEventListener('formeditor:stage-command', (e: any) => { staged = e.detail })
    el.querySelector('[data-action="remove-field"]').dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(staged.command).toEqual({ kind: 'removeField', id: 'f1' })
  })

  it('emits changeFieldType on type select', () => {
    const el = document.createElement('flex-editable-field') as any
    document.body.appendChild(el)
    el.update(FIELD, 'g1')
    let staged: any = null
    el.addEventListener('formeditor:stage-command', (e: any) => { staged = e.detail })
    const sel = el.querySelector('.editable-field__type') as HTMLSelectElement
    sel.value = 'phone'
    sel.dispatchEvent(new Event('change', { bubbles: true }))
    expect(staged.command).toEqual({ kind: 'changeFieldType', id: 'f1', fieldType: 'phone' })
  })
})
