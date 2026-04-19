import type { FC } from 'hono/jsx'
import { ChatPanel } from './index'

const inProgressMessages = [
  {
    id: 'm1',
    role: 'assistant' as const,
    content: 'What is your full legal name?',
    createdAt: '2026-04-19T12:00:00Z',
  },
  {
    id: 'm2',
    role: 'user' as const,
    content: 'Jamie Rivera',
    createdAt: '2026-04-19T12:00:05Z',
  },
  {
    id: 'm3',
    role: 'assistant' as const,
    content: 'Thanks, Jamie. What address should we use for correspondence?',
    createdAt: '2026-04-19T12:00:10Z',
  },
]

export const InProgress: FC = () => (
  <ChatPanel
    sessionId="example-session-in-progress"
    messages={inProgressMessages}
    finished={false}
  />
)

export const Finished: FC = () => (
  <ChatPanel
    sessionId="example-session-finished"
    messages={[
      ...inProgressMessages,
      {
        id: 'm4',
        role: 'user' as const,
        content: '123 Main St, Springfield, IL 62701',
        createdAt: '2026-04-19T12:00:20Z',
      },
      {
        id: 'm5',
        role: 'assistant' as const,
        content:
          'Thanks. That was the last question — your responses are recorded.',
        createdAt: '2026-04-19T12:00:25Z',
      },
    ]}
    finished={true}
  />
)

export const EmptyStart: FC = () => (
  <ChatPanel sessionId="example-session-empty" messages={[]} finished={false} />
)
