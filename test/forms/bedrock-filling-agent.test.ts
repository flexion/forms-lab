import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { BedrockFillingAgent } from '../../src/services/forms/filling-agent/bedrock'
import type { FillingContext } from '../../src/services/forms/filling-agent/types'
import { testDataSpec } from './fixtures'

// Mock the AI SDK
const mockGenerateText = mock()
mock.module('ai', () => ({
  generateText: mockGenerateText,
}))

const mockBedrock = mock(() => 'bedrock-model-instance')
mock.module('@ai-sdk/amazon-bedrock', () => ({
  createAmazonBedrock: mock(() => mockBedrock),
}))

describe('BedrockFillingAgent', () => {
  beforeEach(() => {
    mockGenerateText.mockClear()
    mockBedrock.mockClear()
  })

  it('calls LLM with system prompt on first turn', async () => {
    const agent = new BedrockFillingAgent()
    const context: FillingContext = {
      groups: testDataSpec.groups,
      collectedFields: {},
      messages: [],
    }

    // Mock LLM response asking for first field
    mockGenerateText.mockResolvedValueOnce({
      text: "Hello! Let's start with your Full Name. What is your full legal name?",
      toolCalls: [],
    })

    await agent.advance(context, null)

    expect(mockGenerateText).toHaveBeenCalledTimes(1)
    const call = mockGenerateText.mock.calls[0][0]

    // Should use bedrock model
    expect(call.model).toBe('bedrock-model-instance')

    // Should have system prompt
    expect(call.system).toContain('conversational form-filling assistant')
    expect(call.system).toContain('collect_field')
    expect(call.system).toContain('explain_field')
    expect(call.system).toContain('skip_field')

    // Should have messages array with user message
    expect(call.messages).toHaveLength(1)
    expect(call.messages[0].role).toBe('user')

    // Should define tools
    expect(call.tools).toHaveProperty('collect_field')
    expect(call.tools).toHaveProperty('explain_field')
    expect(call.tools).toHaveProperty('skip_field')
  })

  it('includes conversation history in messages', async () => {
    const agent = new BedrockFillingAgent()
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
        {
          id: '2',
          sessionId: 'test',
          role: 'user',
          content: 'Alice Johnson',
          createdAt: '2026-04-18T00:01:00Z',
        },
      ],
    }

    mockGenerateText.mockResolvedValueOnce({
      text: 'Great! Now, what is your email address?',
      toolCalls: [
        {
          toolName: 'collect_field',
          args: { fieldName: 'fullName', value: 'Alice Johnson' },
        },
      ],
    })

    await agent.advance(context, 'Alice Johnson')

    expect(mockGenerateText).toHaveBeenCalledTimes(1)
    const call = mockGenerateText.mock.calls[0][0]

    // Should include previous messages plus new user response
    expect(call.messages.length).toBeGreaterThanOrEqual(3)
    expect(
      call.messages.some(
        (m: { role: string; content: string }) => m.role === 'assistant',
      ),
    ).toBe(true)
    expect(
      call.messages.some(
        (m: { role: string; content: string }) => m.role === 'user',
      ),
    ).toBe(true)

    // Bedrock requires first message to be user role
    expect(call.messages[0].role).toBe('user')
  })

  it('prepends synthetic user message when history starts with assistant', async () => {
    const agent = new BedrockFillingAgent()
    const context: FillingContext = {
      groups: testDataSpec.groups,
      collectedFields: {},
      messages: [
        {
          id: '1',
          sessionId: 'test',
          role: 'assistant',
          content: 'Welcome! What is your name?',
          toolCalls: [],
          createdAt: '2026-04-18T00:00:00Z',
        },
      ],
    }

    mockGenerateText.mockResolvedValueOnce({
      text: 'Got it, thanks!',
      toolCalls: [],
    })

    await agent.advance(context, 'Alice')

    const call = mockGenerateText.mock.calls[0][0]
    // First message must be user role for Bedrock
    expect(call.messages[0].role).toBe('user')
    // Should still include the assistant message from history
    expect(
      call.messages.some(
        (m: { role: string; content: string }) =>
          m.role === 'assistant' && m.content === 'Welcome! What is your name?',
      ),
    ).toBe(true)
    // Should include the current user response
    expect(call.messages[call.messages.length - 1].role).toBe('user')
    expect(call.messages[call.messages.length - 1].content).toBe('Alice')
  })

  it('parses tool calls from LLM response', async () => {
    const agent = new BedrockFillingAgent()
    const context: FillingContext = {
      groups: testDataSpec.groups,
      collectedFields: {},
      messages: [],
    }

    mockGenerateText.mockResolvedValueOnce({
      text: 'Great! Now what is your email address?',
      toolCalls: [
        {
          toolName: 'collect_field',
          args: { fieldName: 'fullName', value: 'Alice Johnson' },
        },
      ],
    })

    const turn = await agent.advance(context, 'Alice Johnson')

    expect(turn.toolCalls).toHaveLength(1)
    expect(turn.toolCalls[0].tool).toBe('collect_field')
    expect(turn.toolCalls[0].input.fieldName).toBe('fullName')
    expect(turn.toolCalls[0].input.value).toBe('Alice Johnson')
  })

  it('collects field values from tool calls', async () => {
    const agent = new BedrockFillingAgent()
    const context: FillingContext = {
      groups: testDataSpec.groups,
      collectedFields: {},
      messages: [],
    }

    mockGenerateText.mockResolvedValueOnce({
      text: 'Thank you! What is your email?',
      toolCalls: [
        {
          toolName: 'collect_field',
          args: { fieldName: 'fullName', value: 'Alice Johnson' },
        },
      ],
    })

    const turn = await agent.advance(context, 'Alice Johnson')

    expect(turn.fieldsCollected).toHaveProperty('fullName')
    expect(turn.fieldsCollected.fullName.value).toBe('Alice Johnson')
  })

  it('returns finished when no required fields remain', async () => {
    const agent = new BedrockFillingAgent()
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

    mockGenerateText.mockResolvedValueOnce({
      text: 'Thank you! Your form is complete.',
      toolCalls: [
        {
          toolName: 'collect_field',
          args: { fieldName: 'agreeTerms', value: 'true' },
        },
      ],
    })

    const turn = await agent.advance(context, 'yes')

    expect(turn.fieldsCollected).toHaveProperty('agreeTerms')
    expect(turn.finished).toBe(true)
  })

  it('handles explain_field tool calls', async () => {
    const agent = new BedrockFillingAgent()
    const context: FillingContext = {
      groups: testDataSpec.groups,
      collectedFields: {
        fullName: { value: 'Alice Johnson' },
      },
      messages: [],
    }

    mockGenerateText.mockResolvedValueOnce({
      text: 'Your email is used to contact you about your application status.',
      toolCalls: [
        {
          toolName: 'explain_field',
          args: { fieldName: 'email' },
        },
      ],
    })

    const turn = await agent.advance(context, 'Why do you need my email?')

    expect(turn.toolCalls).toHaveLength(1)
    expect(turn.toolCalls[0].tool).toBe('explain_field')
    expect(turn.toolCalls[0].input.fieldName).toBe('email')
    expect(turn.finished).toBe(false)
  })

  it('handles skip_field tool calls', async () => {
    const agent = new BedrockFillingAgent()
    const context: FillingContext = {
      groups: testDataSpec.groups,
      collectedFields: {
        fullName: { value: 'Alice Johnson' },
        email: { value: 'alice@example.com' },
      },
      messages: [],
    }

    mockGenerateText.mockResolvedValueOnce({
      text: 'No problem, we can skip the phone number. Moving on...',
      toolCalls: [
        {
          toolName: 'skip_field',
          args: { fieldName: 'phone', reason: 'User declined to provide' },
        },
      ],
    })

    const turn = await agent.advance(context, "I'd rather not provide that")

    expect(turn.toolCalls).toHaveLength(1)
    expect(turn.toolCalls[0].tool).toBe('skip_field')
    expect(turn.toolCalls[0].input.fieldName).toBe('phone')
    expect(turn.finished).toBe(false)
  })

  it('handles multiple tool calls in one response', async () => {
    const agent = new BedrockFillingAgent()
    const context: FillingContext = {
      groups: testDataSpec.groups,
      collectedFields: {},
      messages: [],
    }

    mockGenerateText.mockResolvedValueOnce({
      text: 'Got it! Now what is your email?',
      toolCalls: [
        {
          toolName: 'collect_field',
          args: { fieldName: 'fullName', value: 'Alice Johnson' },
        },
        {
          toolName: 'collect_field',
          args: { fieldName: 'email', value: 'alice@example.com' },
        },
      ],
    })

    const turn = await agent.advance(
      context,
      'Alice Johnson, alice@example.com',
    )

    expect(turn.toolCalls).toHaveLength(2)
    expect(turn.fieldsCollected).toHaveProperty('fullName')
    expect(turn.fieldsCollected).toHaveProperty('email')
  })

  it('wraps LLM errors with context', async () => {
    const agent = new BedrockFillingAgent()
    const context: FillingContext = {
      groups: testDataSpec.groups,
      collectedFields: {},
      messages: [],
    }

    mockGenerateText.mockRejectedValueOnce(
      new Error('AccessDeniedException: User is not authorized'),
    )

    await expect(agent.advance(context, null)).rejects.toThrow(
      'Bedrock filling agent failed: AccessDeniedException: User is not authorized',
    )
  })

  it('generates fallback message when LLM returns empty text with tool calls', async () => {
    const agent = new BedrockFillingAgent()
    const context: FillingContext = {
      groups: testDataSpec.groups,
      collectedFields: {},
      messages: [],
    }

    mockGenerateText.mockResolvedValueOnce({
      text: '',
      toolCalls: [
        {
          toolName: 'collect_field',
          args: { fieldName: 'fullName', value: 'Alice Johnson' },
        },
      ],
    })

    const turn = await agent.advance(context, 'Alice Johnson')

    expect(turn.message).toContain('fullName')
    expect(turn.fieldsCollected).toHaveProperty('fullName')
  })

  it('asks for next required field when LLM returns empty response', async () => {
    const agent = new BedrockFillingAgent()
    const context: FillingContext = {
      groups: testDataSpec.groups,
      collectedFields: {
        fullName: { value: 'Dan' },
      },
      messages: [],
    }

    mockGenerateText.mockResolvedValueOnce({
      text: '',
      toolCalls: [],
    })

    const turn = await agent.advance(context, 'yes, what else do you need?')

    expect(turn.message).toContain('Could you provide your')
    expect(turn.finished).toBe(false)
  })
})
