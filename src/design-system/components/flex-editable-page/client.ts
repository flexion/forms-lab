import type { Command } from '../../../services/forms/shaping/commands'
import type { FormPage } from '../../../services/forms/types'
import type { ProjectStateClient } from '../flex-form-editor/protocol'

class FlexEditablePage extends HTMLElement {
  private state: ProjectStateClient | null = null
  private pageIndex = 0

  connectedCallback() {
    const root = this.closest('flex-form-editor')
    if (root) {
      root.addEventListener('formeditor:state-projected', (e) => {
        const next = (e as CustomEvent).detail.state as ProjectStateClient
        this.state = next
        if (this.pageIndex >= next.formSpec.pages.length) this.pageIndex = 0
        this.render()
      })
    }
  }

  update(state: ProjectStateClient, pageIndex: number): void {
    this.state = state
    this.pageIndex = pageIndex
    this.render()
  }

  private render() {
    if (!this.state) {
      this.innerHTML = ''
      return
    }
    const pages = this.state.formSpec.pages
    if (pages.length === 0) {
      this.innerHTML = '<p>No pages yet.</p>'
      return
    }
    if (this.pageIndex >= pages.length) this.pageIndex = pages.length - 1
    const current = pages[this.pageIndex] as FormPage

    const canMoveDown = this.pageIndex < pages.length - 1
    const canMoveUp = this.pageIndex > 0
    const nextPageId = canMoveDown ? pages[this.pageIndex + 1].id : null
    const prevPageId = canMoveUp ? pages[this.pageIndex - 1].id : null
    const deliveryMode = current.deliveryMode ?? 'static'

    const tabs = pages
      .map(
        (p, i) =>
          `<button type="button" role="tab" aria-selected="${i === this.pageIndex}" data-page-id="${p.id}" data-page-index="${i}" class="editable-page__tab">${i + 1}. ${escapeHtml(p.title)}</button>`,
      )
      .join('')

    this.innerHTML = `
      <div class="editable-page">
        <div class="editable-page__tabs" role="tablist">${tabs}</div>
        <header class="editable-page__header">
          <input
            type="text"
            class="editable-page__title-input flex-input"
            value="${escapeHtml(current.title)}"
            aria-label="Page title"
          />
          <select class="editable-page__delivery flex-select" aria-label="Delivery mode">
            <option value="static" ${deliveryMode === 'static' ? 'selected' : ''}>Static</option>
            <option value="conversational" ${deliveryMode === 'conversational' ? 'selected' : ''}>Conversational</option>
            <option value="hybrid" ${deliveryMode === 'hybrid' ? 'selected' : ''}>Hybrid</option>
          </select>
          <div class="editable-page__page-actions">
            ${canMoveUp ? `<button type="button" class="flex-button" data-variant="ghost" data-action="page-up" aria-label="Move page up">&uarr;</button>` : ''}
            ${canMoveDown ? `<button type="button" class="flex-button" data-variant="ghost" data-action="page-down" aria-label="Move page down">&darr;</button>` : ''}
            <button type="button" class="flex-button" data-variant="ghost" data-action="add-page">+ Page</button>
            <button type="button" class="flex-button" data-variant="ghost" data-action="remove-page" aria-label="Remove page">&times;</button>
          </div>
        </header>
        <div class="editable-page__body" data-page-id="${current.id}"></div>
      </div>
    `

    for (const tab of this.querySelectorAll<HTMLButtonElement>(
      '.editable-page__tab',
    )) {
      tab.addEventListener('click', () => {
        const id = tab.dataset.pageId
        const idx = Number(tab.dataset.pageIndex)
        if (id === undefined) return
        this.pageIndex = idx
        this.dispatchEvent(
          new CustomEvent('formeditor:select', {
            detail: { kind: 'page', id },
            bubbles: true,
            composed: true,
          }),
        )
        this.render()
      })
    }

    const dispatch = (command: Command, explanation: string) => {
      this.dispatchEvent(
        new CustomEvent('formeditor:stage-command', {
          detail: { command, explanation },
          bubbles: true,
          composed: true,
        }),
      )
    }

    const titleInput = this.querySelector<HTMLInputElement>(
      '.editable-page__title-input',
    )
    titleInput?.addEventListener('change', () => {
      if (titleInput.value === current.title) return
      dispatch(
        { kind: 'renamePage', id: current.id, title: titleInput.value },
        `Rename page to "${titleInput.value}"`,
      )
    })

    const deliverySelect = this.querySelector<HTMLSelectElement>(
      '.editable-page__delivery',
    )
    deliverySelect?.addEventListener('change', () => {
      dispatch(
        {
          kind: 'setDeliveryMode',
          pageId: current.id,
          mode: deliverySelect.value as 'static' | 'conversational' | 'hybrid',
        },
        `Set delivery mode to ${deliverySelect.value}`,
      )
    })

    const addBtn = this.querySelector('[data-action="add-page"]')
    addBtn?.addEventListener('click', () =>
      dispatch(
        { kind: 'addPage', afterPageId: current.id, title: 'New page' },
        'Add page',
      ),
    )

    const removeBtn = this.querySelector('[data-action="remove-page"]')
    removeBtn?.addEventListener('click', () =>
      dispatch(
        { kind: 'removePage', id: current.id },
        `Remove page "${current.title}"`,
      ),
    )

    const upBtn = this.querySelector('[data-action="page-up"]')
    upBtn?.addEventListener('click', () => {
      if (prevPageId)
        dispatch(
          { kind: 'swapPages', a: current.id, b: prevPageId },
          'Move page up',
        )
    })

    const downBtn = this.querySelector('[data-action="page-down"]')
    downBtn?.addEventListener('click', () => {
      if (nextPageId)
        dispatch(
          { kind: 'swapPages', a: current.id, b: nextPageId },
          'Move page down',
        )
    })
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

if (!customElements.get('flex-editable-page')) {
  customElements.define('flex-editable-page', FlexEditablePage)
}
