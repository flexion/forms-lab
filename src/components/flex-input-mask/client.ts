class FlexInputMaskElement extends HTMLElement {
  private input: HTMLInputElement | null = null
  private overlay: HTMLElement | null = null
  private mask = ''
  private maskChar = '_'

  connectedCallback() {
    this.mask = this.dataset.mask || ''
    this.maskChar = this.dataset.maskChar || '_'
    this.input = this.querySelector('.flex-input-mask__input')
    this.overlay = this.querySelector('.flex-input-mask__overlay')

    if (this.input && this.mask) {
      this.input.addEventListener('input', this.handleInput)
      this.input.addEventListener('keydown', this.handleKeydown)
      this.updateOverlay()
    }
  }

  disconnectedCallback() {
    this.input?.removeEventListener('input', this.handleInput)
    this.input?.removeEventListener('keydown', this.handleKeydown)
  }

  private handleInput = () => {
    this.formatValue()
    this.updateOverlay()
  }

  private handleKeydown = (e: KeyboardEvent) => {
    // Allow navigation and editing keys
    if (
      e.key === 'Backspace' ||
      e.key === 'Delete' ||
      e.key === 'ArrowLeft' ||
      e.key === 'ArrowRight' ||
      e.key === 'Tab' ||
      e.ctrlKey ||
      e.metaKey
    ) {
      return
    }
    // Only allow digits for numeric masks
    if (this.isNumericMask() && !/^\d$/.test(e.key)) {
      e.preventDefault()
    }
  }

  /** Format the raw input value according to the mask pattern. */
  private formatValue() {
    if (!this.input) return

    // Extract only digits from the current value
    const digits = this.input.value.replace(/\D/g, '')

    // Rebuild formatted value by walking the mask
    let formatted = ''
    let digitIndex = 0
    for (const ch of this.mask) {
      if (digitIndex >= digits.length) break
      if (ch === this.maskChar) {
        formatted += digits[digitIndex]
        digitIndex++
      } else {
        // Literal character from mask (e.g., "-", "(", ")", " ")
        formatted += ch
      }
    }

    // Only update if different to preserve cursor position on no-ops
    if (this.input.value !== formatted) {
      this.input.value = formatted
    }
  }

  /** Update the overlay to show the remaining mask after typed characters. */
  private updateOverlay() {
    if (!this.overlay || !this.input) return

    const value = this.input.value
    // Show typed characters as spaces (invisible in overlay) + remaining mask
    let overlayText = ''
    for (let i = 0; i < this.mask.length; i++) {
      if (i < value.length) {
        // Character already typed — show as space to maintain alignment
        overlayText += '\u00A0'
      } else {
        overlayText += this.mask[i]
      }
    }
    this.overlay.textContent = overlayText
  }

  /** Check if the mask only expects digits (all mask chars are the placeholder). */
  private isNumericMask(): boolean {
    for (const ch of this.mask) {
      if (ch !== this.maskChar && /[a-zA-Z]/.test(ch)) {
        return false
      }
    }
    return true
  }
}

if (!customElements.get('flex-input-mask')) {
  customElements.define('flex-input-mask', FlexInputMaskElement)
}
