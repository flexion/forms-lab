const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

class FlexModalElement extends HTMLElement {
  private triggerElement: HTMLElement | null = null

  connectedCallback() {
    document.addEventListener('click', this.handleTriggerClick)
    document.addEventListener('keydown', this.handleKeydown)
    this.addEventListener('click', this.handleInternalClick)
  }

  disconnectedCallback() {
    document.removeEventListener('click', this.handleTriggerClick)
    document.removeEventListener('keydown', this.handleKeydown)
    this.removeEventListener('click', this.handleInternalClick)
  }

  private get contentElement(): HTMLElement | null {
    return this.querySelector('.flex-modal__content')
  }

  private get isForcedAction(): boolean {
    return this.hasAttribute('data-forced-action')
  }

  private get isOpen(): boolean {
    return !this.hasAttribute('hidden')
  }

  private get focusableElements(): HTMLElement[] {
    const content = this.contentElement
    if (!content) return []
    return Array.from(content.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
  }

  private handleTriggerClick = (event: MouseEvent) => {
    const trigger = (event.target as Element)?.closest<HTMLElement>(
      '[data-open-modal]',
    )
    if (!trigger) return
    const targetId = trigger.getAttribute('aria-controls')
    if (targetId !== this.id) return

    event.preventDefault()
    this.triggerElement = trigger
    this.open()
  }

  private handleInternalClick = (event: MouseEvent) => {
    const target = event.target as Element

    // Close button click
    if (target.closest('[data-close-modal]')) {
      this.close()
      return
    }

    // Overlay click: close if click is outside the content area (unless forced action)
    if (!this.isForcedAction && !target.closest('.flex-modal__content')) {
      this.close()
    }
  }

  private handleKeydown = (event: KeyboardEvent) => {
    if (!this.isOpen) return

    if (event.key === 'Escape' && !this.isForcedAction) {
      event.preventDefault()
      this.close()
      return
    }

    if (event.key === 'Tab') {
      this.trapFocus(event)
    }
  }

  private trapFocus(event: KeyboardEvent) {
    const focusable = this.focusableElements
    if (focusable.length === 0) return

    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    if (event.shiftKey) {
      if (document.activeElement === first) {
        event.preventDefault()
        last.focus()
      }
    } else {
      if (document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
  }

  private open() {
    this.removeAttribute('hidden')
    if (this.triggerElement) {
      this.triggerElement.setAttribute('aria-expanded', 'true')
    }
    document.body.style.overflow = 'hidden'

    // Focus first focusable element inside content
    const focusable = this.focusableElements
    if (focusable.length > 0) {
      focusable[0].focus()
    }
  }

  private close() {
    this.setAttribute('hidden', '')
    if (this.triggerElement) {
      this.triggerElement.setAttribute('aria-expanded', 'false')
      this.triggerElement.focus()
    }
    document.body.style.overflow = ''
  }
}

if (!customElements.get('flex-modal')) {
  customElements.define('flex-modal', FlexModalElement)
}
