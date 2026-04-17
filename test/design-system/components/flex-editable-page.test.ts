import { GlobalRegistrator } from '@happy-dom/global-registrator'
if (!('window' in globalThis)) GlobalRegistrator.register()

import { afterAll, beforeEach, describe, expect, it } from 'bun:test'
await import('../../../src/design-system/components/flex-editable-page/client')

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
        requirements: [{ id: 'f1', label: 'Name', fieldType: 'text', required: false }],
      },
    ],
  },
}

describe('flex-editable-page', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterAll(() => GlobalRegistrator.unregister())

  it('renders page tabs and a header for the selected page', () => {
    const el = document.createElement('flex-editable-page') as any
    document.body.appendChild(el)
    el.update(STATE, 0)
    const tabs = el.querySelectorAll('.editable-page__tab')
    expect(tabs.length).toBe(2)
    expect(tabs[0].getAttribute('aria-selected')).toBe('true')
    expect(el.querySelector('.editable-page__title')!.textContent).toContain('Page A')
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
