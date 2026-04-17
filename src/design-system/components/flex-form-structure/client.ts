import type { ProjectStateClient } from '../flex-form-editor/protocol'

class FlexFormStructure extends HTMLElement {
  private state: ProjectStateClient | null = null
  private collapsed = false

  connectedCallback() {
    const root = this.closest('flex-form-editor')
    if (root) {
      root.addEventListener('formeditor:state-projected', (e) => {
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

    if (this.collapsed) {
      const miniItems = state.formSpec.pages
        .map(
          (page, i) =>
            `<li><button type="button" data-page-id="${page.id}" class="form-structure__mini-item">${i + 1}</button></li>`,
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
          return `
          <li class="form-structure__page" data-page-id="${page.id}">
            <div class="form-structure__page-header">
              <span class="form-structure__page-title">${i + 1}. ${escapeHtml(page.title)}</span>
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
        this.dispatchEvent(
          new CustomEvent('formeditor:select', {
            detail: { kind: 'page', id: pageId },
            bubbles: true,
            composed: true,
          }),
        )
      })
    }

    for (const select of this.querySelectorAll<HTMLSelectElement>(
      '.form-structure__delivery',
    )) {
      select.addEventListener('change', () => {
        const pageId = select.dataset.pageId
        if (!pageId) return
        this.dispatchEvent(
          new CustomEvent('formeditor:stage-command', {
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
    for (const pageEl of this.querySelectorAll<HTMLElement>(
      '.form-structure__page-header',
    )) {
      pageEl.style.cursor = 'pointer'
      pageEl.addEventListener('click', () => {
        const pageId =
          pageEl.closest<HTMLElement>('[data-page-id]')?.dataset.pageId
        if (!pageId) return
        this.dispatchEvent(
          new CustomEvent('formeditor:select', {
            detail: { kind: 'page', id: pageId },
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
