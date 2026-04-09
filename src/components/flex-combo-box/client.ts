class FlexComboBoxElement extends HTMLElement {
  private input: HTMLInputElement | null = null
  private list: HTMLUListElement | null = null
  private toggle: HTMLButtonElement | null = null
  private clearBtn: HTMLButtonElement | null = null
  private options: HTMLLIElement[] = []
  private focusedIndex = -1
  private previousValue = ''

  connectedCallback() {
    this.input = this.querySelector('.flex-combo-box__input')
    this.list = this.querySelector('.flex-combo-box__list')
    this.toggle = this.querySelector('.flex-combo-box__toggle')
    this.clearBtn = this.querySelector('.flex-combo-box__clear')
    this.options = Array.from(this.querySelectorAll('.flex-combo-box__option'))

    if (!this.input || !this.list) return

    // Initialize from any default value
    this.previousValue = this.input.value

    this.input.addEventListener('input', this.handleInput)
    this.input.addEventListener('keydown', this.handleKeydown)
    this.input.addEventListener('focus', this.handleInputFocus)
    this.toggle?.addEventListener('click', this.handleToggleClick)
    this.clearBtn?.addEventListener('click', this.handleClear)
    this.list.addEventListener('click', this.handleListClick)
    document.addEventListener('click', this.handleOutsideClick)
  }

  disconnectedCallback() {
    this.input?.removeEventListener('input', this.handleInput)
    this.input?.removeEventListener('keydown', this.handleKeydown)
    this.input?.removeEventListener('focus', this.handleInputFocus)
    this.toggle?.removeEventListener('click', this.handleToggleClick)
    this.clearBtn?.removeEventListener('click', this.handleClear)
    this.list?.removeEventListener('click', this.handleListClick)
    document.removeEventListener('click', this.handleOutsideClick)
  }

  private get isOpen(): boolean {
    return this.input?.getAttribute('aria-expanded') === 'true'
  }

  private get visibleOptions(): HTMLLIElement[] {
    return this.options.filter((o) => !o.hasAttribute('hidden'))
  }

  private handleInputFocus = () => {
    // Don't auto-open on focus; user must click or type
  }

  private handleInput = () => {
    if (!this.input) return
    const query = this.input.value
    this.filterOptions(query)
    this.open()
    // Reset focus index when typing
    this.setFocusedIndex(-1)
  }

  private handleKeydown = (event: KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        if (!this.isOpen) {
          this.showAllOptions()
          this.open()
        }
        this.moveFocus(1)
        break
      case 'ArrowUp':
        event.preventDefault()
        if (!this.isOpen) {
          this.showAllOptions()
          this.open()
        }
        this.moveFocus(-1)
        break
      case 'Enter':
        event.preventDefault()
        if (this.isOpen && this.focusedIndex >= 0) {
          const visible = this.visibleOptions
          if (visible[this.focusedIndex]) {
            this.selectOption(visible[this.focusedIndex])
          }
        }
        break
      case 'Escape':
        event.preventDefault()
        if (this.isOpen) {
          this.close()
          // Restore previous value on escape
          if (this.input) {
            this.input.value = this.previousValue
          }
        }
        break
      case 'Tab':
        if (this.isOpen) {
          // If there's a focused option, select it
          if (this.focusedIndex >= 0) {
            const visible = this.visibleOptions
            if (visible[this.focusedIndex]) {
              this.selectOption(visible[this.focusedIndex])
            }
          }
          this.close()
        }
        break
    }
  }

  private handleToggleClick = () => {
    if (this.isOpen) {
      this.close()
    } else {
      this.showAllOptions()
      this.open()
      this.input?.focus()
    }
  }

  private handleClear = () => {
    if (!this.input) return
    this.input.value = ''
    this.input.dataset.value = ''
    this.previousValue = ''
    this.clearSelection()
    this.hideClearButton()
    this.input.focus()
  }

  private handleListClick = (event: MouseEvent) => {
    const option = (event.target as Element).closest(
      '.flex-combo-box__option',
    ) as HTMLLIElement | null
    if (option && !option.hasAttribute('hidden')) {
      this.selectOption(option)
    }
  }

  private handleOutsideClick = (event: MouseEvent) => {
    if (!this.contains(event.target as Node)) {
      if (this.isOpen) {
        this.close()
      }
    }
  }

  private open() {
    if (!this.input || !this.list) return
    this.input.setAttribute('aria-expanded', 'true')
    this.list.removeAttribute('hidden')
  }

  private close() {
    if (!this.input || !this.list) return
    this.input.setAttribute('aria-expanded', 'false')
    this.list.setAttribute('hidden', '')
    this.setFocusedIndex(-1)
    this.input.removeAttribute('aria-activedescendant')
  }

  private filterOptions(query: string) {
    const lower = query.toLowerCase()
    let hasMatch = false
    for (const option of this.options) {
      const text = option.textContent?.toLowerCase() || ''
      const matches = text.includes(lower)
      if (matches) {
        option.removeAttribute('hidden')
        hasMatch = true
      } else {
        option.setAttribute('hidden', '')
      }
    }
    // Handle "no results" messaging
    this.updateNoResults(!hasMatch && query.length > 0)
  }

  private showAllOptions() {
    for (const option of this.options) {
      option.removeAttribute('hidden')
    }
    this.updateNoResults(false)
  }

  private updateNoResults(show: boolean) {
    if (!this.list) return
    let noResults = this.list.querySelector('.flex-combo-box__no-results')
    if (show) {
      if (!noResults) {
        noResults = document.createElement('li')
        noResults.className = 'flex-combo-box__no-results'
        noResults.setAttribute('role', 'option')
        noResults.setAttribute('aria-disabled', 'true')
        noResults.textContent = 'No results found'
        this.list.appendChild(noResults)
      }
      ;(noResults as HTMLElement).removeAttribute('hidden')
    } else if (noResults) {
      noResults.remove()
    }
  }

  private moveFocus(direction: number) {
    const visible = this.visibleOptions
    if (visible.length === 0) return
    let newIndex = this.focusedIndex + direction
    if (newIndex < 0) newIndex = visible.length - 1
    if (newIndex >= visible.length) newIndex = 0
    this.setFocusedIndex(newIndex)
  }

  private setFocusedIndex(index: number) {
    const visible = this.visibleOptions
    // Clear previous focus
    for (const option of this.options) {
      option.removeAttribute('data-focused')
    }

    this.focusedIndex = index

    if (index >= 0 && visible[index]) {
      visible[index].setAttribute('data-focused', '')
      // Update aria-activedescendant
      if (this.input && visible[index].id) {
        this.input.setAttribute('aria-activedescendant', visible[index].id)
      }
      // Scroll into view
      visible[index].scrollIntoView({ block: 'nearest' })
    } else if (this.input) {
      this.input.removeAttribute('aria-activedescendant')
    }
  }

  private selectOption(option: HTMLLIElement) {
    if (!this.input) return
    const value = option.dataset.value || ''
    const label = option.textContent || ''

    this.input.value = label
    this.input.dataset.value = value
    this.previousValue = label

    // Update aria-selected
    this.clearSelection()
    option.setAttribute('aria-selected', 'true')

    this.close()
    this.showClearButton()
    this.input.focus()
  }

  private clearSelection() {
    for (const option of this.options) {
      option.removeAttribute('aria-selected')
    }
  }

  private showClearButton() {
    this.clearBtn?.removeAttribute('hidden')
  }

  private hideClearButton() {
    this.clearBtn?.setAttribute('hidden', '')
  }
}

if (!customElements.get('flex-combo-box')) {
  customElements.define('flex-combo-box', FlexComboBoxElement)
}
