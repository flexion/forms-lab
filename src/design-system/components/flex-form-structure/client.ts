import type {
  ProjectStateClient,
  SelectionTarget,
} from '../flex-form-editor/protocol'

type DeliveryMode = 'static' | 'conversational' | 'hybrid'

const DELIVERY_MODES: DeliveryMode[] = ['static', 'conversational', 'hybrid']

const DELIVERY_ICON: Record<DeliveryMode, string> = {
  static: 'list',
  conversational: 'chat',
  hybrid: 'autorenew',
}

const DELIVERY_LABEL: Record<DeliveryMode, string> = {
  static: 'Static',
  conversational: 'Conversational',
  hybrid: 'Hybrid',
}

const DELIVERY_DESCRIPTION: Record<DeliveryMode, string> = {
  static: 'Traditional form',
  conversational: 'Chat-driven',
  hybrid: 'Mixed',
}

class FlexFormStructure extends HTMLElement {
  private state: ProjectStateClient | null = null
  private collapsed = false
  private selectedPageId: string | null = null
  private deliveryMenuOpenFor: string | null = null
  private documentClickHandler: ((e: MouseEvent) => void) | null = null

  connectedCallback() {
    const root = this.closest('flex-form-editor')
    if (root) {
      root.addEventListener('formeditor:state-projected', (e) => {
        this.state = (e as CustomEvent).detail.state
        this.render()
      })
      root.addEventListener('formeditor:selection-changed', (e) => {
        const sel = (e as CustomEvent).detail
          .selection as SelectionTarget | null
        const next = sel?.kind === 'page' ? sel.id : null
        if (next !== this.selectedPageId) {
          this.selectedPageId = next
          this.applySelectionClass()
        }
      })
    }
    this.render()
  }

  disconnectedCallback() {
    this.removeDocumentClickHandler()
  }

  // --- Rendering (full rebuild: only on state or collapse change) ---

  private render() {
    if (!this.state) {
      this.innerHTML = ''
      return
    }
    const state = this.state

    if (this.collapsed) {
      const miniItems = state.formSpec.pages
        .map(
          (page, i) =>
            `<li><button type="button" data-page-id="${page.id}" class="form-structure__mini-item" title="${escapeHtml(page.title)}">${i + 1}</button></li>`,
        )
        .join('')
      this.innerHTML = `
        <div class="form-structure form-structure--collapsed">
          <button type="button" class="form-structure__toggle" aria-label="Expand structure panel">&#9654;</button>
          <ol class="form-structure__mini-list">${miniItems}</ol>
        </div>
      `
      this.bindCollapsedHandlers()
      return
    }

    const pageHtml = state.formSpec.pages
      .map((page, i) =>
        this.renderPageRow(page, i, state.formSpec.pages.length),
      )
      .join('')
    this.innerHTML = `
      <section class="form-structure">
        <div class="form-structure__header">
          <h2>Structure</h2>
          <button type="button" class="form-structure__toggle" aria-label="Collapse structure panel">&#9664;</button>
        </div>
        <ol class="form-structure__page-list">${pageHtml}</ol>
      </section>
    `
    this.bindExpandedHandlers()
  }

  private renderPageRow(
    page: NonNullable<ProjectStateClient['formSpec']['pages']>[number],
    i: number,
    total: number,
  ): string {
    const groupCount = page.groups.length
    const mode = (page.deliveryMode as DeliveryMode) ?? 'static'
    const canUp = i > 0
    const canDown = i < total - 1
    const isSelected = page.id === this.selectedPageId
    return `
      <li class="form-structure__page${isSelected ? ' form-structure__page--selected' : ''}" data-page-id="${page.id}">
        <button type="button" class="form-structure__row" data-action="select" data-page-id="${page.id}">
          <span class="form-structure__row-index" aria-hidden="true">${i + 1}</span>
          <span class="form-structure__row-body">
            <span class="form-structure__row-title">${escapeHtml(page.title)}</span>
            <span class="form-structure__row-meta">${groupCount} group${groupCount === 1 ? '' : 's'}</span>
          </span>
        </button>
        <span class="form-structure__actions">
          <span class="form-structure__delivery" data-delivery-for="${page.id}">
            <button type="button" class="form-structure__icon-btn" data-action="delivery-toggle" data-page-id="${page.id}" title="Delivery: ${DELIVERY_LABEL[mode]}" aria-label="Delivery mode: ${DELIVERY_LABEL[mode]}" aria-haspopup="menu" aria-expanded="false">
              <svg class="flex-icon" data-size="3" aria-hidden="true" focusable="false"><use href="/static/sprite.svg#${DELIVERY_ICON[mode]}" /></svg>
            </button>
          </span>
          <button type="button" class="form-structure__icon-btn" data-action="up" data-page-id="${page.id}" aria-label="Move up" ${canUp ? '' : 'disabled'}>
            <svg class="flex-icon" data-size="3" aria-hidden="true" focusable="false"><use href="/static/sprite.svg#arrow_upward" /></svg>
          </button>
          <button type="button" class="form-structure__icon-btn" data-action="down" data-page-id="${page.id}" aria-label="Move down" ${canDown ? '' : 'disabled'}>
            <svg class="flex-icon" data-size="3" aria-hidden="true" focusable="false"><use href="/static/sprite.svg#arrow_downward" /></svg>
          </button>
        </span>
      </li>
    `
  }

