class FlexLanguageSelectorElement extends HTMLElement {
  private button: HTMLButtonElement | null = null
  private menu: HTMLElement | null = null

  connectedCallback() {
    // Two-language variant needs no JS
    if (this.dataset.variant === 'two') return

    this.button = this.querySelector('.flex-language-selector__button')
    this.menu = this.querySelector('.flex-language-selector__menu')

    if (this.button) {
      this.button.addEventListener('click', this.handleButtonClick)
    }
    document.addEventListener('click', this.handleOutsideClick)
    document.addEventListener('keydown', this.handleKeydown)
  }

  disconnectedCallback() {
    this.button?.removeEventListener('click', this.handleButtonClick)
    document.removeEventListener('click', this.handleOutsideClick)
    document.removeEventListener('keydown', this.handleKeydown)
  }

  private handleButtonClick = () => {
    if (!this.button || !this.menu) return

    const expanded = this.button.getAttribute('aria-expanded') === 'true'

    if (expanded) {
      this.close()
    } else {
      this.open()
    }
  }

  private handleOutsideClick = (event: MouseEvent) => {
    if (!this.contains(event.target as Node)) {
      this.close()
    }
  }

  private handleKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      const wasOpen = this.button?.getAttribute('aria-expanded') === 'true'
      this.close()
      if (wasOpen) {
        this.button?.focus()
      }
    }
  }

  private open() {
    if (!this.button || !this.menu) return
    this.button.setAttribute('aria-expanded', 'true')
    this.menu.removeAttribute('hidden')
  }

  private close() {
    if (!this.button || !this.menu) return
    this.button.setAttribute('aria-expanded', 'false')
    this.menu.setAttribute('hidden', '')
  }
}

if (!customElements.get('flex-language-selector')) {
  customElements.define('flex-language-selector', FlexLanguageSelectorElement)
}
