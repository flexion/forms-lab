export class FlexCriteriaEditor extends HTMLElement {
  connectedCallback() {
    this.addEventListener('click', this.handleClick.bind(this))
  }

  private handleClick(e: Event) {
    const target = e.target as HTMLElement
    const action = target.closest('[data-action]')?.getAttribute('data-action')
    if (!action) return

    const editBase = this.dataset.editBase ?? ''

    if (action === 'approve' || action === 'reject') {
      const criterionId = target
        .closest('[data-criterion-id]')
        ?.getAttribute('data-criterion-id')
      if (!criterionId) return
      this.updateCriteria(editBase, {
        approve: action === 'approve' ? [criterionId] : [],
        reject: action === 'reject' ? [criterionId] : [],
        add: [],
        edit: [],
      })
    }

    if (action === 'approve-all') {
      this.approveCriteria(editBase)
    }

    if (action === 'add-criterion') {
      this.promptAddCriterion(editBase)
    }
  }

  private async updateCriteria(
    editBase: string,
    edits: {
      approve: string[]
      reject: string[]
      add: Array<{ text: string; source: string }>
      edit: never[]
    },
  ) {
    const res = await fetch(`${editBase}/authoring/update-criteria`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(edits),
    })
    if (res.ok) window.location.reload()
  }

  private async approveCriteria(editBase: string) {
    const res = await fetch(`${editBase}/authoring/approve-criteria`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    })
    if (res.ok) window.location.reload()
  }

  private promptAddCriterion(editBase: string) {
    const text = prompt('Criterion text:')
    if (!text) return
    const source = prompt('Regulatory citation:') ?? ''
    this.updateCriteria(editBase, {
      approve: [],
      reject: [],
      add: [{ text, source }],
      edit: [],
    })
  }
}

if (!customElements.get('flex-criteria-editor')) {
  customElements.define('flex-criteria-editor', FlexCriteriaEditor)
}
