const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const MONTH_ABBR = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

/** Parse mm/dd/yyyy string to a Date (local time, day-only precision). */
function parseDisplayDate(str: string): Date | null {
  const match = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!match) return null
  const m = Number.parseInt(match[1], 10)
  const d = Number.parseInt(match[2], 10)
  const y = Number.parseInt(match[3], 10)
  if (m < 1 || m > 12 || d < 1 || d > 31) return null
  const date = new Date(y, m - 1, d)
  // Verify no rollover (e.g. Feb 30 → Mar 2)
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d
  )
    return null
  return date
}

/** Parse yyyy-mm-dd (ISO) string to a Date. */
function parseISODate(str: string): Date | null {
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  const y = Number.parseInt(match[1], 10)
  const m = Number.parseInt(match[2], 10)
  const d = Number.parseInt(match[3], 10)
  if (m < 1 || m > 12 || d < 1 || d > 31) return null
  const date = new Date(y, m - 1, d)
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d
  )
    return null
  return date
}

/** Format date as mm/dd/yyyy */
function formatDisplay(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const y = String(date.getFullYear())
  return `${m}/${d}/${y}`
}

/** Format date as yyyy-mm-dd */
function formatISO(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const y = String(date.getFullYear())
  return `${y}-${m}-${d}`
}

/** Check if two dates represent the same calendar day. */
function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/** Get number of days in a month. */
function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

class FlexDatePickerElement extends HTMLElement {
  private input: HTMLInputElement | null = null
  private toggleBtn: HTMLButtonElement | null = null
  private calendar: HTMLElement | null = null
  private monthLabel: HTMLButtonElement | null = null
  private prevBtn: HTMLButtonElement | null = null
  private nextBtn: HTMLButtonElement | null = null
  private tbody: HTMLTableSectionElement | null = null

  // State
  private viewYear = 0
  private viewMonth = 0 // 0-based
  private selectedDate: Date | null = null
  private focusedDate: Date | null = null
  private minDate: Date | null = null
  private maxDate: Date | null = null
  private monthSelectMode = false

  connectedCallback() {
    this.input = this.querySelector('.flex-date-picker__external-input')
    this.toggleBtn = this.querySelector('.flex-date-picker__button')
    this.calendar = this.querySelector('.flex-date-picker__calendar')
    this.monthLabel = this.querySelector('.flex-date-picker__month-label')
    this.prevBtn = this.querySelector('.flex-date-picker__nav--prev')
    this.nextBtn = this.querySelector('.flex-date-picker__nav--next')
    this.tbody = this.querySelector('.flex-date-picker__table tbody')

    if (!this.input || !this.calendar || !this.tbody) return

    // Parse constraints
    const minAttr = this.dataset.minDate
    const maxAttr = this.dataset.maxDate
    if (minAttr) this.minDate = parseISODate(minAttr)
    if (maxAttr) this.maxDate = parseISODate(maxAttr)

    // Parse default value
    const defaultVal = this.dataset.defaultValue
    if (defaultVal) {
      const parsed = parseISODate(defaultVal)
      if (parsed) {
        this.selectedDate = parsed
        this.input.value = formatDisplay(parsed)
      }
    }

    // Initialize view to selected date or today
    const initDate = this.selectedDate || new Date()
    this.viewYear = initDate.getFullYear()
    this.viewMonth = initDate.getMonth()

    // Event listeners
    this.toggleBtn?.addEventListener('click', this.handleToggleClick)
    this.prevBtn?.addEventListener('click', this.handlePrevClick)
    this.nextBtn?.addEventListener('click', this.handleNextClick)
    this.monthLabel?.addEventListener('click', this.handleMonthLabelClick)
    this.tbody?.addEventListener('click', this.handleDayClick)
    this.input?.addEventListener('change', this.handleInputChange)
    this.calendar?.addEventListener('keydown', this.handleCalendarKeydown)
    document.addEventListener('click', this.handleOutsideClick)
  }

  disconnectedCallback() {
    this.toggleBtn?.removeEventListener('click', this.handleToggleClick)
    this.prevBtn?.removeEventListener('click', this.handlePrevClick)
    this.nextBtn?.removeEventListener('click', this.handleNextClick)
    this.monthLabel?.removeEventListener('click', this.handleMonthLabelClick)
    this.tbody?.removeEventListener('click', this.handleDayClick)
    this.input?.removeEventListener('change', this.handleInputChange)
    this.calendar?.removeEventListener('keydown', this.handleCalendarKeydown)
    document.removeEventListener('click', this.handleOutsideClick)
  }

