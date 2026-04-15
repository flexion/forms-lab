import { describe, expect, it } from 'bun:test'
import type { DataCollectionSpec } from '../../../src/services/data-collection/types'
import type { ProjectState } from '../../../src/services/forms/shaping/commands'
import { executeCommand } from '../../../src/services/forms/shaping/executor'
import type { FormSpec } from '../../../src/services/forms/types'

function fixture(): ProjectState {
  const dataSpec: DataCollectionSpec = {
    id: 'ds1',
    title: 'Test',
    description: '',
    groups: [
      { id: 'g1', title: 'G1', requirements: [] },
      { id: 'g2', title: 'G2', requirements: [] },
      { id: 'g3', title: 'G3', requirements: [] },
    ],
  }
  const formSpec: FormSpec = {
    id: 'f1',
    specId: 'ds1',
    title: 'Form',
    pages: [
      { id: 'p1', title: 'Page 1', groups: ['g1'] },
      { id: 'p2', title: 'Page 2', groups: ['g2'] },
      { id: 'p3', title: 'Page 3', groups: ['g3'] },
    ],
  }
  return { formSpec, dataSpec }
}

describe('executor — page commands', () => {
  it('swapPages exchanges two pages in the array', () => {
    const result = executeCommand(fixture(), {
      kind: 'swapPages',
      a: 'p1',
      b: 'p3',
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.state.formSpec.pages.map((p) => p.id)).toEqual([
        'p3',
        'p2',
        'p1',
      ])
    }
  })

  it('swapPages rejects unknown page id', () => {
    const result = executeCommand(fixture(), {
      kind: 'swapPages',
      a: 'p1',
      b: 'nope',
    })
    expect(result.ok).toBe(false)
  })

  it('reorderPages applies new order', () => {
    const result = executeCommand(fixture(), {
      kind: 'reorderPages',
      order: ['p3', 'p1', 'p2'],
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.state.formSpec.pages.map((p) => p.id)).toEqual([
        'p3',
        'p1',
        'p2',
      ])
    }
  })

  it('reorderPages rejects incomplete order', () => {
    const result = executeCommand(fixture(), {
      kind: 'reorderPages',
      order: ['p1', 'p2'],
    })
    expect(result.ok).toBe(false)
  })

  it('movePage shifts a page to new index', () => {
    const result = executeCommand(fixture(), {
      kind: 'movePage',
      id: 'p1',
      toIndex: 2,
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.state.formSpec.pages.map((p) => p.id)).toEqual([
        'p2',
        'p3',
        'p1',
      ])
    }
  })

  it('renamePage updates the title', () => {
    const result = executeCommand(fixture(), {
      kind: 'renamePage',
      id: 'p2',
      title: 'New Title',
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.state.formSpec.pages[1].title).toBe('New Title')
    }
  })

  it('addPage inserts after specified page', () => {
    const result = executeCommand(fixture(), {
      kind: 'addPage',
      afterPageId: 'p1',
      title: 'Interstitial',
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.state.formSpec.pages.map((p) => p.title)).toEqual([
        'Page 1',
        'Interstitial',
        'Page 2',
        'Page 3',
      ])
    }
  })

  it('removePage fails when page has groups with no relocation', () => {
    const result = executeCommand(fixture(), {
      kind: 'removePage',
      id: 'p1',
    })
    expect(result.ok).toBe(false)
  })

  it('removePage succeeds when moveGroupsTo is provided', () => {
    const result = executeCommand(fixture(), {
      kind: 'removePage',
      id: 'p1',
      moveGroupsTo: 'p2',
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.state.formSpec.pages.map((p) => p.id)).toEqual(['p2', 'p3'])
      expect(result.state.formSpec.pages[0].groups).toEqual(['g2', 'g1'])
    }
  })

  it('setDeliveryMode updates page delivery mode', () => {
    const result = executeCommand(fixture(), {
      kind: 'setDeliveryMode',
      pageId: 'p2',
      mode: 'conversational',
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.state.formSpec.pages[1].deliveryMode).toBe('conversational')
    }
  })

  it('splitPage moves selected groups to new page after original', () => {
    const base = fixture()
    const stateWith2Groups: ProjectState = {
      ...base,
      formSpec: {
        ...base.formSpec,
        pages: [
          { id: 'p1', title: 'Page 1', groups: ['g1', 'g2'] },
          { id: 'p2', title: 'Page 2', groups: ['g3'] },
        ],
      },
    }
    const result = executeCommand(stateWith2Groups, {
      kind: 'splitPage',
      id: 'p1',
      newTitle: 'Page 1b',
      groupsToMove: ['g2'],
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.state.formSpec.pages.length).toBe(3)
      expect(result.state.formSpec.pages[0].groups).toEqual(['g1'])
      expect(result.state.formSpec.pages[1].title).toBe('Page 1b')
      expect(result.state.formSpec.pages[1].groups).toEqual(['g2'])
    }
  })

  it('mergePages moves groups from source into destination and removes source', () => {
    const result = executeCommand(fixture(), {
      kind: 'mergePages',
      intoId: 'p1',
      fromId: 'p2',
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.state.formSpec.pages.length).toBe(2)
      expect(result.state.formSpec.pages[0].groups).toEqual(['g1', 'g2'])
    }
  })
})
