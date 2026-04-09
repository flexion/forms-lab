class FlexFileInputElement extends HTMLElement {
  private input: HTMLInputElement | null = null
  private target: HTMLElement | null = null
  private previewArea: HTMLElement | null = null

  connectedCallback() {
    this.input = this.querySelector('.flex-file-input__input')
    this.target = this.querySelector('.flex-file-input__target')
    this.previewArea = this.querySelector('.flex-file-input__preview-area')

    if (this.input) {
      this.input.addEventListener('change', this.handleChange)
    }
    if (this.target) {
      this.target.addEventListener('dragenter', this.handleDragEnter)
      this.target.addEventListener('dragover', this.handleDragOver)
      this.target.addEventListener('dragleave', this.handleDragLeave)
      this.target.addEventListener('drop', this.handleDrop)
    }
    if (this.previewArea) {
      this.previewArea.addEventListener('click', this.handlePreviewClick)
    }
  }

  disconnectedCallback() {
    this.input?.removeEventListener('change', this.handleChange)
    if (this.target) {
      this.target.removeEventListener('dragenter', this.handleDragEnter)
      this.target.removeEventListener('dragover', this.handleDragOver)
      this.target.removeEventListener('dragleave', this.handleDragLeave)
      this.target.removeEventListener('drop', this.handleDrop)
    }
    this.previewArea?.removeEventListener('click', this.handlePreviewClick)
  }

  private handleDragEnter = (event: DragEvent) => {
    event.preventDefault()
    this.target?.setAttribute('data-drag-active', '')
  }

  private handleDragOver = (event: DragEvent) => {
    event.preventDefault()
    this.target?.setAttribute('data-drag-active', '')
  }

  private handleDragLeave = (event: DragEvent) => {
    // Only remove if leaving the target entirely
    const related = event.relatedTarget as Node | null
    if (this.target && !this.target.contains(related)) {
      this.target.removeAttribute('data-drag-active')
    }
  }

  private handleDrop = (event: DragEvent) => {
    event.preventDefault()
    this.target?.removeAttribute('data-drag-active')

    const files = event.dataTransfer?.files
    if (files && files.length > 0) {
      this.processFiles(files)
    }
  }

  private handleChange = () => {
    const files = this.input?.files
    if (files && files.length > 0) {
      this.processFiles(files)
    }
  }

  private handlePreviewClick = (event: Event) => {
    const button = (event.target as Element).closest('.flex-file-input__remove')
    if (!button || !(button instanceof HTMLButtonElement)) return

    const preview = button.closest('.flex-file-input__preview')
    if (preview) {
      preview.remove()
    }

    // Clear the input so the same file can be re-selected
    if (this.input) {
      this.input.value = ''
    }

    // Announce removal
    this.announceStatus('File removed')
  }

  private processFiles(files: FileList) {
    if (!this.previewArea) return

    // Validate against accept attribute
    const accept = this.input?.getAttribute('accept')
    const acceptedTypes = accept
      ? accept.split(',').map((t) => t.trim().toLowerCase())
      : null

    this.previewArea.innerHTML = ''
    let hasError = false

    for (const file of Array.from(files)) {
      if (acceptedTypes && !this.isAcceptedFile(file, acceptedTypes)) {
        hasError = true
        this.renderError(file)
      } else {
        this.renderPreview(file)
      }
    }

    if (hasError) {
      this.target?.classList.add('flex-file-input__target--error')
    } else {
      this.target?.classList.remove('flex-file-input__target--error')
    }
  }

  private isAcceptedFile(file: File, acceptedTypes: string[]): boolean {
    for (const type of acceptedTypes) {
      // Extension match (e.g., ".pdf")
      if (type.startsWith('.')) {
        if (file.name.toLowerCase().endsWith(type)) return true
      }
      // MIME type match (e.g., "image/*")
      else if (type.endsWith('/*')) {
        const category = type.slice(0, type.indexOf('/'))
        if (file.type.startsWith(`${category}/`)) return true
      }
      // Exact MIME match
      else if (file.type === type) {
        return true
      }
    }
    return false
  }

  private renderPreview(file: File) {
    if (!this.previewArea) return

    const preview = document.createElement('div')
    preview.className = 'flex-file-input__preview'

    if (!file.type.startsWith('image/')) {
      const icon = document.createElement('span')
      icon.className = 'flex-file-input__file-icon'
      icon.setAttribute('aria-hidden', 'true')
      preview.appendChild(icon)
    }

    const info = document.createElement('div')
    info.className = 'flex-file-input__file-info'

    const name = document.createElement('span')
    name.className = 'flex-file-input__file-name'
    name.textContent = file.name

    const size = document.createElement('span')
    size.className = 'flex-file-input__file-size'
    size.textContent = this.formatFileSize(file.size)

    info.appendChild(name)
    info.appendChild(size)
    preview.appendChild(info)

    const removeBtn = document.createElement('button')
    removeBtn.type = 'button'
    removeBtn.className = 'flex-file-input__remove'
    removeBtn.setAttribute('aria-label', `Remove ${file.name}`)
    removeBtn.textContent = '\u00d7'
    preview.appendChild(removeBtn)

    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = document.createElement('img')
        img.className = 'flex-file-input__thumbnail'
        img.src = e.target?.result as string
        img.alt = file.name
        preview.insertBefore(img, info)
      }
      reader.readAsDataURL(file)
    }

    this.previewArea.appendChild(preview)
    this.announceStatus(`File selected: ${file.name}`)
  }

  private renderError(file: File) {
    if (!this.previewArea) return

    const preview = document.createElement('div')
    preview.className =
      'flex-file-input__preview flex-file-input__preview--error'

    const info = document.createElement('div')
    info.className = 'flex-file-input__file-info'

    const name = document.createElement('span')
    name.className = 'flex-file-input__file-name'
    name.textContent = `${file.name} — This is not a valid file type.`

    info.appendChild(name)
    preview.appendChild(info)

    const removeBtn = document.createElement('button')
    removeBtn.type = 'button'
    removeBtn.className = 'flex-file-input__remove'
    removeBtn.setAttribute('aria-label', `Remove ${file.name}`)
    removeBtn.textContent = '\u00d7'
    preview.appendChild(removeBtn)

    this.previewArea.appendChild(preview)
    this.announceStatus(`Invalid file type: ${file.name}`)
  }

  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  private announceStatus(message: string) {
    let status = this.querySelector('.flex-file-input__status')
    if (!status) {
      status = document.createElement('div')
      status.className = 'flex-file-input__status'
      status.setAttribute('aria-live', 'polite')
      status.setAttribute('role', 'status')
      this.appendChild(status)
    }
    status.textContent = message
  }
}

if (!customElements.get('flex-file-input')) {
  customElements.define('flex-file-input', FlexFileInputElement)
}
