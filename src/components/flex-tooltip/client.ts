type Position = 'top' | 'bottom' | 'left' | 'right'

class FlexTooltipElement extends HTMLElement {
  private trigger: HTMLElement | null = null
  private body: HTMLElement | null = null

  connectedCallback() {
    this.trigger = this.querySelector('.flex-tooltip__trigger')
    this.body = this.querySelector('.flex-tooltip__body')

    if (!this.trigger || !this.body) return

    this.trigger.addEventListener('mouseenter', this.show)
    this.trigger.addEventListener('mouseleave', this.hide)
    this.trigger.addEventListener('focusin', this.show)
    this.trigger.addEventListener('focusout', this.hide)
  }

  disconnectedCallback() {
    this.trigger?.removeEventListener('mouseenter', this.show)
    this.trigger?.removeEventListener('mouseleave', this.hide)
    this.trigger?.removeEventListener('focusin', this.show)
    this.trigger?.removeEventListener('focusout', this.hide)
  }

  private get position(): Position {
    return (this.dataset.position as Position) || 'top'
  }

  private show = () => {
    if (!this.body || !this.trigger) return
    this.body.setAttribute('data-visible', '')
    this.positionTooltip()
  }

  private hide = () => {
    if (!this.body) return
    this.body.removeAttribute('data-visible')
    this.body.removeAttribute('data-position-actual')
  }

  private positionTooltip() {
    if (!this.body || !this.trigger) return

    const triggerRect = this.trigger.getBoundingClientRect()
    const bodyRect = this.body.getBoundingClientRect()
    const position = this.resolvePosition(triggerRect, bodyRect)

    this.body.setAttribute('data-position-actual', position)

    // Reset any inline positioning
    this.body.style.top = ''
    this.body.style.bottom = ''
    this.body.style.left = ''
    this.body.style.right = ''

    // Calculate offset relative to the trigger within this positioned container
    const gap = 8 // arrow size + spacing

    switch (position) {
      case 'top':
        this.body.style.bottom = `${this.trigger.offsetHeight + gap}px`
        this.body.style.left = `${(this.trigger.offsetWidth - bodyRect.width) / 2}px`
        break
      case 'bottom':
        this.body.style.top = `${this.trigger.offsetHeight + gap}px`
        this.body.style.left = `${(this.trigger.offsetWidth - bodyRect.width) / 2}px`
        break
      case 'left':
        this.body.style.top = `${(this.trigger.offsetHeight - bodyRect.height) / 2}px`
        this.body.style.right = `${this.trigger.offsetWidth + gap}px`
        break
      case 'right':
        this.body.style.top = `${(this.trigger.offsetHeight - bodyRect.height) / 2}px`
        this.body.style.left = `${this.trigger.offsetWidth + gap}px`
        break
    }
  }

  private resolvePosition(triggerRect: DOMRect, bodyRect: DOMRect): Position {
    const preferred = this.position
    const gap = 8

    const fits: Record<Position, boolean> = {
      top: triggerRect.top - bodyRect.height - gap >= 0,
      bottom: triggerRect.bottom + bodyRect.height + gap <= window.innerHeight,
      left: triggerRect.left - bodyRect.width - gap >= 0,
      right: triggerRect.right + bodyRect.width + gap <= window.innerWidth,
    }

    if (fits[preferred]) return preferred

    // Flip to opposite
    const opposite: Record<Position, Position> = {
      top: 'bottom',
      bottom: 'top',
      left: 'right',
      right: 'left',
    }
    if (fits[opposite[preferred]]) return opposite[preferred]

    // Fall through to any that fits
    for (const pos of ['top', 'bottom', 'left', 'right'] as Position[]) {
      if (fits[pos]) return pos
    }

    return preferred
  }
}

if (!customElements.get('flex-tooltip')) {
  customElements.define('flex-tooltip', FlexTooltipElement)
}
