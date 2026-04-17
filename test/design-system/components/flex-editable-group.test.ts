import { afterAll, beforeEach, describe, expect, it } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'

GlobalRegistrator.register()

await import('../../../src/design-system/components/flex-editable-group/client')

afterAll(() => GlobalRegistrator.unregister())

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

  it('renders the group title as text and a +field button', () => {
    const el = document.createElement('flex-editable-group') as any
    document.body.appendChild(el)
    el.update(GROUP)
    const title = el.querySelector('.editable-group__title')
    expect(title).not.toBeNull()
    expect(title.textContent).toBe('Personal')
    expect(el.querySelector('.editable-group__title-input')).toBeNull()
    expect(el.querySelector('[data-action="add-field"]')).not.toBeNull()
  })

  it('enters edit mode on title click and commits renameGroup on blur', () => {
    const el = document.createElement('flex-editable-group') as any
    document.body.appendChild(el)
    el.update(GROUP)
    let staged: any = null
    el.addEventListener('formeditor:stage-command', (e: any) => {
      staged = e.detail
    })
    ;(el.querySelector('.editable-group__title') as HTMLElement).click()
    const input = el.querySelector(
      '.editable-group__title-input',
    ) as HTMLInputElement
    expect(input).not.toBeNull()
    input.value = 'Identity'
    input.dispatchEvent(new Event('blur', { bubbles: true }))
    expect(staged.command).toEqual({
      kind: 'renameGroup',
      id: 'g1',
      title: 'Identity',
    })
  })

  it('emits addField on +field click', () => {
    const el = document.createElement('flex-editable-group') as any
    document.body.appendChild(el)
    el.update(GROUP)
    let staged: any = null
    el.addEventListener('formeditor:stage-command', (e: any) => {
      staged = e.detail
    })
    el.querySelector('[data-action="add-field"]').dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    )
    expect(staged.command.kind).toBe('addField')
    expect(staged.command.groupId).toBe('g1')
  })

  it('emits removeGroup on delete', () => {
    const el = document.createElement('flex-editable-group') as any
    document.body.appendChild(el)
    el.update(GROUP)
    let staged: any = null
    el.addEventListener('formeditor:stage-command', (e: any) => {
      staged = e.detail
    })
    el.querySelector('[data-action="remove-group"]').dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    )
    expect(staged.command).toEqual({ kind: 'removeGroup', id: 'g1' })
  })
})
