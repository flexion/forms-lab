/**
 * flex-time-picker client behavior.
 *
 * The time picker reuses the flex-combo-box for typeahead/selection.
 * On connectedCallback, it generates time options based on min-time,
 * max-time, and step attributes, then populates the inner combo-box.
 *
 * If the server has already rendered the options (via index.tsx),
 * the client just ensures the combo-box is initialized. If no options
 * exist (e.g., dynamic instantiation), it generates them client-side.
 */

function formatTime12h(hours24: number, minutes: number): string {
  const period = hours24 >= 12 ? 'pm' : 'am'
  const hours12 = hours24 % 12 || 12
  return `${hours12}:${String(minutes).padStart(2, '0')} ${period}`
}

function formatTime24h(hours: number, minutes: number): string {
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

class FlexTimePickerElement extends HTMLElement {
  connectedCallback() {
    // Only generate options if none exist (SSR already rendered them)
    const existingOptions = this.querySelectorAll('.flex-combo-box__option')
    if (existingOptions.length > 0) return

    const minTime = this.dataset.minTime || '00:00'
    const maxTime = this.dataset.maxTime || '23:59'
    const step = Number.parseInt(this.dataset.step || '30', 10)

    const list = this.querySelector('.flex-combo-box__list')
    if (!list) return

    const [minH, minM] = minTime.split(':').map(Number)
    const [maxH, maxM] = maxTime.split(':').map(Number)
    const startMinutes = minH * 60 + minM
    const endMinutes = maxH * 60 + maxM

    const inputId = this.querySelector('.flex-combo-box__input')?.id || 'time'

    for (let m = startMinutes; m <= endMinutes; m += step) {
      const hours24 = Math.floor(m / 60)
      const minutes = m % 60
      const value = formatTime24h(hours24, minutes)
      const label = formatTime12h(hours24, minutes)

      const li = document.createElement('li')
      li.className = 'flex-combo-box__option'
      li.setAttribute('role', 'option')
      li.setAttribute('tabindex', '-1')
      li.dataset.value = value
      li.id = `${inputId}-opt-${value.replace(':', '')}`
      li.textContent = label
      list.appendChild(li)
    }
  }
}

if (!customElements.get('flex-time-picker')) {
  customElements.define('flex-time-picker', FlexTimePickerElement)
}
