class FlexSortableList extends HTMLElement {
  connectedCallback() {
    this.initDragAndDrop()
    this.hideReorderButtons()
  }

  private hideReorderButtons() {
    for (const btn of this.querySelectorAll('.form-editor__reorder-buttons')) {
      ;(btn as HTMLElement).hidden = true
    }
  }

  private initDragAndDrop() {
    const items = this.querySelectorAll('li[data-page-id]')
    for (const item of items) {
      const el = item as HTMLElement
      el.draggable = true
      el.addEventListener('dragstart', this.handleDragStart.bind(this))
      el.addEventListener('dragover', this.handleDragOver.bind(this))
      el.addEventListener('drop', this.handleDrop.bind(this))
      el.addEventListener('dragend', this.handleDragEnd.bind(this))
    }
  }

  private draggedItem: HTMLElement | null = null

  private handleDragStart(e: DragEvent) {
    this.draggedItem = e.currentTarget as HTMLElement
    this.draggedItem.style.opacity = '0.5'
    e.dataTransfer?.setData('text/plain', '')
  }

  private handleDragOver(e: DragEvent) {
    e.preventDefault()
  }

  private handleDrop(e: DragEvent) {
    e.preventDefault()
    const target = (e.currentTarget as HTMLElement).closest(
      'li[data-page-id]',
    ) as HTMLElement | null
    if (!target || !this.draggedItem || target === this.draggedItem) return

    const list = this.querySelector('ol, ul')
    if (!list) return

    const items = [...list.children]
    const draggedIndex = items.indexOf(this.draggedItem)
    const targetIndex = items.indexOf(target)

    if (draggedIndex < targetIndex) {
      list.insertBefore(this.draggedItem, target.nextSibling)
    } else {
      list.insertBefore(this.draggedItem, target)
    }

    const action = this.dataset.action
    if (action) {
      const pageIds = [...list.querySelectorAll('li[data-page-id]')].map(
        (li) => (li as HTMLElement).dataset.pageId,
      )
      const form = document.createElement('form')
      form.method = 'POST'
      form.action = action
      const input = document.createElement('input')
      input.type = 'hidden'
      input.name = 'order'
      input.value = JSON.stringify(pageIds)
      form.appendChild(input)
      document.body.appendChild(form)
      form.submit()
    }
  }

  private handleDragEnd() {
    if (this.draggedItem) {
      this.draggedItem.style.opacity = '1'
      this.draggedItem = null
    }
  }
}

if (!customElements.get('flex-sortable-list')) {
  customElements.define('flex-sortable-list', FlexSortableList)
}
