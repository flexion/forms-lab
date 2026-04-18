class FlexBranchSwitcherElement extends HTMLElement {
  private trigger: HTMLButtonElement | null = null
  private panel: HTMLElement | null = null
  private filter: HTMLInputElement | null = null

  connectedCallback() {
    this.trigger = this.querySelector('.flex-branch-switcher__trigger')
    this.panel = this.querySelector('.flex-branch-switcher__panel')
    this.filter = this.querySelector('.flex-branch-switcher__filter')
    if (!this.trigger || !this.panel) return

    this.trigger.addEventListener('click', this.handleTriggerClick)
    document.addEventListener('click', this.handleOutsideClick)
    this.filter?.addEventListener('input', this.handleFilterInput)
  }

  disconnectedCallback() {
    this.trigger?.removeEventListener('click', this.handleTriggerClick)
    document.removeEventListener('click', this.handleOutsideClick)
    this.filter?.removeEventListener('input', this.handleFilterInput)
  }

  private handleTriggerClick = () => {
    if (!this.trigger || !this.panel) return
    const expanded = this.trigger.getAttribute('aria-expanded') === 'true'
    this.trigger.setAttribute('aria-expanded', String(!expanded))
    this.panel.hidden = expanded
  }

  private handleOutsideClick = (event: MouseEvent) => {
    if (!this.trigger || !this.panel) return
    if (!this.contains(event.target as Node)) {
      this.trigger.setAttribute('aria-expanded', 'false')
      this.panel.hidden = true
    }
  }

  private handleFilterInput = () => {
    if (!this.filter) return
    const query = this.filter.value.toLowerCase()
    const items = this.querySelectorAll<HTMLLIElement>(
      '.flex-branch-switcher__list li',
    )
    for (const li of items) {
      const text = li.textContent?.toLowerCase() ?? ''
      li.hidden = !text.includes(query)
    }
  }
}

if (!customElements.get('flex-branch-switcher')) {
  customElements.define('flex-branch-switcher', FlexBranchSwitcherElement)
}
