interface FlexDatePickerAPI extends HTMLElement {
  getSelectedDate(): string | null
  setMinDate(iso: string | null): void
  setMaxDate(iso: string | null): void
}

class FlexDateRangePickerElement extends HTMLElement {
  private startPicker: FlexDatePickerAPI | null = null
  private endPicker: FlexDatePickerAPI | null = null

  connectedCallback() {
    const startContainer = this.querySelector(
      '.flex-date-range-picker__range-start',
    )
    const endContainer = this.querySelector(
      '.flex-date-range-picker__range-end',
    )

    this.startPicker =
      startContainer?.querySelector<FlexDatePickerAPI>('flex-date-picker') ||
      null
    this.endPicker =
      endContainer?.querySelector<FlexDatePickerAPI>('flex-date-picker') || null

    this.addEventListener('date-change', this.handleDateChange)
  }

  disconnectedCallback() {
    this.removeEventListener('date-change', this.handleDateChange)
  }

  private handleDateChange = (event: Event) => {
    const target = (event.target as Element).closest('flex-date-picker')
    if (!target) return

    const startContainer = this.querySelector(
      '.flex-date-range-picker__range-start',
    )
    const endContainer = this.querySelector(
      '.flex-date-range-picker__range-end',
    )

    if (startContainer?.contains(target)) {
      // Start date changed — update end picker's min date
      const startDate =
        this.startPicker?.getSelectedDate?.() ??
        (event as CustomEvent).detail?.value
      if (this.endPicker?.setMinDate) {
        this.endPicker.setMinDate(startDate)
      }
    } else if (endContainer?.contains(target)) {
      // End date changed — update start picker's max date
      const endDate =
        this.endPicker?.getSelectedDate?.() ??
        (event as CustomEvent).detail?.value
      if (this.startPicker?.setMaxDate) {
        this.startPicker.setMaxDate(endDate)
      }
    }
  }
}

if (!customElements.get('flex-date-range-picker')) {
  customElements.define('flex-date-range-picker', FlexDateRangePickerElement)
}