  private get isOpen(): boolean {
    return this.calendar ? !this.calendar.hasAttribute('hidden') : false
  }

  // --- Open / Close ---

  private open() {
    if (!this.calendar) return
    this.monthSelectMode = false
    this.calendar.removeAttribute('hidden')

    // Set initial focus date: selected > today > clamped to range
    let focusTarget = this.selectedDate || new Date()
    if (this.minDate && focusTarget < this.minDate) {
      focusTarget = new Date(this.minDate)
    }
    if (this.maxDate && focusTarget > this.maxDate) {
      focusTarget = new Date(this.maxDate)
    }
    this.viewYear = focusTarget.getFullYear()
    this.viewMonth = focusTarget.getMonth()
    this.focusedDate = new Date(focusTarget)

    this.renderDays()
    this.focusCurrent()
  }

  private close() {
    if (!this.calendar) return
    this.calendar.setAttribute('hidden', '')
    this.monthSelectMode = false
    this.input?.focus()
  }

  // --- Event handlers ---

  private handleToggleClick = (event: MouseEvent) => {
    event.stopPropagation()
    if (this.isOpen) {
      this.close()
    } else {
      this.open()
    }
  }

  private handlePrevClick = (event: MouseEvent) => {
    event.stopPropagation()
    if (this.monthSelectMode) {
      this.viewYear--
      this.renderMonthSelect()
    } else {
      this.navigateMonth(-1)
    }
  }

  private handleNextClick = (event: MouseEvent) => {
    event.stopPropagation()
    if (this.monthSelectMode) {
      this.viewYear++
      this.renderMonthSelect()
    } else {
      this.navigateMonth(1)
    }
  }

  private handleMonthLabelClick = (event: MouseEvent) => {
    event.stopPropagation()
    this.monthSelectMode = !this.monthSelectMode
    if (this.monthSelectMode) {
      this.renderMonthSelect()
    } else {
      this.renderDays()
      this.focusCurrent()
    }
  }

  private handleDayClick = (event: MouseEvent) => {
    const target = (event.target as Element).closest(
      'button[data-date]',
    ) as HTMLButtonElement | null
    if (!target || target.disabled) return
    event.stopPropagation()
    const dateStr = target.dataset.date
    if (!dateStr) return
    const date = parseISODate(dateStr)
    if (!date) return
    this.selectDate(date)
  }

  private handleInputChange = () => {
    if (!this.input) return
    const parsed = parseDisplayDate(this.input.value)
    if (parsed && this.isInRange(parsed)) {
      this.selectedDate = parsed
      this.viewYear = parsed.getFullYear()
      this.viewMonth = parsed.getMonth()
      this.dispatchDateChange()
    }
  }

  private handleOutsideClick = (event: MouseEvent) => {
    if (!this.contains(event.target as Node) && this.isOpen) {
      this.close()
    }
  }

  private handleCalendarKeydown = (event: KeyboardEvent) => {
    if (this.monthSelectMode) {
      this.handleMonthSelectKeydown(event)
      return
    }
    if (!this.focusedDate) return

    let newDate: Date | null = null

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault()
        newDate = this.addDays(this.focusedDate, -1)
        break
      case 'ArrowRight':
        event.preventDefault()
        newDate = this.addDays(this.focusedDate, 1)
        break
      case 'ArrowUp':
        event.preventDefault()
        newDate = this.addDays(this.focusedDate, -7)
        break
      case 'ArrowDown':
        event.preventDefault()
        newDate = this.addDays(this.focusedDate, 7)
        break
      case 'Home':
        event.preventDefault()
        newDate = this.startOfWeek(this.focusedDate)
        break
      case 'End':
        event.preventDefault()
        newDate = this.endOfWeek(this.focusedDate)
        break
      case 'PageUp':
        event.preventDefault()
        if (event.shiftKey) {
          newDate = this.addYears(this.focusedDate, -1)
        } else {
          newDate = this.addMonths(this.focusedDate, -1)
        }
        break
      case 'PageDown':
        event.preventDefault()
        if (event.shiftKey) {
          newDate = this.addYears(this.focusedDate, 1)
        } else {
          newDate = this.addMonths(this.focusedDate, 1)
        }
        break
      case 'Enter':
        event.preventDefault()
        if (this.focusedDate && this.isInRange(this.focusedDate)) {
          this.selectDate(this.focusedDate)
        }
        return
      case 'Escape':
        event.preventDefault()
        this.close()
        return
    }

