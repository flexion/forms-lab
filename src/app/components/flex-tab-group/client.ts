class FlexTabGroupElement extends HTMLElement {
  connectedCallback() {
    this.addEventListener('click', this.handleClick.bind(this))
    this.addEventListener('keydown', this.handleKeydown.bind(this))
  }

  disconnectedCallback() {
    this.removeEventListener('click', this.handleClick.bind(this))
    this.removeEventListener('keydown', this.handleKeydown.bind(this))
  }

  private get tabs(): HTMLButtonElement[] {
    const tablist = this.querySelector('[role="tablist"]')
    if (!tablist) return []
    return Array.from(tablist.querySelectorAll('[role="tab"]'))
  }

  private handleClick(event: Event) {
    const tab = (event.target as Element).closest('[role="tab"]')
    if (!tab || !(tab instanceof HTMLButtonElement)) return
    this.selectTab(tab)
  }

  private handleKeydown(event: KeyboardEvent) {
    const tab = (event.target as Element).closest('[role="tab"]')
    if (!tab || !(tab instanceof HTMLButtonElement)) return

    const tabs = this.tabs
    const index = tabs.indexOf(tab)
    if (index === -1) return

    let target: HTMLButtonElement | undefined

    switch (event.key) {
      case 'ArrowRight':
        target = tabs[(index + 1) % tabs.length]
        break
      case 'ArrowLeft':
        target = tabs[(index - 1 + tabs.length) % tabs.length]
        break
      case 'Home':
        target = tabs[0]
        break
      case 'End':
        target = tabs[tabs.length - 1]
        break
      default:
        return
    }

    if (target) {
      event.preventDefault()
      target.focus()
      this.selectTab(target)
    }
  }

  private selectTab(selected: HTMLButtonElement) {
    for (const tab of this.tabs) {
      const panelId = tab.getAttribute('aria-controls')
      const panel = panelId ? this.querySelector(`#${panelId}`) : null
      const isSelected = tab === selected

      tab.setAttribute('aria-selected', String(isSelected))
      tab.tabIndex = isSelected ? 0 : -1

      if (panel) {
        if (isSelected) {
          panel.removeAttribute('hidden')
        } else {
          panel.setAttribute('hidden', '')
        }
      }
    }
  }
}

if (!customElements.get('flex-tab-group')) {
  customElements.define('flex-tab-group', FlexTabGroupElement)
}
