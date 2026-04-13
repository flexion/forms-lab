const DESKTOP_BREAKPOINT = '(min-width: 64em)'

class FlexHeaderElement extends HTMLElement {
  private menuBtn: HTMLButtonElement | null = null
  private closeBtn: HTMLButtonElement | null = null
  private nav: HTMLElement | null = null
  private overlay: HTMLElement | null = null
  private mediaQuery: MediaQueryList | null = null
  private userTrigger: HTMLButtonElement | null = null
  private userPanel: HTMLElement | null = null
  private userMenuRoot: HTMLElement | null = null

  connectedCallback() {
    this.menuBtn = this.querySelector('.flex-header__menu-btn')
    this.closeBtn = this.querySelector('.flex-header__close-btn')
    this.nav = this.querySelector('.flex-header__nav')

    if (this.menuBtn) {
      this.menuBtn.addEventListener('click', this.handleMenuClick)
    }
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', this.handleCloseClick)
    }
    document.addEventListener('keydown', this.handleKeydown)

    this.mediaQuery = window.matchMedia(DESKTOP_BREAKPOINT)
    this.mediaQuery.addEventListener('change', this.handleBreakpointChange)

    this.userMenuRoot = this.querySelector('[data-header-user-menu]')
    if (this.userMenuRoot) {
      this.userTrigger = this.userMenuRoot.querySelector(
        '.flex-header__user-trigger',
      )
      this.userPanel = this.userMenuRoot.querySelector(
        '.flex-header__user-panel',
      )
      this.userTrigger?.addEventListener('click', this.handleUserTriggerClick)
      document.addEventListener('click', this.handleUserOutsideClick, true)
      document.addEventListener('keydown', this.handleUserKeydown)
    }
  }

  disconnectedCallback() {
    this.menuBtn?.removeEventListener('click', this.handleMenuClick)
    this.closeBtn?.removeEventListener('click', this.handleCloseClick)
    document.removeEventListener('keydown', this.handleKeydown)
    this.mediaQuery?.removeEventListener('change', this.handleBreakpointChange)
    this.userTrigger?.removeEventListener(
      'click',
      this.handleUserTriggerClick,
    )
    document.removeEventListener('click', this.handleUserOutsideClick, true)
    document.removeEventListener('keydown', this.handleUserKeydown)
    this.removeOverlay()
  }

  private get isOpen(): boolean {
    return this.menuBtn?.getAttribute('aria-expanded') === 'true'
  }

  private handleMenuClick = () => {
    this.open()
  }

  private handleCloseClick = () => {
    this.close()
    this.menuBtn?.focus()
  }

  private handleKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && this.isOpen) {
      event.preventDefault()
      this.close()
      this.menuBtn?.focus()
    }
  }

  private handleOverlayClick = () => {
    this.close()
    this.menuBtn?.focus()
  }

  private handleBreakpointChange = (event: MediaQueryListEvent) => {
    if (event.matches && this.isOpen) {
      // Crossed to desktop — reset mobile nav state
      this.close()
    }
    if (!event.matches && this.isUserMenuOpen) {
      // Crossed to mobile — the user-menu becomes inline; reset disclosure state
      this.closeUserMenu()
    }
  }

  private get isUserMenuOpen(): boolean {
    return this.userTrigger?.getAttribute('aria-expanded') === 'true'
  }

  private handleUserTriggerClick = (event: MouseEvent) => {
    event.stopPropagation()
    if (this.isUserMenuOpen) {
      this.closeUserMenu()
    } else {
      this.openUserMenu()
    }
  }

  private handleUserOutsideClick = (event: MouseEvent) => {
    if (!this.isUserMenuOpen) return
    if (!this.userMenuRoot) return
    const target = event.target as Node
    if (this.userMenuRoot.contains(target)) return
    this.closeUserMenu()
  }

  private handleUserKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && this.isUserMenuOpen) {
      event.preventDefault()
      this.closeUserMenu()
      this.userTrigger?.focus()
    }
  }

  private openUserMenu() {
    if (!this.userTrigger || !this.userPanel) return
    this.userTrigger.setAttribute('aria-expanded', 'true')
    this.userPanel.removeAttribute('hidden')
    // Move focus to the first focusable element inside the panel
    const focusable = this.userPanel.querySelector<HTMLElement>(
      'button, [href], input, [tabindex]:not([tabindex="-1"])',
    )
    focusable?.focus()
  }

  private closeUserMenu() {
    if (!this.userTrigger || !this.userPanel) return
    this.userTrigger.setAttribute('aria-expanded', 'false')
    this.userPanel.setAttribute('hidden', '')
  }

  private open() {
    if (!this.menuBtn || !this.nav) return
    this.menuBtn.setAttribute('aria-expanded', 'true')
    this.nav.classList.add('is-visible')
    document.body.style.overflow = 'hidden'
    this.addOverlay()

    // Focus the close button
    this.closeBtn?.focus()
  }

  private close() {
    if (!this.menuBtn || !this.nav) return
    this.menuBtn.setAttribute('aria-expanded', 'false')
    this.nav.classList.remove('is-visible')
    document.body.style.overflow = ''
    this.removeOverlay()
  }

  private addOverlay() {
    if (this.overlay) return
    this.overlay = document.createElement('div')
    this.overlay.classList.add('flex-header__overlay')
    this.overlay.addEventListener('click', this.handleOverlayClick)
    document.body.appendChild(this.overlay)
  }

  private removeOverlay() {
    if (!this.overlay) return
    this.overlay.removeEventListener('click', this.handleOverlayClick)
    this.overlay.remove()
    this.overlay = null
  }
}

if (!customElements.get('flex-header')) {
  customElements.define('flex-header', FlexHeaderElement)
}

// --- Theme toggle ---

function initThemeToggle() {
  const toggle = document.querySelector('[data-theme-toggle]')
  if (!toggle) return

  const inputs = toggle.querySelectorAll<HTMLInputElement>(
    '.flex-theme-toggle__input',
  )
  const stored = localStorage.getItem('theme')
  const current = stored === 'light' || stored === 'dark' ? stored : 'auto'

  // Sync radio to current state
  for (const input of inputs) {
    input.checked = input.value === current
  }

  // Listen for changes
  for (const input of inputs) {
    input.addEventListener('change', () => {
      const value = input.value as 'light' | 'dark' | 'auto'
      document.documentElement.setAttribute('data-theme', value)
      localStorage.setItem('theme', value)
    })
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initThemeToggle)
} else {
  initThemeToggle()
}
