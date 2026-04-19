/**
 * Conversational form client-side enhancement
 *
 * Wires up flex-assistant component for conversational form filling:
 * - Loads initial message history into assistant
 * - Handles message submission events
 * - POSTs messages to server with X-Live-Chat header
 * - Displays responses in assistant panel
 * - Reloads page when conversation is finished
 */

;(() => {
  // Load initial messages into flex-assistant
  const messagesScript = document.querySelector('[data-initial-messages]')
  const assistant = document.querySelector('flex-assistant')

  if (!messagesScript || !assistant) {
    console.error('Missing required elements for conversational form')
    return
  }

  // Parse and load initial messages
  try {
    const initialMessages = JSON.parse(messagesScript.textContent || '[]')
    assistant.clearMessages()
    for (const msg of initialMessages) {
      assistant.addMessage(msg.role, msg.html)
    }
  } catch (error) {
    console.error('Error loading initial messages:', error)
  }

  // Handle message submission
  document.addEventListener('assistant:message-submitted', async (e) => {
    const detail = e.detail
    const text = detail.text

    // Add user message to UI
    assistant.addMessage('user', text)

    // Get session ID
    const sessionId = assistant.getAttribute('data-session-id')
    if (!sessionId) {
      console.error('No session ID found')
      assistant.addMessage('system', 'Error: No session ID')
      return
    }

    // Send message to server
    try {
      const response = await fetch(window.location.pathname, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Live-Chat': 'true',
        },
        body: new URLSearchParams({ message: text }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        assistant.addMessage(
          'system',
          `Error: ${response.status} - ${errorText}`,
        )
        return
      }

      const data = await response.json()

      // Add assistant response
      assistant.addMessage('assistant', data.response)

      // If finished, reload to show completion state
      if (data.finished) {
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      }
    } catch (error) {
      console.error('Error sending message:', error)
      assistant.addMessage('system', `Error: ${error.message}`)
    }
  })
})()
