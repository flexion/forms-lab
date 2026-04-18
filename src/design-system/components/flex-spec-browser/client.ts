class FlexSpecBrowserElement extends HTMLElement {
  private observer: IntersectionObserver | null = null
  private links = new Map<string, HTMLAnchorElement>()
  private panels: HTMLElement[] = []
  private visiblePanels = new Set<string>()

  connectedCallback() {
    // Defer one frame so the DOM (especially <details> content sizing) settles.
    requestAnimationFrame(() => this.init())
  }

  disconnectedCallback() {
    this.observer?.disconnect()
    this.observer = null
  }

  private init() {
    this.panels = Array.from(
      this.querySelectorAll<HTMLElement>('[data-spec-panel]'),
    )
    if (this.panels.length === 0) return

    // Build a lookup from panel id -> its nav link in the sidebar.
    const linkNodes = this.querySelectorAll<HTMLAnchorElement>(
      '.flex-spec-browser__nav-link[data-spec-nav-link]',
    )
    this.links.clear()
    for (const a of Array.from(linkNodes)) {
      const id = a.getAttribute('href')?.slice(1)
      if (id) this.links.set(id, a)
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio > 0.15) {
            this.visiblePanels.add(entry.target.id)
          } else {
            this.visiblePanels.delete(entry.target.id)
          }
        }
        // Find topmost visible panel by DOM order
        const orderedIds = this.panels.map((p) => p.id)
        let activeId: string | null = null
        for (const id of orderedIds) {
          if (this.visiblePanels.has(id)) {
            activeId = id
            break
          }
        }
        // Update all links — only the topmost visible panel is highlighted
        for (const [id, link] of this.links) {
          const isActive = id === activeId
          link.classList.toggle(
            'flex-spec-browser__nav-link--current',
            isActive,
          )
          if (isActive) link.setAttribute('aria-current', 'true')
          else link.removeAttribute('aria-current')
        }
      },
      {
        rootMargin: '-15% 0px -60% 0px',
        threshold: [0, 0.15, 0.5, 1],
      },
    )

    for (const panel of this.panels) {
      this.observer.observe(panel)
    }

    // Nav and intra-body anchor clicks: ensure target panel is open so the
    // scroll lands on visible content, then smooth-scroll to it.
    for (const a of Array.from(
      this.querySelectorAll<HTMLAnchorElement>('a[data-spec-nav-link]'),
    )) {
      a.addEventListener('click', this.handleLinkClick)
    }
  }

  private handleLinkClick = (event: MouseEvent) => {
    const link = event.currentTarget as HTMLAnchorElement
    const targetId = link.getAttribute('href')?.slice(1)
    if (!targetId) return
    const target = document.getElementById(targetId)
    if (!target) return
    event.preventDefault()
    if (target instanceof HTMLDetailsElement && !target.open) {
      target.open = true
    }
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    history.pushState(null, '', `#${targetId}`)
  }
}

if (!customElements.get('flex-spec-browser')) {
  customElements.define('flex-spec-browser', FlexSpecBrowserElement)
}
