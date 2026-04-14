class FlexIntentInput extends HTMLElement {
  connectedCallback() {
    const form = this.querySelector('form')
    if (!form) return

    form.addEventListener('submit', async (e) => {
      e.preventDefault()
      const submitBtn = form.querySelector(
        'button[type="submit"]',
      ) as HTMLButtonElement
      const originalText = submitBtn.textContent
      submitBtn.textContent = 'Thinking...'
      submitBtn.disabled = true

      try {
        const response = await fetch(form.action, {
          method: 'POST',
          body: new FormData(form),
        })

        if (response.ok) {
          const html = await response.text()
          const parser = new DOMParser()
          const doc = parser.parseFromString(html, 'text/html')
          const newEditor = doc.querySelector('.form-editor')
          if (newEditor) {
            const currentEditor = document.querySelector('.form-editor')
            currentEditor?.replaceWith(newEditor)
          } else {
            window.location.reload()
          }
        }
      } catch {
        submitBtn.textContent = originalText
        submitBtn.disabled = false
      }
    })
  }
}

if (!customElements.get('flex-intent-input')) {
  customElements.define('flex-intent-input', FlexIntentInput)
}