  // --- Surgical updates (no innerHTML swap) ---

  private applySelectionClass() {
    const rows = this.querySelectorAll<HTMLElement>('.form-structure__page')
    for (const row of rows) {
      const id = row.dataset.pageId
      row.classList.toggle(
        'form-structure__page--selected',
        !!id && id === this.selectedPageId,
      )
    }
  }

  private applyDeliveryMenu() {
    for (const container of this.querySelectorAll<HTMLElement>(
      '.form-structure__delivery',
    )) {
      const pageId = container.dataset.deliveryFor
      const existingMenu = container.querySelector(
        '.form-structure__delivery-menu',
      )
      const toggleBtn = container.querySelector<HTMLButtonElement>(
        '[data-action="delivery-toggle"]',
      )
      if (pageId && this.deliveryMenuOpenFor === pageId) {
        if (!existingMenu && this.state) {
          const page = this.state.formSpec.pages.find((p) => p.id === pageId)
          if (page) {
            const currentMode = (page.deliveryMode as DeliveryMode) ?? 'static'
            const menu = document.createElement('div')
            menu.className = 'form-structure__delivery-menu'
            menu.setAttribute('role', 'menu')
            menu.innerHTML = DELIVERY_MODES.map(
              (m) => `
                <button type="button" role="menuitemradio" aria-checked="${m === currentMode}" class="form-structure__delivery-option${m === currentMode ? ' form-structure__delivery-option--current' : ''}" data-action="delivery-pick" data-page-id="${pageId}" data-mode="${m}">
                  <svg class="flex-icon" data-size="3" aria-hidden="true" focusable="false"><use href="/static/sprite.svg#${DELIVERY_ICON[m]}" /></svg>
                  <span class="form-structure__delivery-label"><strong>${DELIVERY_LABEL[m]}</strong><span class="form-structure__delivery-desc">${DELIVERY_DESCRIPTION[m]}</span></span>
                </button>
              `,
            ).join('')
            container.appendChild(menu)
            this.bindDeliveryMenu(menu)
            this.positionDeliveryMenu(menu, toggleBtn)
          }
        } else if (existingMenu && toggleBtn) {
          this.positionDeliveryMenu(existingMenu as HTMLElement, toggleBtn)
        }
        toggleBtn?.setAttribute('aria-expanded', 'true')
      } else {
        existingMenu?.remove()
        toggleBtn?.setAttribute('aria-expanded', 'false')
      }
    }
    this.syncDocumentClickHandler()
  }

  // --- Handler binding ---

  private bindCollapsedHandlers() {
    const toggleBtn = this.querySelector<HTMLButtonElement>(
      '.form-structure__toggle',
    )
    toggleBtn?.addEventListener('click', () => this.toggleCollapsed())
    for (const btn of this.querySelectorAll<HTMLButtonElement>(
      '.form-structure__mini-item',
    )) {
      btn.addEventListener('click', () => {
        const pageId = btn.dataset.pageId
        if (pageId) this.dispatchSelect(pageId)
      })
    }
  }

