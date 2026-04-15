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

      const resetButton = () => {
        submitBtn.textContent = originalText
        submitBtn.disabled = false
      }

      try {
        const response = await fetch(form.action, {
          method: 'POST',
          body: new FormData(form),
          redirect: 'follow',
        })

        const html = await response.text()
        const parser = new DOMParser()
        const doc = parser.parseFromString(html, 'text/html')
        const newEditor = doc.querySelector('.form-editor')

        if (newEditor) {
          const currentEditor = document.querySelector('.form-editor')
          currentEditor?.replaceWith(newEditor)
          // If the new editor has an error alert, scroll it into view
          const alert = document.querySelector(
            '.form-editor .flex-alert[data-variant="error"]',
          )
          if (alert) {
            alert.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        } else {
          // Response didn't contain an editor — fall back to full reload
          window.location.reload()
        }
      } catch (err) {
        resetButton()
        alert(
          `Request failed: ${err instanceof Error ? err.message : String(err)}`,
        )
      }
    })
  }
}

if (!customElements.get('flex-intent-input')) {
  customElements.define('flex-intent-input', FlexIntentInput)
}
