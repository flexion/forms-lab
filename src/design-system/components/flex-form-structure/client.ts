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
          this.render()
        }
      })
    }
    this.render()
  }

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
    } else {
      const pageHtml = state.formSpec.pages
        .map((page, i) => {
          const groupCount = page.groups.length
          const mode = (page.deliveryMode as DeliveryMode) ?? 'static'
          const canUp = i > 0
          const canDown = i < state.formSpec.pages.length - 1
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
              <span class="form-structure__delivery">
                <button type="button" class="form-structure__icon-btn" data-action="delivery-toggle" data-page-id="${page.id}" title="Delivery: ${DELIVERY_LABEL[mode]}" aria-label="Delivery mode: ${DELIVERY_LABEL[mode]}" aria-haspopup="menu" aria-expanded="${this.deliveryMenuOpenFor === page.id}">
                  <svg class="flex-icon" data-size="3" aria-hidden="true" focusable="false"><use href="/static/sprite.svg#${DELIVERY_ICON[mode]}" /></svg>
                </button>
                ${
                  this.deliveryMenuOpenFor === page.id
                    ? `<div class="form-structure__delivery-menu" role="menu">
                        ${DELIVERY_MODES.map(
                          (m) => `
                            <button type="button" role="menuitemradio" aria-checked="${m === mode}" class="form-structure__delivery-option${m === mode ? ' form-structure__delivery-option--current' : ''}" data-action="delivery-pick" data-page-id="${page.id}" data-mode="${m}">
                              <svg class="flex-icon" data-size="3" aria-hidden="true" focusable="false"><use href="/static/sprite.svg#${DELIVERY_ICON[m]}" /></svg>
                              <span class="form-structure__delivery-label"><strong>${DELIVERY_LABEL[m]}</strong><span class="form-structure__delivery-desc">${DELIVERY_DESCRIPTION[m]}</span></span>
                            </button>`,
                        ).join('')}
                      </div>`
                    : ''
                }
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
        })
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
    }

    this.bindHandlers()
  }

  private bindHandlers() {
    const toggleBtn = this.querySelector<HTMLButtonElement>(
      '.form-structure__toggle',
    )
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
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
      })
    }

    for (const btn of this.querySelectorAll<HTMLButtonElement>(
      '.form-structure__mini-item',
    )) {
      btn.addEventListener('click', () => {
        const pageId = btn.dataset.pageId
        if (!pageId) return
        this.dispatchSelect(pageId)
      })
    }

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
        this.render()
      })
    }

    for (const btn of this.querySelectorAll<HTMLButtonElement>(
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
        this.render()
      })
    }

    // Close the delivery menu on outside click / Escape
    if (this.deliveryMenuOpenFor && !this.documentClickHandler) {
      this.documentClickHandler = (e: MouseEvent) => {
        const target = e.target as Element | null
        if (!target || !target.closest('.form-structure__delivery')) {
          this.deliveryMenuOpenFor = null
          this.removeDocumentClickHandler()
          this.render()
        }
      }
      document.addEventListener('click', this.documentClickHandler)
    } else if (!this.deliveryMenuOpenFor && this.documentClickHandler) {
      this.removeDocumentClickHandler()
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

  disconnectedCallback() {
    this.removeDocumentClickHandler()
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
