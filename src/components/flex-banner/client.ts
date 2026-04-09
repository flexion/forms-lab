class FlexBannerElement extends HTMLElement {
  connectedCallback() {
    this.addEventListener('click', this.handleClick.bind(this))
  }

  disconnectedCallback() {
    this.removeEventListener('click', this.handleClick.bind(this))
  }

  private handleClick(event: Event) {
    const button = (event.target as Element).closest('.flex-banner__button')
    if (!button || !(button instanceof HTMLButtonElement)) return
    this.toggle(button)
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
      button.setAttribute('aria-expanded', 'true')
      content.removeAttribute('hidden')
    }
  }
}

if (!customElements.get('flex-banner')) {
  customElements.define('flex-banner', FlexBannerElement)
}
