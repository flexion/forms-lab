import type { ProjectStateClient } from '../flex-form-editor/protocol'

class FlexFormStructure extends HTMLElement {
  private state: ProjectStateClient | null = null

  connectedCallback() {
    const root = this.closest('flex-form-editor')
    if (root) {
      root.addEventListener('formeditor:spec-updated', (e) => {
        this.state = (e as CustomEvent).detail.state
        this.render()
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
    const pageHtml = state.formSpec.pages
      .map((page, i) => {
        const groupCount = page.groups.length
        return `
          <li class="form-structure__page" data-page-id="${page.id}">
            <div class="form-structure__page-header">
              <span class="form-structure__page-title">${i + 1}. ${escape(page.title)}</span>
              <span class="form-structure__group-count">${groupCount} group${groupCount === 1 ? '' : 's'}</span>
            </div>
            <select class="flex-select form-structure__delivery" data-page-id="${page.id}">
              <option value="static" ${page.deliveryMode !== 'conversational' && page.deliveryMode !== 'hybrid' ? 'selected' : ''}>Static</option>
              <option value="conversational" ${page.deliveryMode === 'conversational' ? 'selected' : ''}>Conversational</option>
              <option value="hybrid" ${page.deliveryMode === 'hybrid' ? 'selected' : ''}>Hybrid</option>
            </select>
            <div class="form-structure__reorder">
              ${i > 0 ? `<button type="button" data-action="up" data-page-id="${page.id}" aria-label="Move up">&uarr;</button>` : ''}
              ${i < state.formSpec.pages.length - 1 ? `<button type="button" data-action="down" data-page-id="${page.id}" aria-label="Move down">&darr;</button>` : ''}
            </div>
          </li>
        `
      })
      .join('')
    this.innerHTML = `
      <section class="form-structure">
        <h2>Structure</h2>
        <ol class="form-structure__page-list">${pageHtml}</ol>
      </section>
    `
    this.bindHandlers()
  }

  private bindHandlers() {
    for (const select of this.querySelectorAll<HTMLSelectElement>(
      '.form-structure__delivery',
    )) {
      select.addEventListener('change', () => {
        const pageId = select.dataset.pageId
        if (!pageId) return
        this.dispatchEvent(
          new CustomEvent('formeditor:manual-command', {
            detail: {
              command: {
                kind: 'setDeliveryMode',
                pageId,
                mode: select.value as 'static' | 'conversational' | 'hybrid',
              },
              explanation: `Set delivery mode to ${select.value}`,
            },
            bubbles: true,
            composed: true,
          }),
        )
      })
    }
    for (const btn of this.querySelectorAll<HTMLButtonElement>(
      '[data-action]',
    )) {
      btn.addEventListener('click', () => {
        const pageId = btn.dataset.pageId
        const direction = btn.dataset.action as 'up' | 'down'
        if (!pageId || !this.state) return
        const idx = this.state.formSpec.pages.findIndex((p) => p.id === pageId)
        const target = direction === 'up' ? idx - 1 : idx + 1
        if (target < 0 || target >= this.state.formSpec.pages.length) return
        const otherId = this.state.formSpec.pages[target].id
        this.dispatchEvent(
          new CustomEvent('formeditor:manual-command', {
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
}

function escape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

if (!customElements.get('flex-form-structure')) {
  customElements.define('flex-form-structure', FlexFormStructure)
}
