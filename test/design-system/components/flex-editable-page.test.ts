import { GlobalRegistrator } from '@happy-dom/global-registrator'

if (!('window' in globalThis)) GlobalRegistrator.register()

import { afterAll, beforeEach, describe, expect, it } from 'bun:test'

await import('../../../src/design-system/components/flex-editable-page/client')

afterAll(() => GlobalRegistrator.unregister())

const STATE = {
  formSpec: {
    id: 'f',
    specId: 'd',
    title: 't',
    pages: [
      { id: 'p1', title: 'Page A', groups: ['g1'] },
      { id: 'p2', title: 'Page B', groups: [] },
    ],
  },
  dataSpec: {
    id: 'd',
    title: 't',
    description: '',
    groups: [
      {
        id: 'g1',
        title: 'Group',
        requirements: [
          { id: 'f1', label: 'Name', fieldType: 'text', required: false },
        ],
      },
    ],
  },
}

describe('flex-editable-page', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('renders page tabs and a header for the selected page', () => {
    const el = document.createElement('flex-editable-page') as any
    document.body.appendChild(el)
    el.update(STATE, 0)
    const tabs = el.querySelectorAll('.editable-page__tab')
    expect(tabs.length).toBe(2)
    expect(tabs[0].getAttribute('aria-selected')).toBe('true')
    expect(el.querySelector('.editable-page__title').textContent).toBe('Page A')
    expect(el.querySelector('.editable-page__title-input')).toBeNull()
  })

  it('emits select event on tab click', () => {
    const el = document.createElement('flex-editable-page') as any
    document.body.appendChild(el)
    el.update(STATE, 0)
    let detail: any = null
    el.addEventListener('formeditor:select', (e: any) => {
      detail = e.detail
    })
    el.querySelectorAll('.editable-page__tab')[1].dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    )
    expect(detail).toEqual({ kind: 'page', id: 'p2' })
  })
})

describe('flex-editable-page page actions', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('enters edit mode on title click and commits renamePage on blur', () => {
    const el = document.createElement('flex-editable-page') as any
    document.body.appendChild(el)
    el.update(STATE, 0)
    let staged: any = null
    el.addEventListener('formeditor:stage-command', (e: any) => {
      staged = e.detail
    })
    ;(el.querySelector('.editable-page__title') as HTMLElement).click()
    const titleInput = el.querySelector(
      '.editable-page__title-input',
    ) as HTMLInputElement
    expect(titleInput).not.toBeNull()
    titleInput.value = 'Renamed'
    titleInput.dispatchEvent(new Event('blur', { bubbles: true }))
    expect(staged.command).toEqual({
      kind: 'renamePage',
      id: 'p1',
      title: 'Renamed',
    })
  })

  it('emits stage-command addPage when +Page is clicked', () => {
    const el = document.createElement('flex-editable-page') as any
    document.body.appendChild(el)
    el.update(STATE, 0)
    let staged: any = null
    el.addEventListener('formeditor:stage-command', (e: any) => {
      staged = e.detail
    })
    el.querySelector('[data-action="add-page"]').dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    )
    expect(staged.command.kind).toBe('addPage')
    expect(staged.command.title).toMatch(/New page/)
  })

  it('emits removePage stage-command on delete', () => {
    const el = document.createElement('flex-editable-page') as any
    document.body.appendChild(el)
    el.update(STATE, 0)
    let staged: any = null
    el.addEventListener('formeditor:stage-command', (e: any) => {
      staged = e.detail
    })
    el.querySelector('[data-action="remove-page"]').dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    )
    expect(staged.command).toEqual({ kind: 'removePage', id: 'p1' })
  })

  it('emits setDeliveryMode on select change', () => {
    const el = document.createElement('flex-editable-page') as any
    document.body.appendChild(el)
    el.update(STATE, 0)
    let staged: any = null
    el.addEventListener('formeditor:stage-command', (e: any) => {
      staged = e.detail
    })
    const select = el.querySelector(
      '.editable-page__delivery',
    ) as HTMLSelectElement
    select.value = 'conversational'
    select.dispatchEvent(new Event('change', { bubbles: true }))
    expect(staged.command).toEqual({
      kind: 'setDeliveryMode',
      pageId: 'p1',
      mode: 'conversational',
    })
  })

  it('emits swapPages when up/down arrows clicked', () => {
    const el = document.createElement('flex-editable-page') as any
    document.body.appendChild(el)
    el.update(STATE, 0)
    let staged: any = null
    el.addEventListener('formeditor:stage-command', (e: any) => {
      staged = e.detail
    })
    el.querySelector('[data-action="page-down"]').dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    )
    expect(staged.command).toEqual({ kind: 'swapPages', a: 'p1', b: 'p2' })
  })
})

describe('flex-editable-page renders groups', () => {
  it('renders one flex-editable-group per group on the page', () => {
    const el = document.createElement('flex-editable-page') as any
    document.body.appendChild(el)
    el.update(STATE, 0)
    const groups = el.querySelectorAll('flex-editable-group')
    expect(groups.length).toBe(1)
    expect(groups[0].dataset.groupId).toBe('g1')
  })
})
