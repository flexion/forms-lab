import { describe, expect, it } from 'bun:test'
import { ScriptedFillingAgent } from '../../src/services/forms'
import type { FillingContext } from '../../src/services/forms/filling-agent/types'
import { testDataSpec } from './fixtures'

describe('ScriptedFillingAgent', () => {
  it('asks for first field when starting with empty context', async () => {
    const agent = new ScriptedFillingAgent()
    const context: FillingContext = {
      groups: testDataSpec.groups,
      collectedFields: {},
      messages: [],
    }

    const turn = await agent.advance(context, null)

    expect(turn.finished).toBe(false)
    expect(turn.message.toLowerCase()).toContain('full name')
    expect(turn.fieldsCollected).toEqual({})
  })

  it('collects value and moves to next field', async () => {
    const agent = new ScriptedFillingAgent()
    const context: FillingContext = {
      groups: testDataSpec.groups,
      collectedFields: {},
      messages: [
        {
          id: '1',
          sessionId: 'test',
          role: 'assistant',
          content: 'What is your Full Name?',
          toolCalls: [],
          createdAt: '2026-04-18T00:00:00Z',
        },
      ],
    }

    const turn = await agent.advance(context, 'Alice Johnson')

    expect(turn.finished).toBe(false)
    expect(turn.fieldsCollected).toHaveProperty('fullName')
    expect(turn.fieldsCollected.fullName.value).toBe('Alice Johnson')
    expect(turn.message.toLowerCase()).toContain('email')
    expect(turn.toolCalls).toHaveLength(1)
    expect(turn.toolCalls[0].tool).toBe('collect_field')
  })

  it('returns finished when all applicable fields are collected', async () => {
    const agent = new ScriptedFillingAgent()
    // Collect all required fields except the last one (agreeTerms)
    const context: FillingContext = {
      groups: testDataSpec.groups,
      collectedFields: {
        fullName: { value: 'Alice Johnson' },
        email: { value: 'alice@example.com' },
        employed: { value: 'No' },
        startDate: { value: '2026-05-01' },
        dependents: { value: 0 },
      },
      messages: [],
    }

    const turn = await agent.advance(context, 'true')

    expect(turn.fieldsCollected).toHaveProperty('agreeTerms')
    expect(turn.fieldsCollected.agreeTerms.value).toBe(true)
    expect(turn.finished).toBe(true)
    expect(turn.message).toContain('complete')
  })

  it('skips conditional fields when condition is not met', async () => {
    const agent = new ScriptedFillingAgent()
    // Collect fields up to employment question, answer 'No' to skip conditional fields
    const context: FillingContext = {
      groups: testDataSpec.groups,
      collectedFields: {
        fullName: { value: 'Bob Smith' },
        email: { value: 'bob@example.com' },
      },
      messages: [],
    }

    const turn = await agent.advance(context, 'No')

    // Should collect employed='No'
    expect(turn.fieldsCollected).toHaveProperty('employed')
    expect(turn.fieldsCollected.employed.value).toBe('No')

    // Should skip employmentType (requires employed='Yes')
    // Should skip income group (requires employed='Yes')
    // Should move to next applicable field (startDate)
    expect(turn.message.toLowerCase()).toContain('start date')
    expect(turn.finished).toBe(false)
  })
})
