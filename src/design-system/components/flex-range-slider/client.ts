class FlexRangeSliderElement extends HTMLElement {
  private input: HTMLInputElement | null = null
  private valueDisplay: HTMLElement | null = null

  connectedCallback() {
    this.input = this.querySelector('.flex-range-slider__input')
    this.valueDisplay = this.querySelector('.flex-range-slider__value')

    if (this.input) {
      this.updateValue()
      this.input.addEventListener('input', this.handleInput)
    }
  }

  disconnectedCallback() {
    this.input?.removeEventListener('input', this.handleInput)
  }

  private handleInput = () => {
    this.updateValue()
  }

  private updateValue() {
    if (!this.input || !this.valueDisplay) return
    this.valueDisplay.textContent = this.input.value
  }
}

if (!customElements.get('flex-range-slider')) {
  customElements.define('flex-range-slider', FlexRangeSliderElement)
}
