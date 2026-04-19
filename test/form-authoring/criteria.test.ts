import { describe, expect, test } from 'bun:test'
import {
  approveCriteriaSet,
  emptyCriteriaSet,
  mergeCriteriaEdits,
  parseCriteriaSet,
  serializeCriteriaSet,
} from '../../src/services/form-authoring/criteria'
import type {
  CriteriaSet,
  Criterion,
} from '../../src/services/form-authoring/types'

describe('emptyCriteriaSet', () => {
  test('returns an empty unapproved set', () => {
    const set = emptyCriteriaSet()
    expect(set.criteria).toEqual([])
    expect(set.approvedAt).toBeNull()
    expect(set.approvedBy).toBeNull()
  })
})

describe('mergeCriteriaEdits', () => {
  const agentCriteria: Criterion[] = [
    {
      id: 'c1',
      text: 'Must collect SSN',
      source: '7 CFR 273.2',
      status: 'pending',
    },
    {
      id: 'c2',
      text: 'Must verify identity',
      source: '7 CFR 273.2(b)',
      status: 'pending',
    },
  ]

  test('approves specified criteria', () => {
    const result = mergeCriteriaEdits(
      { criteria: agentCriteria, approvedAt: null, approvedBy: null },
      { approve: ['c1'], reject: [], add: [], edit: [] },
    )
    expect(result.criteria[0].status).toBe('approved')
    expect(result.criteria[1].status).toBe('pending')
  })

  test('rejects specified criteria', () => {
    const result = mergeCriteriaEdits(
      { criteria: agentCriteria, approvedAt: null, approvedBy: null },
      { approve: [], reject: ['c2'], add: [], edit: [] },
    )
    expect(result.criteria[1].status).toBe('rejected')
  })

  test('adds new human criteria', () => {
    const result = mergeCriteriaEdits(
      { criteria: agentCriteria, approvedAt: null, approvedBy: null },
      {
        approve: [],
        reject: [],
        add: [
          { text: 'Must include work registration', source: '7 CFR 273.7' },
        ],
        edit: [],
      },
    )
    expect(result.criteria).toHaveLength(3)
    expect(result.criteria[2].status).toBe('added')
    expect(result.criteria[2].text).toBe('Must include work registration')
  })

  test('edits existing criteria text', () => {
    const result = mergeCriteriaEdits(
      { criteria: agentCriteria, approvedAt: null, approvedBy: null },
      {
        approve: [],
        reject: [],
        add: [],
        edit: [
          {
            id: 'c1',
            text: 'Must collect SSN (last 4 digits)',
            source: '7 CFR 273.2',
          },
        ],
      },
    )
    expect(result.criteria[0].text).toBe('Must collect SSN (last 4 digits)')
  })
})

describe('approveCriteriaSet', () => {
  test('sets approvedAt and approvedBy, marks all pending as approved', () => {
    const set: CriteriaSet = {
      criteria: [
        { id: 'c1', text: 'Test', source: 'CFR', status: 'pending' },
        { id: 'c2', text: 'Test2', source: 'CFR', status: 'added' },
        { id: 'c3', text: 'Test3', source: 'CFR', status: 'rejected' },
      ],
      approvedAt: null,
      approvedBy: null,
    }
    const result = approveCriteriaSet(set, 'testuser')
    expect(result.approvedBy).toBe('testuser')
    expect(result.approvedAt).toBeTruthy()
    expect(result.criteria[0].status).toBe('approved')
    expect(result.criteria[1].status).toBe('added')
    expect(result.criteria[2].status).toBe('rejected')
  })
})

describe('serialize/parse round-trip', () => {
  test('round-trips a criteria set through JSON', () => {
    const set: CriteriaSet = {
      criteria: [
        {
          id: 'c1',
          text: 'Must collect SSN',
          source: '7 CFR 273.2',
          status: 'approved',
        },
      ],
      approvedAt: '2026-04-19T12:00:00Z',
      approvedBy: 'testuser',
    }
    const json = serializeCriteriaSet(set)
    const parsed = parseCriteriaSet(json)
    expect(parsed).toEqual(set)
  })
})
