import { GlobalRegistrator } from '@happy-dom/global-registrator'

if (!('window' in globalThis)) GlobalRegistrator.register()

import { afterAll, beforeEach, describe, expect, it } from 'bun:test'

await import('../../../src/design-system/components/flex-staged-changes/client')

describe('flex-staged-changes', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterAll(() => {
    GlobalRegistrator.unregister()
  })

  it('renders humanized lines for buffered commands', () => {
    const el = document.createElement('flex-staged-changes') as any
    document.body.appendChild(el)
    el.update(
      [
        { kind: 'renamePage', id: 'p1', title: 'New' },
        { kind: 'setRequired', id: 'f1', required: true },
      ],
      {
        formSpec: {
          id: 'f',
          specId: 'd',
          title: 't',
          pages: [{ id: 'p1', title: 'Old', groups: [] }],
        },
        dataSpec: {
          id: 'd',
          title: 't',
          description: '',
          groups: [
            {
              id: 'g1',
              title: 'G',
              requirements: [
                {
                  id: 'f1',
                  label: 'Email',
                  fieldType: 'text',
                  required: false,
                },
              ],
            },
          ],
        },
      },
    )
    const items = el.querySelectorAll('.staged-changes__item')
    expect(items.length).toBe(2)
    expect(items[0].textContent).toContain('Rename page')
    expect(items[1].textContent).toContain('Email')
  })

  it('emits staged-changes:remove when remove button clicked', () => {
    const el = document.createElement('flex-staged-changes') as any
    document.body.appendChild(el)
    el.update([{ kind: 'renamePage', id: 'p1', title: 'New' }], {
      formSpec: {
        id: 'f',
        specId: 'd',
        title: 't',
        pages: [{ id: 'p1', title: 'Old', groups: [] }],
      },
      dataSpec: { id: 'd', title: 't', description: '', groups: [] },
    })
    let removedIndex = -1
    el.addEventListener('staged-changes:remove', (e: any) => {
      removedIndex = e.detail.index
    })
    el.querySelector('.staged-changes__remove').dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    )
    expect(removedIndex).toBe(0)
  })
})