  private bindExpandedHandlers() {
    const toggleBtn = this.querySelector<HTMLButtonElement>(
      '.form-structure__toggle',
    )
    toggleBtn?.addEventListener('click', () => this.toggleCollapsed())

    for (const btn of this.querySelectorAll<HTMLButtonElement>(
      '[data-action="select"]',
    )) {
      btn.addEventListener('click', () => {
        const pageId = btn.dataset.pageId
        if (pageId) this.dispatchSelect(pageId)
      })
    }

    for (const btn of this.querySelectorAll<HTMLButtonElement>(
      '[data-action="delivery-toggle"]',
    )) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        const pageId = btn.dataset.pageId
        if (!pageId) return
        this.deliveryMenuOpenFor =
          this.deliveryMenuOpenFor === pageId ? null : pageId
        this.applyDeliveryMenu()
      })
    }

    for (const btn of this.querySelectorAll<HTMLButtonElement>(
      '[data-action="up"], [data-action="down"]',
    )) {
      btn.addEventListener('click', () => {
        const pageId = btn.dataset.pageId
        const direction = btn.dataset.action as 'up' | 'down'
        if (!pageId || !this.state || btn.disabled) return
        const idx = this.state.formSpec.pages.findIndex((p) => p.id === pageId)
        const target = direction === 'up' ? idx - 1 : idx + 1
        if (target < 0 || target >= this.state.formSpec.pages.length) return
        const otherId = this.state.formSpec.pages[target].id
        this.dispatchEvent(
          new CustomEvent('formeditor:stage-command', {
            detail: {
              command: { kind: 'swapPages', a: pageId, b: otherId },
              explanation: `Move page ${direction}`,
            },
            bubbles: true,
            composed: true,
          }),
        )
      })
    }
  }

  private bindDeliveryMenu(menu: HTMLElement) {
    for (const btn of menu.querySelectorAll<HTMLButtonElement>(
      '[data-action="delivery-pick"]',
    )) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        const pageId = btn.dataset.pageId
        const mode = btn.dataset.mode as DeliveryMode | undefined
        if (!pageId || !mode) return
        this.deliveryMenuOpenFor = null
        this.dispatchEvent(
          new CustomEvent('formeditor:stage-command', {
            detail: {
              command: { kind: 'setDeliveryMode', pageId, mode },
              explanation: `Set delivery mode to ${mode}`,
            },
            bubbles: true,
            composed: true,
          }),
        )
        this.applyDeliveryMenu()
      })
    }
  }

  private positionDeliveryMenu(menu: HTMLElement, anchor: HTMLElement | null) {
    if (!anchor) return
    const rect = anchor.getBoundingClientRect()
    // Render invisibly to measure the menu's own size
    menu.style.visibility = 'hidden'
    menu.style.insetBlockStart = `${Math.round(rect.bottom + 4)}px`
    menu.style.insetInlineStart = '0px'
    requestAnimationFrame(() => {
      const menuRect = menu.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      // Prefer extending to the right from the anchor's left edge so the
      // menu opens into the content area rather than past the sidebar's
      // left edge. Clamp to stay on-screen if the viewport is narrow.
      let left = rect.left
      if (left + menuRect.width > viewportWidth - 8) {
        left = Math.max(8, viewportWidth - 8 - menuRect.width)
      }
      menu.style.insetInlineStart = `${Math.round(left)}px`
      menu.style.visibility = ''
    })
  }

  private syncDocumentClickHandler() {
    if (this.deliveryMenuOpenFor && !this.documentClickHandler) {
      this.documentClickHandler = (e: MouseEvent) => {
        const target = e.target as Element | null
        if (!target || !target.closest('.form-structure__delivery')) {
          this.deliveryMenuOpenFor = null
          this.applyDeliveryMenu()
        }
      }
      document.addEventListener('click', this.documentClickHandler)
    } else if (!this.deliveryMenuOpenFor && this.documentClickHandler) {
      this.removeDocumentClickHandler()
    }
  }

  private toggleCollapsed() {
    this.collapsed = !this.collapsed
    const editorStructure = this.closest<HTMLElement>('.editor-structure')
    if (editorStructure) {
      if (this.collapsed) {
        editorStructure.dataset.collapsed = ''
      } else {
        delete editorStructure.dataset.collapsed
      }
    }
    this.render()
  }

  private dispatchSelect(pageId: string) {
    this.dispatchEvent(
      new CustomEvent('formeditor:select', {
        detail: { kind: 'page', id: pageId },
        bubbles: true,
        composed: true,
      }),
    )
  }

  private removeDocumentClickHandler() {
    if (this.documentClickHandler) {
      document.removeEventListener('click', this.documentClickHandler)
      this.documentClickHandler = null
    }
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

if (!customElements.get('flex-form-structure')) {
  customElements.define('flex-form-structure', FlexFormStructure)
}
