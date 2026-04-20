import { describe, expect, test } from 'bun:test'
import {
  buildReviewPages,
  filterVisibleGroups,
} from '../../../src/services/forms'

describe('filterVisibleGroups', () => {
  test('returns all groups when none have conditions', () => {
    const groups = [
      {
        id: 'g1',
        title: 'Group 1',
        requirements: [
          {
            id: 'r1',
            fieldName: 'name',
            label: 'Name',
            fieldType: 'text' as const,
            required: true,
          },
        ],
      },
    ]
    const result = filterVisibleGroups(groups, {})
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('g1')
  })

  test('filters out groups whose condition is not met', () => {
    const groups = [
      {
        id: 'g1',
        title: 'Group 1',
        condition: {
          field: 'toggle',
          operator: 'equals' as const,
          value: 'yes',
        },
        requirements: [
          {
            id: 'r1',
            fieldName: 'name',
            label: 'Name',
            fieldType: 'text' as const,
            required: true,
          },
        ],
      },
    ]
    const result = filterVisibleGroups(groups, {
      toggle: { value: 'no' },
    })
    expect(result).toHaveLength(0)
  })

  test('filters out requirements whose condition is not met', () => {
    const groups = [
      {
        id: 'g1',
        title: 'Group 1',
        requirements: [
          {
            id: 'r1',
            fieldName: 'name',
            label: 'Name',
            fieldType: 'text' as const,
            required: true,
          },
          {
            id: 'r2',
            fieldName: 'extra',
            label: 'Extra',
            fieldType: 'text' as const,
            required: true,
            condition: {
              field: 'toggle',
              operator: 'equals' as const,
              value: 'yes',
            },
          },
        ],
      },
    ]
    const result = filterVisibleGroups(groups, {
      toggle: { value: 'no' },
    })
    expect(result).toHaveLength(1)
    expect(result[0].requirements).toHaveLength(1)
    expect(result[0].requirements[0].fieldName).toBe('name')
  })
})

describe('buildReviewPages', () => {
  const resolved = {
    formSpec: {
      id: 'fs1',
      specId: 'spec1',
      title: 'Test Form',
      pages: [{ id: 'p1', title: 'Page 1', groups: ['g1'] }],
    },
    dataSpec: {
      id: 'spec1',
      title: 'Test Spec',
      description: '',
      groups: [
        {
          id: 'g1',
          title: 'Group 1',
          requirements: [
            {
              id: 'r1',
              fieldName: 'name',
              label: 'Name',
              fieldType: 'text' as const,
              required: true,
            },
          ],
        },
      ],
    },
    pages: [
      {
        page: { id: 'p1', title: 'Page 1', groups: ['g1'] },
        groups: [
          {
            id: 'g1',
            title: 'Group 1',
            requirements: [
              {
                id: 'r1',
                fieldName: 'name',
                label: 'Name',
                fieldType: 'text' as const,
                required: true,
              },
            ],
          },
        ],
      },
    ],
  }

  test('produces review page data from resolved form', () => {
    const result = buildReviewPages(resolved, {})
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('p1')
    expect(result[0].title).toBe('Page 1')
    expect(result[0].groups).toHaveLength(1)
    expect(result[0].groups[0].requirements[0]).toEqual({
      fieldName: 'name',
      label: 'Name',
    })
  })

  test('filters out pages whose condition is not met', () => {
    const withCondition = {
      ...resolved,
      pages: [
        {
          page: {
            id: 'p1',
            title: 'Page 1',
            groups: ['g1'],
            condition: {
              field: 'toggle',
              operator: 'equals' as const,
              value: 'yes',
            },
          },
          groups: resolved.pages[0].groups,
        },
      ],
    }
    const result = buildReviewPages(withCondition, {
      toggle: { value: 'no' },
    })
    expect(result).toHaveLength(0)
  })
})
