import type { Command } from '../../../services/forms/shaping/commands'
import type { FormPage } from '../../../services/forms/types'
import type { ProjectStateClient } from '../flex-form-editor/protocol'

class FlexEditablePage extends HTMLElement {
  private state: ProjectStateClient | null = null
  private pageIndex = 0
  private editingTitle = false

  connectedCallback() {
    const root = this.closest('flex-form-editor')
    if (root) {
      root.addEventListener('formeditor:state-projected', (e) => {
        const next = (e as CustomEvent).detail.state as ProjectStateClient
        this.state = next
        if (this.pageIndex >= next.formSpec.pages.length) this.pageIndex = 0
        if (!this.editingTitle) this.render()
      })
    }
  }

  update(state: ProjectStateClient, pageIndex: number): void {
    this.state = state
    this.pageIndex = pageIndex
    if (!this.editingTitle) this.render()
  }

  private dispatch(command: Command, explanation: string) {
    this.dispatchEvent(
      new CustomEvent('formeditor:stage-command', {
        detail: { command, explanation },
        bubbles: true,
        composed: true,
      }),
    )
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

    const groupMap = new Map(this.state.dataSpec.groups.map((g) => [g.id, g]))
    const groupsHtml = current.groups
      .map((gid) => {
        const g = groupMap.get(gid)
        return g
          ? `<flex-editable-group data-group-id="${g.id}"></flex-editable-group>`
          : ''
      })
      .join('')

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
          <h2 class="editable-page__title" tabindex="0" data-action="edit-title" title="Click to rename page">${escapeHtml(current.title)}</h2>
          <div class="editable-page__toolbar" role="toolbar" aria-label="Page actions">
            <label class="editable-page__delivery-label">
              Delivery
              <select class="editable-page__delivery flex-select" aria-label="Delivery mode">
                <option value="static" ${deliveryMode === 'static' ? 'selected' : ''}>Static</option>
                <option value="conversational" ${deliveryMode === 'conversational' ? 'selected' : ''}>Conversational</option>
                <option value="hybrid" ${deliveryMode === 'hybrid' ? 'selected' : ''}>Hybrid</option>
              </select>
            </label>
            ${canMoveUp ? `<button type="button" class="flex-button" data-variant="ghost" data-action="page-up" aria-label="Move page up">&uarr;</button>` : ''}
            ${canMoveDown ? `<button type="button" class="flex-button" data-variant="ghost" data-action="page-down" aria-label="Move page down">&darr;</button>` : ''}
            <button type="button" class="flex-button" data-variant="ghost" data-action="add-page">+ Page</button>
            <button type="button" class="flex-button" data-variant="ghost" data-action="remove-page" aria-label="Remove page">&times;</button>
          </div>
        </header>
        <div class="editable-page__body" data-page-id="${current.id}">
          ${groupsHtml}
          <button type="button" class="flex-button" data-variant="ghost" data-action="add-group">+ Group</button>
        </div>
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

    const titleEl = this.querySelector<HTMLElement>('.editable-page__title')
    titleEl?.addEventListener('click', () => this.startEditingTitle())
    titleEl?.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Enter') {
        e.preventDefault()
        this.startEditingTitle()
      }
    })

    const deliverySelect = this.querySelector<HTMLSelectElement>(
      '.editable-page__delivery',
    )
    deliverySelect?.addEventListener('change', () => {
      this.dispatch(
        {
          kind: 'setDeliveryMode',
          pageId: current.id,
          mode: deliverySelect.value as 'static' | 'conversational' | 'hybrid',
        },
        `Set delivery mode to ${deliverySelect.value}`,
      )
    })

    this.querySelector('[data-action="add-page"]')?.addEventListener(
      'click',
      () =>
        this.dispatch(
          { kind: 'addPage', afterPageId: current.id, title: 'New page' },
          'Add page',
        ),
    )

    this.querySelector('[data-action="remove-page"]')?.addEventListener(
      'click',
      () =>
        this.dispatch(
          { kind: 'removePage', id: current.id },
          `Remove page "${current.title}"`,
        ),
    )

    this.querySelector('[data-action="page-up"]')?.addEventListener(
      'click',
      () => {
        if (prevPageId)
          this.dispatch(
            { kind: 'swapPages', a: current.id, b: prevPageId },
            'Move page up',
          )
      },
    )

    this.querySelector('[data-action="page-down"]')?.addEventListener(
      'click',
      () => {
        if (nextPageId)
          this.dispatch(
            { kind: 'swapPages', a: current.id, b: nextPageId },
            'Move page down',
          )
      },
    )

    this.querySelector('[data-action="add-group"]')?.addEventListener(
      'click',
      () =>
        this.dispatch(
          { kind: 'addGroup', pageId: current.id, title: 'New group' },
          'Add group',
        ),
    )
    for (const child of this.querySelectorAll('flex-editable-group')) {
      const id = (child as HTMLElement).dataset.groupId
      const g = id ? groupMap.get(id) : undefined
      const c = child as HTMLElement & { update?: (group: unknown) => void }
      if (g && typeof c.update === 'function') c.update(g)
    }
  }

  private startEditingTitle() {
    if (this.editingTitle || !this.state) return
    const pages = this.state.formSpec.pages
    const current = pages[this.pageIndex] as FormPage | undefined
    if (!current) return
    const titleEl = this.querySelector<HTMLElement>('.editable-page__title')
    if (!titleEl) return
    this.editingTitle = true
    const input = document.createElement('input')
    input.type = 'text'
    input.className = 'editable-page__title-input flex-input'
    input.value = current.title
    input.setAttribute('aria-label', 'Page title')
    titleEl.replaceWith(input)
    input.focus()
    input.select()

    let cancelled = false
    const finish = () => {
      if (!this.editingTitle) return
      this.editingTitle = false
      const next = input.value.trim()
      if (!cancelled && next && next !== current.title) {
        this.dispatch(
          { kind: 'renamePage', id: current.id, title: next },
          `Rename page to "${next}"`,
        )
      } else {
        this.render()
      }
    }
    input.addEventListener('blur', finish)
    input.addEventListener('keydown', (e) => {
      const key = (e as KeyboardEvent).key
      if (key === 'Enter') {
        e.preventDefault()
        input.blur()
      } else if (key === 'Escape') {
        e.preventDefault()
        cancelled = true
        input.blur()
      }
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
