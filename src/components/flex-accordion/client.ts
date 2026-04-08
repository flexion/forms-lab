class FlexAccordionElement extends HTMLElement {
  connectedCallback() {
    this.addEventListener('click', this.handleClick.bind(this))
    this.addEventListener('keydown', this.handleKeydown.bind(this))
  }

  disconnectedCallback() {
    this.removeEventListener('click', this.handleClick.bind(this))
    this.removeEventListener('keydown', this.handleKeydown.bind(this))
  }

  private get buttons(): HTMLButtonElement[] {
    return Array.from(this.querySelectorAll('.flex-accordion__button'))
  }

  private get multiselectable(): boolean {
    return this.hasAttribute('data-multiselectable')
  }

  private handleClick(event: Event) {
    const button = (event.target as Element).closest('.flex-accordion__button')
    if (!button || !(button instanceof HTMLButtonElement)) return
    this.toggle(button)
  }

  private handleKeydown(event: KeyboardEvent) {
    const button = (event.target as Element).closest('.flex-accordion__button')
    if (!button || !(button instanceof HTMLButtonElement)) return

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      this.toggle(button)
    }
  }

  private toggle(button: HTMLButtonElement) {
    const expanded = button.getAttribute('aria-expanded') === 'true'
    const contentId = button.getAttribute('aria-controls')
    if (!contentId) return

    const content = this.querySelector(`#${contentId}`)
    if (!content) return

    if (expanded) {
      button.setAttribute('aria-expanded', 'false')
      content.setAttribute('hidden', '')
    } else {
      if (!this.multiselectable) {
        for (const otherButton of this.buttons) {
          if (otherButton !== button) {
            otherButton.setAttribute('aria-expanded', 'false')
            const otherId = otherButton.getAttribute('aria-controls')
            if (otherId) {
              this.querySelector(`#${otherId}`)?.setAttribute('hidden', '')
            }
          }
        }
      }
      button.setAttribute('aria-expanded', 'true')
      content.removeAttribute('hidden')
    }
  }
}

if (!customElements.get('flex-accordion')) {
  customElements.define('flex-accordion', FlexAccordionElement)
}
