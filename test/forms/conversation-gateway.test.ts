import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { ConversationMessage } from '../../src/services/forms'
import { SqliteConversationGateway } from '../../src/services/forms'

describe('SqliteConversationGateway', () => {
  let dbPath: string
  let tmpDir: string
  let gateway: SqliteConversationGateway

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'conversation-test-'))
    dbPath = join(tmpDir, 'test.db')
    gateway = new SqliteConversationGateway(dbPath)
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  test('appendMessage stores message with all fields', () => {
    const message: ConversationMessage = {
      id: 'msg-1',
      sessionId: 'session-1',
      role: 'user',
      content: 'Hello, I need to fill out this form.',
      createdAt: '2026-04-18T10:00:00.000Z',
    }

    gateway.appendMessage('session-1', message)

    const messages = gateway.getMessages('session-1')
    expect(messages).toHaveLength(1)
    expect(messages[0]).toEqual(message)
  })

  test('appendMessage stores message with toolCalls', () => {
    const message: ConversationMessage = {
      id: 'msg-2',
      sessionId: 'session-1',
      role: 'assistant',
      content: 'I will collect your name.',
      toolCalls: [
        {
          tool: 'collect_field',
          input: { fieldId: 'name', value: 'John Doe' },
        },
      ],
      createdAt: '2026-04-18T10:01:00.000Z',
    }

    gateway.appendMessage('session-1', message)

    const messages = gateway.getMessages('session-1')
    expect(messages).toHaveLength(1)
    expect(messages[0]).toEqual(message)
    expect(messages[0].toolCalls).toHaveLength(1)
    expect(messages[0].toolCalls?.[0].tool).toBe('collect_field')
  })

  test('getMessages returns messages in order', () => {
    const message1: ConversationMessage = {
      id: 'msg-1',
      sessionId: 'session-1',
      role: 'user',
      content: 'First message',
      createdAt: '2026-04-18T10:00:00.000Z',
    }

    const message2: ConversationMessage = {
      id: 'msg-2',
      sessionId: 'session-1',
      role: 'assistant',
      content: 'Second message',
      createdAt: '2026-04-18T10:01:00.000Z',
    }

    const message3: ConversationMessage = {
      id: 'msg-3',
      sessionId: 'session-1',
      role: 'user',
      content: 'Third message',
      createdAt: '2026-04-18T10:02:00.000Z',
    }

    gateway.appendMessage('session-1', message1)
    gateway.appendMessage('session-1', message2)
    gateway.appendMessage('session-1', message3)

    const messages = gateway.getMessages('session-1')
    expect(messages).toHaveLength(3)
    expect(messages[0].content).toBe('First message')
    expect(messages[1].content).toBe('Second message')
    expect(messages[2].content).toBe('Third message')
  })

  test('getMessages returns empty array for unknown session', () => {
    const messages = gateway.getMessages('unknown-session')
    expect(messages).toEqual([])
  })

  test('getMessages isolates sessions', () => {
    const message1: ConversationMessage = {
      id: 'msg-1',
      sessionId: 'session-1',
      role: 'user',
      content: 'Session 1 message',
      createdAt: '2026-04-18T10:00:00.000Z',
    }

    const message2: ConversationMessage = {
      id: 'msg-2',
      sessionId: 'session-2',
      role: 'user',
      content: 'Session 2 message',
      createdAt: '2026-04-18T10:01:00.000Z',
    }

    gateway.appendMessage('session-1', message1)
    gateway.appendMessage('session-2', message2)

    const session1Messages = gateway.getMessages('session-1')
    const session2Messages = gateway.getMessages('session-2')

    expect(session1Messages).toHaveLength(1)
    expect(session1Messages[0].content).toBe('Session 1 message')

    expect(session2Messages).toHaveLength(1)
    expect(session2Messages[0].content).toBe('Session 2 message')
  })

  test('clear removes all messages for session', () => {
    const message1: ConversationMessage = {
      id: 'msg-1',
      sessionId: 'session-1',
      role: 'user',
      content: 'Message 1',
      createdAt: '2026-04-18T10:00:00.000Z',
    }

    const message2: ConversationMessage = {
      id: 'msg-2',
      sessionId: 'session-1',
      role: 'assistant',
      content: 'Message 2',
      createdAt: '2026-04-18T10:01:00.000Z',
    }

    gateway.appendMessage('session-1', message1)
    gateway.appendMessage('session-1', message2)

    expect(gateway.getMessages('session-1')).toHaveLength(2)

    gateway.clear('session-1')

    expect(gateway.getMessages('session-1')).toEqual([])
  })

  test('clear only removes messages for specified session', () => {
    const message1: ConversationMessage = {
      id: 'msg-1',
      sessionId: 'session-1',
      role: 'user',
      content: 'Session 1 message',
      createdAt: '2026-04-18T10:00:00.000Z',
    }

    const message2: ConversationMessage = {
      id: 'msg-2',
      sessionId: 'session-2',
      role: 'user',
      content: 'Session 2 message',
      createdAt: '2026-04-18T10:01:00.000Z',
    }

    gateway.appendMessage('session-1', message1)
    gateway.appendMessage('session-2', message2)

    gateway.clear('session-1')

    expect(gateway.getMessages('session-1')).toEqual([])
    expect(gateway.getMessages('session-2')).toHaveLength(1)
  })

  test('appendMessage stores message without toolCalls', () => {
    const message: ConversationMessage = {
      id: 'msg-1',
      sessionId: 'session-1',
      role: 'user',
      content: 'Hello',
      createdAt: '2026-04-18T10:00:00.000Z',
    }

    gateway.appendMessage('session-1', message)

    const messages = gateway.getMessages('session-1')
    expect(messages).toHaveLength(1)
    expect(messages[0].toolCalls).toBeUndefined()
  })
})
