async function init() {
  await customElements.whenDefined('flex-assistant')

  const messagesScript = document.querySelector('[data-initial-messages]')
  const assistant = document.querySelector('flex-assistant')

  if (!messagesScript || !assistant) return

  try {
    const initialMessages = JSON.parse(messagesScript.textContent || '[]')
    assistant.clearMessages()
    for (const msg of initialMessages) {
      assistant.addMessage(msg.role, msg.html)
    }
  } catch (error) {
    console.error('Error loading initial messages:', error)
  }

  document.addEventListener('assistant:message-submitted', async (e) => {
    const text = e.detail.text

    assistant.addMessage('user', text)
    assistant.setLoading(true)

    try {
      const response = await fetch(window.location.pathname, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Live-Chat': 'true',
        },
        body: new URLSearchParams({ message: text }),
      })

      assistant.setLoading(false)

      if (!response.ok) {
        const errorText = await response.text()
        assistant.addMessage(
          'system',
          `Error: ${response.status} - ${errorText}`,
        )
        return
      }

      const data = await response.json()

      assistant.addMessage('assistant', data.response)

      if (data.fieldsCollected) {
        updateFormFields(data.fieldsCollected)
      }

      if (data.finished) {
        setTimeout(() => window.location.reload(), 1500)
      }
    } catch (error) {
      assistant.setLoading(false)
      assistant.addMessage('system', `Error: ${error.message}`)
    }
  })
}

function updateFormFields(fieldsCollected) {
  for (const [fieldName, entry] of Object.entries(fieldsCollected)) {
    const value = entry.value
    const input = document.querySelector(`[name="${fieldName}"]`)
    if (!input) continue

    if (input.type === 'checkbox') {
      input.checked = value === true || value === 'true'
    } else if (input.type === 'radio') {
      const radio = document.querySelector(
        `[name="${fieldName}"][value="${value}"]`,
      )
      if (radio) radio.checked = true
    } else {
      input.value = value ?? ''
    }

    input.closest('.flex-form-group')?.classList.add('field-collected')
  }
}

init()
