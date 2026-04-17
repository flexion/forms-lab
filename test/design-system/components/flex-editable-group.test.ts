import { GlobalRegistrator } from '@happy-dom/global-registrator'
if (!('window' in globalThis)) GlobalRegistrator.register()

import { afterAll, beforeEach, describe, expect, it } from 'bun:test'
await import('../../../src/design-system/components/flex-editable-group/client')

const GROUP = {
  id: 'g1',
  title: 'Personal',
  requirements: [
    { id: 'f1', label: 'First name', fieldType: 'text', required: false },
  ],
}

describe('flex-editable-group', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterAll(() => GlobalRegistrator.unregister())

  it('renders the group title and a +field button', () => {
    const el = document.createElement('flex-editable-group') as any
    document.body.appendChild(el)
    el.update(GROUP)
    expect(el.querySelector('.editable-group__title-input')!.getAttribute('value')).toBe('Personal')
    expect(el.querySelector('[data-action="add-field"]')).not.toBeNull()
  })

  it('emits renameGroup on title change', () => {
    const el = document.createElement('flex-editable-group') as any
    document.body.appendChild(el)
    el.update(GROUP)
    let staged: any = null
    el.addEventListener('formeditor:stage-command', (e: any) => { staged = e.detail })
    const input = el.querySelector('.editable-group__title-input') as HTMLInputElement
    input.value = 'Identity'
    input.dispatchEvent(new Event('change', { bubbles: true }))
    expect(staged.command).toEqual({ kind: 'renameGroup', id: 'g1', title: 'Identity' })
  })

  it('emits addField on +field click', () => {
    const el = document.createElement('flex-editable-group') as any
    document.body.appendChild(el)
    el.update(GROUP)
    let staged: any = null
    el.addEventListener('formeditor:stage-command', (e: any) => { staged = e.detail })
    el.querySelector('[data-action="add-field"]').dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(staged.command.kind).toBe('addField')
    expect(staged.command.groupId).toBe('g1')
  })

  it('emits removeGroup on delete', () => {
    const el = document.createElement('flex-editable-group') as any
    document.body.appendChild(el)
    el.update(GROUP)
    let staged: any = null
    el.addEventListener('formeditor:stage-command', (e: any) => { staged = e.detail })
    el.querySelector('[data-action="remove-group"]').dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(staged.command).toEqual({ kind: 'removeGroup', id: 'g1' })
  })
})
