class FlexMemorableDateElement extends HTMLElement {
  private monthInput: HTMLInputElement | null = null
  private dayInput: HTMLInputElement | null = null
  private yearInput: HTMLInputElement | null = null

  connectedCallback() {
    this.monthInput = this.querySelector(
      '.flex-memorable-date__field--month input',
    )
    this.dayInput = this.querySelector('.flex-memorable-date__field--day input')
    this.yearInput = this.querySelector(
      '.flex-memorable-date__field--year input',
    )

    // Auto-advance: move focus to next field when current field is full
    this.monthInput?.addEventListener('input', this.handleMonthInput)
    this.dayInput?.addEventListener('input', this.handleDayInput)

    // Validate on blur
    this.monthInput?.addEventListener('blur', this.handleMonthBlur)
    this.dayInput?.addEventListener('blur', this.handleDayBlur)
    this.yearInput?.addEventListener('blur', this.handleYearBlur)
  }

  disconnectedCallback() {
    this.monthInput?.removeEventListener('input', this.handleMonthInput)
    this.dayInput?.removeEventListener('input', this.handleDayInput)
    this.monthInput?.removeEventListener('blur', this.handleMonthBlur)
    this.dayInput?.removeEventListener('blur', this.handleDayBlur)
    this.yearInput?.removeEventListener('blur', this.handleYearBlur)
  }

  private handleMonthInput = () => {
    if (!this.monthInput) return
    if (this.monthInput.value.length >= 2) {
      this.dayInput?.focus()
    }
  }

  private handleDayInput = () => {
    if (!this.dayInput) return
    if (this.dayInput.value.length >= 2) {
      this.yearInput?.focus()
    }
  }

  private handleMonthBlur = () => {
    this.validateField(this.monthInput, 1, 12)
  }

  private handleDayBlur = () => {
    this.validateField(this.dayInput, 1, 31)
  }

  private handleYearBlur = () => {
    if (!this.yearInput) return
    const value = this.yearInput.value
    if (value === '') {
      this.clearError(this.yearInput)
      return
    }
    if (value.length !== 4 || Number.isNaN(Number(value))) {
      this.showError(this.yearInput)
    } else {
      this.clearError(this.yearInput)
    }
  }

  private validateField(
    input: HTMLInputElement | null,
    min: number,
    max: number,
  ) {
    if (!input) return
    const value = input.value
    if (value === '') {
      this.clearError(input)
      return
    }
    const num = Number(value)
    if (Number.isNaN(num) || num < min || num > max) {
      this.showError(input)
    } else {
      this.clearError(input)
    }
  }

  private showError(input: HTMLInputElement) {
    input.dataset.state = 'error'
  }

  private clearError(input: HTMLInputElement) {
    delete input.dataset.state
  }
}

if (!customElements.get('flex-memorable-date')) {
  customElements.define('flex-memorable-date', FlexMemorableDateElement)
}
