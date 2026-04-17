class FlexAssistant extends HTMLElement {
  private messages: Array<{
    role: 'user' | 'assistant' | 'system'
    html: string
  }> = []
  private isOpen = true

  connectedCallback() {
    this.render()
  }

  addMessage(role: 'user' | 'assistant' | 'system', html: string) {
    this.messages.push({ role, html })
    this.renderMessages()
    this.scrollToBottom()
  }

  clearMessages() {
    this.messages = []
    this.renderMessages()
  }

  toggle() {
    this.isOpen = !this.isOpen
    this.render()
    this.dispatchEvent(
      new CustomEvent('assistant:toggled', {
        detail: { open: this.isOpen },
        bubbles: true,
        composed: true,
      }),
    )
  }

  get open() {
    return this.isOpen
  }

  private render() {
    if (!this.isOpen) {
      this.innerHTML = ''
      this.setAttribute('data-closed', '')
      return
    }
    this.removeAttribute('data-closed')
    this.innerHTML = `
      <div class="assistant">
        <div class="assistant__header">
          <span class="assistant__title">AI Assistant</span>
          <button type="button" class="assistant__close" aria-label="Close assistant">&times;</button>
        </div>
        <div class="assistant__messages"></div>
        <form class="assistant__input">
          <textarea
            class="flex-textarea assistant__textarea"
            rows="2"
            placeholder="Describe changes..."
            name="intent"
          ></textarea>
          <button type="submit" class="flex-button assistant__send">Send</button>
        </form>
      </div>
    `
    this.bindHandlers()
    this.renderMessages()
    this.scrollToBottom()
  }

  private renderMessages() {
    const container = this.querySelector('.assistant__messages')
    if (!container) return
    container.innerHTML = this.messages
      .map(
        (m) =>
          `<div class="assistant__message assistant__message--${m.role}">${m.html}</div>`,
      )
      .join('')
  }

  private scrollToBottom() {
    const container = this.querySelector('.assistant__messages')
    if (container) {
      container.scrollTop = container.scrollHeight
    }
  }

  private bindHandlers() {
    this.querySelector('.assistant__close')?.addEventListener('click', () => {
      this.toggle()
    })

    const form = this.querySelector<HTMLFormElement>('.assistant__input')
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault()
        const textarea = form.querySelector<HTMLTextAreaElement>('textarea')
        const text = textarea?.value?.trim()
        if (!text) return
        this.dispatchEvent(
          new CustomEvent('assistant:message-submitted', {
            detail: { text },
            bubbles: true,
            composed: true,
          }),
        )
        if (textarea) textarea.value = ''
      })
    }
  }
}

if (!customElements.get('flex-assistant')) {
  customElements.define('flex-assistant', FlexAssistant)
}