    if (newDate && this.isInRange(newDate)) {
      this.focusedDate = newDate
      this.viewYear = newDate.getFullYear()
      this.viewMonth = newDate.getMonth()
      this.renderDays()
      this.focusCurrent()
    }
  }

  private handleMonthSelectKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault()
      this.monthSelectMode = false
      this.renderDays()
      this.focusCurrent()
    }
  }

  // --- Date arithmetic helpers ---

  private addDays(date: Date, days: number): Date {
    const result = new Date(date)
    result.setDate(result.getDate() + days)
    return result
  }

  private addMonths(date: Date, months: number): Date {
    const result = new Date(date)
    const targetMonth = result.getMonth() + months
    result.setMonth(targetMonth)
    // Clamp day if it overflowed (e.g. Jan 31 + 1 month → Feb 28)
    if (result.getMonth() !== ((targetMonth % 12) + 12) % 12) {
      result.setDate(0) // last day of previous month
    }
    return result
  }

  private addYears(date: Date, years: number): Date {
    const result = new Date(date)
    result.setFullYear(result.getFullYear() + years)
    // Handle Feb 29 → Feb 28
    if (result.getMonth() !== date.getMonth()) {
      result.setDate(0)
    }
    return result
  }

  private startOfWeek(date: Date): Date {
    const result = new Date(date)
    result.setDate(result.getDate() - result.getDay())
    return result
  }

  private endOfWeek(date: Date): Date {
    const result = new Date(date)
    result.setDate(result.getDate() + (6 - result.getDay()))
    return result
  }

  private isInRange(date: Date): boolean {
    if (this.minDate && date < this.minDate) return false
    if (this.maxDate && date > this.maxDate) return false
    return true
  }

  // --- Navigation ---

  private navigateMonth(delta: number) {
    this.viewMonth += delta
    if (this.viewMonth > 11) {
      this.viewMonth = 0
      this.viewYear++
    } else if (this.viewMonth < 0) {
      this.viewMonth = 11
      this.viewYear--
    }
    // Update focused date to same day in new month (clamped)
    if (this.focusedDate) {
      const maxDay = daysInMonth(this.viewYear, this.viewMonth)
      const day = Math.min(this.focusedDate.getDate(), maxDay)
      this.focusedDate = new Date(this.viewYear, this.viewMonth, day)
    }
    this.renderDays()
    this.focusCurrent()
  }

  // --- Selection ---

  private selectDate(date: Date) {
    this.selectedDate = date
    if (this.input) {
      this.input.value = formatDisplay(date)
    }
    this.dispatchDateChange()
    this.close()
  }

  private dispatchDateChange() {
    this.dispatchEvent(
      new CustomEvent('date-change', {
        bubbles: true,
        detail: {
          value: this.selectedDate ? formatISO(this.selectedDate) : null,
        },
      }),
    )
  }

  // --- Rendering ---

  private renderDays() {
    if (!this.tbody || !this.monthLabel) return

    // Update header
    this.monthLabel.textContent = `${MONTH_NAMES[this.viewMonth]} ${this.viewYear}`
    this.monthLabel.setAttribute(
      'aria-label',
      `${MONTH_NAMES[this.viewMonth]} ${this.viewYear}. Select month`,
    )

    // Update prev/next button labels
    this.prevBtn?.setAttribute('aria-label', 'Previous month')
    this.nextBtn?.setAttribute('aria-label', 'Next month')

    const today = new Date()
    const firstDay = new Date(this.viewYear, this.viewMonth, 1).getDay() // 0=Sun
    const totalDays = daysInMonth(this.viewYear, this.viewMonth)

    // Build grid: leading blanks, days, trailing blanks
    const cells: { date: Date; inMonth: boolean }[] = []

    // Previous month trailing days
    const prevMonthDays = daysInMonth(
      this.viewMonth === 0 ? this.viewYear - 1 : this.viewYear,
      this.viewMonth === 0 ? 11 : this.viewMonth - 1,
    )
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = new Date(
        this.viewMonth === 0 ? this.viewYear - 1 : this.viewYear,
        this.viewMonth === 0 ? 11 : this.viewMonth - 1,
        prevMonthDays - i,
      )
      cells.push({ date: d, inMonth: false })
    }

    // Current month days
    for (let d = 1; d <= totalDays; d++) {
      cells.push({
        date: new Date(this.viewYear, this.viewMonth, d),
        inMonth: true,
      })
    }

    // Next month leading days to fill last row
    const remaining = 7 - (cells.length % 7)
    if (remaining < 7) {
      for (let d = 1; d <= remaining; d++) {
        const nextMonth = this.viewMonth === 11 ? 0 : this.viewMonth + 1
        const nextYear =
          this.viewMonth === 11 ? this.viewYear + 1 : this.viewYear
        cells.push({
          date: new Date(nextYear, nextMonth, d),
          inMonth: false,
        })
      }
    }

    // Build HTML
    let html = ''
    for (let i = 0; i < cells.length; i++) {
      if (i % 7 === 0) html += '<tr>'
      const cell = cells[i]
      const iso = formatISO(cell.date)
      const isToday = sameDay(cell.date, today)
      const isSelected =
        this.selectedDate && sameDay(cell.date, this.selectedDate)
      const isFocused = this.focusedDate && sameDay(cell.date, this.focusedDate)
      const disabled = !this.isInRange(cell.date) || !cell.inMonth

      const classes = ['flex-date-picker__day']
      if (!cell.inMonth) classes.push('flex-date-picker__day--outside')
      if (isToday) classes.push('flex-date-picker__day--today')
      if (isSelected) classes.push('flex-date-picker__day--selected')
      if (isFocused) classes.push('flex-date-picker__day--focused')

      html += '<td>'
      html += `<button type="button" class="${classes.join(' ')}" data-date="${iso}"`
      html += ` aria-label="${MONTH_NAMES[cell.date.getMonth()]} ${cell.date.getDate()}, ${cell.date.getFullYear()}"`
      if (isSelected) html += ' aria-current="date"'
      if (disabled) html += ' disabled'
      if (isFocused) html += ' tabindex="0"'
      else html += ' tabindex="-1"'
      html += `>${cell.date.getDate()}</button>`
      html += '</td>'
      if (i % 7 === 6) html += '</tr>'
    }
    this.tbody.innerHTML = html
  }

  private renderMonthSelect() {
    if (!this.tbody || !this.monthLabel) return

    // Update header for month selection
    this.monthLabel.textContent = `${this.viewYear}`
    this.monthLabel.setAttribute(
      'aria-label',
      `${this.viewYear}. Return to calendar`,
    )
    this.prevBtn?.setAttribute('aria-label', 'Previous year')
    this.nextBtn?.setAttribute('aria-label', 'Next year')

    let html = ''
    for (let i = 0; i < 12; i++) {
      if (i % 3 === 0) html += '<tr>'
      const isCurrentMonth = i === this.viewMonth
      const classes = ['flex-date-picker__month-option']
      if (isCurrentMonth)
        classes.push('flex-date-picker__month-option--selected')
      html += `<td colspan="1"><button type="button" class="${classes.join(' ')}" data-month="${i}" tabindex="${isCurrentMonth ? '0' : '-1'}">${MONTH_ABBR[i]}</button></td>`
      if (i % 3 === 2) html += '</tr>'
    }
    this.tbody.innerHTML = html

    // Add click handler for month selection
    const buttons =
      this.tbody.querySelectorAll<HTMLButtonElement>('[data-month]')
    for (const btn of buttons) {
      btn.addEventListener('click', (event: MouseEvent) => {
        event.stopPropagation()
        const month = Number.parseInt(btn.dataset.month || '0', 10)
        this.viewMonth = month
        this.monthSelectMode = false
        // Update focused date
        if (this.focusedDate) {
          const maxDay = daysInMonth(this.viewYear, this.viewMonth)
          const day = Math.min(this.focusedDate.getDate(), maxDay)
          this.focusedDate = new Date(this.viewYear, this.viewMonth, day)
        }
        this.renderDays()
        this.focusCurrent()
      })
    }
  }

  private focusCurrent() {
    if (!this.tbody) return
    const focused =
      this.tbody.querySelector<HTMLButtonElement>('[tabindex="0"]')
    focused?.focus()
  }

  // --- Public API for date-range-picker coordination ---

  getSelectedDate(): string | null {
    return this.selectedDate ? formatISO(this.selectedDate) : null
  }

  setMinDate(iso: string | null) {
    this.minDate = iso ? parseISODate(iso) : null
    if (this.isOpen) {
      this.renderDays()
    }
  }

  setMaxDate(iso: string | null) {
    this.maxDate = iso ? parseISODate(iso) : null
    if (this.isOpen) {
      this.renderDays()
    }
  }
}

if (!customElements.get('flex-date-picker')) {
  customElements.define('flex-date-picker', FlexDatePickerElement)
}
