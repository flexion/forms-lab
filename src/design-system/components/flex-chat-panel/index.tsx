import type { FC } from 'hono/jsx'

interface ConversationMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

interface ChatPanelProps {
  sessionId: string
  messages: ConversationMessage[]
  finished: boolean
}

export const ChatPanel: FC<ChatPanelProps> = ({
  sessionId,
  messages,
  finished,
}) => {
  return (
    <div class="flex-chat-panel" data-session-id={sessionId}>
      <div class="flex-chat-panel__messages">
        {messages.map((message) => (
          <div
            key={message.id}
            class="flex-chat-panel__message"
            data-role={message.role}
          >
            <div class="flex-chat-panel__message-content">{message.content}</div>
          </div>
        ))}
      </div>

      {!finished && (
        <form
          class="flex-chat-panel__form"
          data-role="chat-form"
          method="post"
        >
          <div class="flex-chat-panel__input-group">
            <textarea
              class="flex-textarea"
              name="message"
              placeholder="Type your response..."
              rows={3}
              required
              data-role="chat-input"
            />
          </div>
          <div class="flex-chat-panel__actions">
            <button class="flex-button" type="submit">
              Send
            </button>
          </div>
        </form>
      )}

      {finished && (
        <div class="flex-chat-panel__finished">
          <p>Conversation complete</p>
        </div>
      )}
    </div>
  )
}
