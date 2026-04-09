class FlexInPageNavElement extends HTMLElement {
  private observer: IntersectionObserver | null = null
  private headingMap = new Map<string, HTMLAnchorElement>()

  connectedCallback() {
    // Defer to allow page content to render
    requestAnimationFrame(() => this.init())
  }

  disconnectedCallback() {
    this.observer?.disconnect()
  }

  private get headingSelector(): string {
    const levels = this.dataset.headingLevels || 'h2,h3'
    return levels
  }

  private init() {
    const list = this.querySelector('.flex-in-page-nav__list')
    if (!list) return

    // Find the main content area — look for <main> or the parent's sibling content
    const headings = this.findHeadings()
    if (headings.length === 0) return

    // Build TOC
    for (const heading of headings) {
      this.ensureId(heading)
      const li = document.createElement('li')
      li.className = 'flex-in-page-nav__item'
      const link = document.createElement('a')
      link.className = 'flex-in-page-nav__link'
      link.href = `#${heading.id}`
      link.textContent = heading.textContent
      // Indent sub-headings (h3 gets a sub-item class)
      if (heading.tagName === 'H3') {
        li.classList.add('flex-in-page-nav__item--sub')
      }

      link.addEventListener('click', this.handleLinkClick)

      li.appendChild(link)
      list.appendChild(li)
      this.headingMap.set(heading.id, link)
    }

    // Set up IntersectionObserver for scroll spy
    this.setupScrollSpy(headings)
  }

  private findHeadings(): HTMLHeadingElement[] {
    // Look for headings in the main content, not inside this nav itself
    const selector = this.headingSelector
    const root = document.querySelector('main') || document.body
    const all = Array.from(root.querySelectorAll<HTMLHeadingElement>(selector))
    // Exclude headings within this element
    return all.filter((h) => !this.contains(h))
  }

  private ensureId(heading: HTMLHeadingElement) {
    if (heading.id) return
    heading.id = this.slugify(heading.textContent || '')
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
  }

  private setupScrollSpy(headings: HTMLHeadingElement[]) {
    // Use IntersectionObserver to detect which section is currently visible
    const observerOptions: IntersectionObserverInit = {
      rootMargin: '-20% 0px -60% 0px',
      threshold: 0,
    }

    this.observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          this.setActive(entry.target.id)
        }
      }
    }, observerOptions)

    for (const heading of headings) {
      this.observer.observe(heading)
    }
  }

  private setActive(id: string) {
    // Clear all current markers
    for (const link of this.headingMap.values()) {
      link.removeAttribute('aria-current')
      link.classList.remove('flex-in-page-nav__link--current')
    }
    // Set current
    const link = this.headingMap.get(id)
    if (link) {
      link.setAttribute('aria-current', 'true')
      link.classList.add('flex-in-page-nav__link--current')
    }
  }

  private handleLinkClick = (event: MouseEvent) => {
    event.preventDefault()
    const link = event.currentTarget as HTMLAnchorElement
    const targetId = link.getAttribute('href')?.slice(1)
    if (!targetId) return
    const target = document.getElementById(targetId)
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' })
      // Update URL hash without scrolling
      history.pushState(null, '', `#${targetId}`)
      this.setActive(targetId)
    }
  }
}

if (!customElements.get('flex-in-page-nav')) {
  customElements.define('flex-in-page-nav', FlexInPageNavElement)
}
