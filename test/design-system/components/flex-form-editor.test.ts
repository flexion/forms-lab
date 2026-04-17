/**
 * Browser component tests for flex-form-editor.
 * Uses @happy-dom/global-registrator to provide DOM globals before the custom
 * element module is loaded. Dynamic import is required because ESM static
 * imports are hoisted before top-level statements.
 */

import { afterAll, beforeEach, describe, expect, it } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'

GlobalRegistrator.register()

// Dynamic import so the module is evaluated AFTER happy-dom patches globalThis.
await import('../../../src/design-system/components/flex-form-editor/client')

const SAMPLE_STATE = {
  formSpec: {
    id: 'f1',
    specId: 'd1',
    title: 'Test',
    pages: [{ id: 'p1', title: 'Page 1', groups: ['g1'] }],
  },
  dataSpec: {
    id: 'd1',
    title: 'T',
    description: '',
    groups: [
      {
        id: 'g1',
        title: 'Group 1',
        requirements: [
          { id: 'f1', label: 'First name', fieldType: 'text', required: false },
        ],
      },
    ],
  },
}

function mountEditor() {
  document.body.innerHTML = ''
  const el = document.createElement('flex-form-editor')
  el.dataset.editBase = '/test/edit'
  el.dataset.previewBase = '/test/preview'
  el.dataset.currentSha = 'a'.repeat(40)
  el.innerHTML = `
    <script type="application/json" data-initial-state>${JSON.stringify(SAMPLE_STATE)}</script>
    <script type="application/json" data-shaping-log>[]</script>
  `
  document.body.appendChild(el)
  return el
}

afterAll(() => {
  GlobalRegistrator.unregister()
})

describe('flex-form-editor save', () => {
  it('POSTs buffer to /edit/save and clears the buffer on success', async () => {
    const el = mountEditor()
    let posted: { url: string; body: Record<string, unknown> } | null = null
    const newSha = 'b'.repeat(40)
    const newState = {
      ...SAMPLE_STATE,
      formSpec: {
        ...SAMPLE_STATE.formSpec,
        pages: [{ id: 'p1', title: 'Renamed', groups: ['g1'] }],
      },
    }
    globalThis.fetch = (async (url: string, init?: RequestInit) => {
      posted = {
        url,
        body: JSON.parse(init?.body as string) as Record<string, unknown>,
      }
      return new Response(JSON.stringify({ state: newState, sha: newSha }), {
        status: 200,
      })
    }) as typeof globalThis.fetch

    el.dispatchEvent(
      new CustomEvent('formeditor:stage-command', {
        detail: {
          command: { kind: 'renamePage', id: 'p1', title: 'Renamed' },
          explanation: 'Rename',
        },
      }),
    )
    const editor = el as unknown as {
      saveStaged(): Promise<void>
      bufferLength: number
    }
    await editor.saveStaged()

    const p = posted as unknown as {
      url: string
      body: Record<string, unknown>
    }
    expect(p.url).toBe('/test/edit/save')
    expect(p.body.commands as unknown[]).toHaveLength(1)
    expect(p.body.parentSha).toBe('a'.repeat(40))
    expect(p.body.source).toBe('manual')
    expect(el.dataset.currentSha).toBe(newSha)
    expect(editor.bufferLength).toBe(0)
  })
})

describe('flex-form-editor staged buffer', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('appends a stage-command event into the buffer and projects state', async () => {
    const el = mountEditor()
    let projected: { state: typeof SAMPLE_STATE; bufferLength: number } | null =
      null
    el.addEventListener('formeditor:state-projected', (e) => {
      projected = (e as CustomEvent).detail
    })
    el.dispatchEvent(
      new CustomEvent('formeditor:stage-command', {
        detail: {
          command: { kind: 'renamePage', id: 'p1', title: 'Renamed' },
          explanation: 'Rename page',
        },
        bubbles: true,
        composed: true,
      }),
    )
    await new Promise((r) => setTimeout(r, 0))
    expect(projected).not.toBeNull()
    expect(projected!.bufferLength).toBe(1)
    expect(projected!.state.formSpec.pages[0].title).toBe('Renamed')
  })

  it('discard clears the buffer and reprojects to canonical state', async () => {
    const el = mountEditor()
    el.dispatchEvent(
      new CustomEvent('formeditor:stage-command', {
        detail: {
          command: { kind: 'renamePage', id: 'p1', title: 'Renamed' },
          explanation: 'Rename',
        },
      }),
    )
    let lastProjected: {
      state: typeof SAMPLE_STATE
      bufferLength: number
    } | null = null
    el.addEventListener('formeditor:state-projected', (e) => {
      lastProjected = (e as CustomEvent).detail
    })
    ;(el as any).discardStaged()
    await new Promise((r) => setTimeout(r, 0))
    expect(lastProjected!.bufferLength).toBe(0)
    expect(lastProjected!.state.formSpec.pages[0].title).toBe('Page 1')
  })
})
