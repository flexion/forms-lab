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

function mount() {
  document.body.innerHTML = ''
  const root = document.createElement('flex-form-editor')
  const el = document.createElement('flex-editable-page')
  root.appendChild(el)
  document.body.appendChild(root)
  // biome-ignore lint/suspicious/noExplicitAny: test access to update()
  ;(el as any).update(STATE, 0)
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

describe('flex-editable-page preview', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('renders the current page title as plain text by default', () => {
    const { el } = mount()
    expect(el.querySelector('.editable-page__title')!.textContent).toBe(
      'Page A',
    )
    expect(el.querySelector('.editable-page__toolbar')).toBeNull()
    expect(el.querySelector('[data-action="add-page"]')).toBeNull()
    // No page-switcher tabs: sidebar is the only page navigation
    expect(el.querySelector('.editable-page__tab')).toBeNull()
  })

  it('switches the rendered page when the editor dispatches switch-page', () => {
    const { root, el } = mount()
    root.dispatchEvent(
      new CustomEvent('formeditor:switch-page', {
        detail: { id: 'p2' },
        bubbles: false,
      }),
    )
    expect(el.querySelector('.editable-page__title')!.textContent).toBe(
      'Page B',
    )
  })

  it('title click dispatches formeditor:select for the current page', () => {
    const { el } = mount()
    // biome-ignore lint/suspicious/noExplicitAny: test capture
    let detail: any = null
    el.addEventListener('formeditor:select', (e: Event) => {
      detail = (e as CustomEvent).detail
    })
    ;(el.querySelector('.editable-page__title') as HTMLElement).click()
    expect(detail).toEqual({ kind: 'page', id: 'p1' })
  })
})

describe('flex-editable-page selected', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('shows the page toolbar once selected', () => {
    const { root, el } = mount()
    setSelection(root, { kind: 'page', id: 'p1' })
    expect(el.querySelector('.editable-page__toolbar')).not.toBeNull()
    expect(el.querySelector('[data-action="add-page"]')).not.toBeNull()
    expect(el.querySelector('[data-action="remove-page"]')).not.toBeNull()
    expect(el.querySelector('[data-action="deselect-page"]')).not.toBeNull()
  })

  it('commits renamePage after clicking title and blurring', () => {
    const { root, el } = mount()
    setSelection(root, { kind: 'page', id: 'p1' })
    // biome-ignore lint/suspicious/noExplicitAny: test capture
    let staged: any = null
    el.addEventListener('formeditor:stage-command', (e: Event) => {
      staged = (e as CustomEvent).detail
    })
    ;(el.querySelector('.editable-page__title') as HTMLElement).click()
    const input = el.querySelector(
      '.editable-page__title-input',
    ) as HTMLInputElement
    expect(input).not.toBeNull()
    input.value = 'Renamed'
    input.dispatchEvent(new Event('blur', { bubbles: true }))
    expect(staged.command).toEqual({
      kind: 'renamePage',
      id: 'p1',
      title: 'Renamed',
    })
  })

  it('emits addPage from the toolbar', () => {
    const { root, el } = mount()
    setSelection(root, { kind: 'page', id: 'p1' })
    // biome-ignore lint/suspicious/noExplicitAny: test capture
    let staged: any = null
    el.addEventListener('formeditor:stage-command', (e: Event) => {
      staged = (e as CustomEvent).detail
    })
    ;(el.querySelector('[data-action="add-page"]') as HTMLElement).click()
    expect(staged.command.kind).toBe('addPage')
    expect(staged.command.title).toMatch(/New page/)
  })

  it('emits removePage on delete', () => {
    const { root, el } = mount()
    setSelection(root, { kind: 'page', id: 'p1' })
    // biome-ignore lint/suspicious/noExplicitAny: test capture
    let staged: any = null
    el.addEventListener('formeditor:stage-command', (e: Event) => {
      staged = (e as CustomEvent).detail
    })
    ;(el.querySelector('[data-action="remove-page"]') as HTMLElement).click()
    expect(staged.command).toEqual({ kind: 'removePage', id: 'p1' })
  })

  it('emits setDeliveryMode on delivery change', () => {
    const { root, el } = mount()
    setSelection(root, { kind: 'page', id: 'p1' })
    // biome-ignore lint/suspicious/noExplicitAny: test capture
    let staged: any = null
    el.addEventListener('formeditor:stage-command', (e: Event) => {
      staged = (e as CustomEvent).detail
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

  it('emits swapPages on page-down', () => {
    const { root, el } = mount()
    setSelection(root, { kind: 'page', id: 'p1' })
    // biome-ignore lint/suspicious/noExplicitAny: test capture
    let staged: any = null
    el.addEventListener('formeditor:stage-command', (e: Event) => {
      staged = (e as CustomEvent).detail
    })
    ;(el.querySelector('[data-action="page-down"]') as HTMLElement).click()
    expect(staged.command).toEqual({ kind: 'swapPages', a: 'p1', b: 'p2' })
  })

  it('emits addGroup from the footer', () => {
    const { root, el } = mount()
    setSelection(root, { kind: 'page', id: 'p1' })
    // biome-ignore lint/suspicious/noExplicitAny: test capture
    let staged: any = null
    el.addEventListener('formeditor:stage-command', (e: Event) => {
      staged = (e as CustomEvent).detail
    })
    ;(el.querySelector('[data-action="add-group"]') as HTMLElement).click()
    expect(staged.command.kind).toBe('addGroup')
    expect(staged.command.pageId).toBe('p1')
  })
})

describe('flex-editable-page renders groups', () => {
  it('renders one flex-editable-group per group on the page', () => {
    const { el } = mount()
    const groups = el.querySelectorAll('flex-editable-group')
    expect(groups.length).toBe(1)
    expect((groups[0] as HTMLElement).dataset.groupId).toBe('g1')
  })
})
