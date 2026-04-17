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
    const current = pages[this.pageIndex]
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
          <h2 class="editable-page__title">${escapeHtml(current.title)}</h2>
        </header>
        <div class="editable-page__body" data-page-id="${current.id}"></div>
      </div>
    `
    for (const tab of this.querySelectorAll<HTMLButtonElement>('.editable-page__tab')) {
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
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

if (!customElements.get('flex-editable-page')) {
  customElements.define('flex-editable-page', FlexEditablePage)
}
