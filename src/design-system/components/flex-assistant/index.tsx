/** @jsxImportSource hono/jsx */
import type { FC } from 'hono/jsx'

interface AssistantProps {
  sessionId: string
}

export const Assistant: FC<AssistantProps> = ({ sessionId }) => {
  return <flex-assistant data-session-id={sessionId} />
}
