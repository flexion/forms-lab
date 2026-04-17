class FlexSpecBrowserElement extends HTMLElement {
  private observer: IntersectionObserver | null = null
  private links = new Map<string, HTMLAnchorElement>()

  connectedCallback() {
    // Defer one frame so the DOM (especially <details> content sizing) settles.
    requestAnimationFrame(() => this.init())
  }

  disconnectedCallback() {
    this.observer?.disconnect()
    this.observer = null
  }

  private init() {
    const panels = Array.from(
      this.querySelectorAll<HTMLElement>('[data-spec-panel]'),
    )
    if (panels.length === 0) return

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
          const link = this.links.get((entry.target as HTMLElement).id)
          if (!link) continue
          const active = entry.isIntersecting && entry.intersectionRatio > 0.15
          link.classList.toggle('flex-spec-browser__nav-link--current', active)
          if (active) {
            link.setAttribute('aria-current', 'true')
          } else {
            link.removeAttribute('aria-current')
          }
        }
      },
      {
        rootMargin: '-15% 0px -60% 0px',
        threshold: [0, 0.15, 0.5, 1],
      },
    )

    for (const panel of panels) {
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
