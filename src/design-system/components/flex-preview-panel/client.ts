class FlexPreviewPanel extends HTMLElement {
  connectedCallback() {
    this.reload()
  }

  reload() {
    const iframe = this.querySelector('iframe')
    const src = this.dataset.src
    if (iframe && src) {
      iframe.src = src
    }
  }

  static get observedAttributes() {
    return ['data-src']
  }

  attributeChangedCallback() {
    this.reload()
  }
}

if (!customElements.get('flex-preview-panel')) {
  customElements.define('flex-preview-panel', FlexPreviewPanel)
}
