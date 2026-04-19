/**
 * Chat panel client-side enhancement
 *
 * Provides optimistic UI updates and handles live chat responses:
 * - Intercepts form submission
 * - Appends user message immediately (optimistic)
 * - POSTs to server with X-Live-Chat header
 * - Appends assistant response when received
 * - Auto-scrolls to bottom
 * - Handles finished state
 */

;(() => {
  // Find the chat panel on the page
  const panel = document.querySelector('[data-session-id]')
  if (!panel) {
    return // No chat panel on this page
  }

  const form = panel.querySelector('[data-role="chat-form"]')
  const input = panel.querySelector('[data-role="chat-input"]')
  const messagesContainer = panel.querySelector('.flex-chat-panel__messages')

  if (!form || !input || !messagesContainer) {
    console.error('Chat panel: missing required elements')
    return
  }

  /**
   * Create a message bubble element
   * @param {string} role - 'user' or 'assistant'
   * @param {string} content - message text
   * @returns {HTMLElement}
   */
  function createMessageBubble(role, content) {
    const messageDiv = document.createElement('div')
    messageDiv.className = 'flex-chat-panel__message'
    messageDiv.setAttribute('data-role', role)

    const contentDiv = document.createElement('div')
    contentDiv.className = 'flex-chat-panel__message-content'
    contentDiv.textContent = content

    messageDiv.appendChild(contentDiv)
    return messageDiv
  }

  /**
   * Scroll messages container to bottom
   */
  function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight
  }

  /**
   * Show finished state
   */
  function showFinished() {
    // Remove the form
    form.remove()

    // Add finished message
    const finishedDiv = document.createElement('div')
    finishedDiv.className = 'flex-chat-panel__finished'
    const p = document.createElement('p')
    p.textContent = 'Conversation complete'
    finishedDiv.appendChild(p)
    panel.appendChild(finishedDiv)
  }

  /**
   * Handle form submission
   * @param {Event} event
   */
  async function handleSubmit(event) {
    event.preventDefault()

    const message = input.value.trim()
    if (!message) {
      return
    }

    // Disable form during submission
    const submitButton = form.querySelector('button[type="submit"]')
    input.disabled = true
    if (submitButton) {
      submitButton.disabled = true
    }

    try {
      // Optimistically append user message
      const userBubble = createMessageBubble('user', message)
      messagesContainer.appendChild(userBubble)
      scrollToBottom()

      // Clear input
      input.value = ''

      // POST to server with X-Live-Chat header
      const formData = new FormData()
      formData.append('message', message)

      const response = await fetch(form.action || window.location.pathname, {
        method: 'POST',
        headers: {
          'X-Live-Chat': 'true',
        },
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()

      // Append assistant response
      if (data.response) {
        const assistantBubble = createMessageBubble('assistant', data.response)
        messagesContainer.appendChild(assistantBubble)
        scrollToBottom()
      }

      // Handle finished state
      if (data.finished) {
        showFinished()
        return
      }

      // Re-enable form
      input.disabled = false
      if (submitButton) {
        submitButton.disabled = false
      }
      input.focus()
    } catch (error) {
      console.error('Chat error:', error)
      // Re-enable form on error
      input.disabled = false
      if (submitButton) {
        submitButton.disabled = false
      }
      // TODO: Show error message to user
    }
  }

  // Attach submit handler
  form.addEventListener('submit', handleSubmit)

  // Initial scroll to bottom (for server-rendered messages)
  scrollToBottom()

  // Focus input on load
  input.focus()
})()
