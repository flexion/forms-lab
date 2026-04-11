class FlexCharacterCountElement extends HTMLElement {
  private input: HTMLInputElement | HTMLTextAreaElement | null = null
  private message: HTMLElement | null = null
  private maxLength = 0

  connectedCallback() {
    this.input = this.querySelector('input, textarea')
    this.message = this.querySelector('.flex-character-count__message')
    this.maxLength = Number(this.dataset.maxlength) || 0

    if (this.input && this.maxLength > 0) {
      this.updateMessage()
      this.input.addEventListener('input', this.handleInput)
    }
  }

  disconnectedCallback() {
    this.input?.removeEventListener('input', this.handleInput)
  }

  private handleInput = () => {
    this.updateMessage()
  }

  private updateMessage() {
    if (!this.input || !this.message) return

    const currentLength = this.input.value.length
    const remaining = this.maxLength - currentLength

    if (remaining < 0) {
      const over = Math.abs(remaining)
      this.message.textContent = `${over} character${over !== 1 ? 's' : ''} over limit`
      this.message.dataset.state = 'error'
    } else if (currentLength === 0) {
      this.message.textContent = `${this.maxLength} characters allowed`
      delete this.message.dataset.state
    } else {
      this.message.textContent = `${remaining} character${remaining !== 1 ? 's' : ''} left`
      delete this.message.dataset.state
    }
  }
}

if (!customElements.get('flex-character-count')) {
  customElements.define('flex-character-count', FlexCharacterCountElement)
}
