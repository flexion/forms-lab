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

function mount() {
  document.body.innerHTML = ''
  const root = document.createElement('flex-form-editor')
  const el = document.createElement('flex-editable-group')
  root.appendChild(el)
  document.body.appendChild(root)
  // biome-ignore lint/suspicious/noExplicitAny: test access to update()
  ;(el as any).update(GROUP)
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

describe('flex-editable-group preview vs selected', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('renders the group as fieldset+legend with no toolbar when not selected', () => {
    const { el } = mount()
    const legend = el.querySelector('.editable-group__legend')
    expect(legend).not.toBeNull()
    expect(legend!.textContent).toBe('Personal')
    expect(el.querySelector('[data-action="add-field"]')).toBeNull()
    expect(el.querySelector('[data-action="remove-group"]')).toBeNull()
  })

  it('clicking the legend dispatches formeditor:select for the group', () => {
    const { el } = mount()
    // biome-ignore lint/suspicious/noExplicitAny: test capture
    let selectDetail: any = null
    el.addEventListener('formeditor:select', (e: Event) => {
      selectDetail = (e as CustomEvent).detail
    })
    ;(el.querySelector('.editable-group__legend') as HTMLElement).click()
    expect(selectDetail).toEqual({ kind: 'group', id: 'g1' })
  })

  it('shows toolbar actions when selected', () => {
    const { root, el } = mount()
    setSelection(root, { kind: 'group', id: 'g1' })
    expect(el.querySelector('[data-action="add-field"]')).not.toBeNull()
    expect(el.querySelector('[data-action="remove-group"]')).not.toBeNull()
    expect(el.querySelector('[data-action="deselect-group"]')).not.toBeNull()
  })

  it('commits renameGroup after clicking title and blurring', () => {
    const { root, el } = mount()
    setSelection(root, { kind: 'group', id: 'g1' })
    // biome-ignore lint/suspicious/noExplicitAny: test capture
    let staged: any = null
    el.addEventListener('formeditor:stage-command', (e: Event) => {
      staged = (e as CustomEvent).detail
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

  it('emits addField from the selected toolbar', () => {
    const { root, el } = mount()
    setSelection(root, { kind: 'group', id: 'g1' })
    // biome-ignore lint/suspicious/noExplicitAny: test capture
    let staged: any = null
    el.addEventListener('formeditor:stage-command', (e: Event) => {
      staged = (e as CustomEvent).detail
    })
    ;(el.querySelector('[data-action="add-field"]') as HTMLElement).click()
    expect(staged.command.kind).toBe('addField')
    expect(staged.command.groupId).toBe('g1')
  })

  it('emits removeGroup from the selected toolbar', () => {
    const { root, el } = mount()
    setSelection(root, { kind: 'group', id: 'g1' })
    // biome-ignore lint/suspicious/noExplicitAny: test capture
    let staged: any = null
    el.addEventListener('formeditor:stage-command', (e: Event) => {
      staged = (e as CustomEvent).detail
    })
    ;(el.querySelector('[data-action="remove-group"]') as HTMLElement).click()
    expect(staged.command).toEqual({ kind: 'removeGroup', id: 'g1' })
  })
})
