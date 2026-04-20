// flex-pipeline-panel: RAG authoring pipeline status and action controls

interface PipelineState {
  stage: 'criteria' | 'structure' | 'sections' | 'complete'
  criteria: {
    criteria: Array<{
      id: string
      text: string
      source: string
      status: string
    }>
    approvedAt: string | null
  }
  editBase: string
  groups: Array<{ id: string; title: string; fieldCount: number }>
}

class FlexPipelinePanel extends HTMLElement {
  private state: PipelineState | null = null
  private loading = false

  connectedCallback() {
    const script = this.querySelector('script[data-pipeline-state]')
    if (script) {
      this.state = JSON.parse(script.textContent ?? '{}')
    }
    this.render()
  }

  private render() {
    if (!this.state) {
      this.innerHTML = ''
      return
    }

    const { stage, criteria, groups } = this.state
    let content = ''

    // Header with stage indicator
    content += `<div class="pipeline-panel__header">
      <span class="pipeline-panel__title">Authoring Pipeline</span>
      <span class="pipeline-panel__stage" data-stage="${stage}">${this.stageLabel(stage)}</span>
    </div>`

    if (this.loading) {
      content += `<div class="pipeline-panel__loading">Working...</div>`
    } else if (stage === 'criteria' && criteria.criteria.length === 0) {
      content += `<div class="pipeline-panel__action">
        <p class="pipeline-panel__description">Analyze the SNAP policy corpus to generate evaluation criteria.</p>
        <button type="button" class="flex-button" data-action="analyze-criteria">Analyze Corpus</button>
      </div>`
    } else if (stage === 'criteria') {
      content += `<div class="pipeline-panel__criteria">`
      content += `<ul class="pipeline-panel__criteria-list">`
      for (const c of criteria.criteria) {
        if (c.status === 'rejected') continue
        content += `<li class="pipeline-panel__criterion" data-status="${c.status}">
          <span class="pipeline-panel__criterion-text">${c.text}</span>
          <span class="pipeline-panel__criterion-source">${c.source}</span>
          ${
            c.status === 'pending'
              ? `<span class="pipeline-panel__criterion-actions">
            <button type="button" data-action="approve-criterion" data-id="${c.id}" title="Approve">&#x2713;</button>
            <button type="button" data-action="reject-criterion" data-id="${c.id}" title="Reject">&#x2717;</button>
          </span>`
              : ''
          }
        </li>`
      }
      content += `</ul>`
      content += `<button type="button" class="flex-button" data-action="approve-all">Approve All &amp; Continue</button>`
      content += `</div>`
    } else if (stage === 'structure') {
      content += `<div class="pipeline-panel__action">
        <p class="pipeline-panel__description">Generate page and group structure from approved criteria.</p>
        <button type="button" class="flex-button" data-action="plan-structure">Generate Structure</button>
      </div>`
    } else if (stage === 'sections') {
      const uncovered = groups.filter((g) => g.fieldCount === 0)
      if (uncovered.length === 0) {
        content += `<div class="pipeline-panel__action"><p>All sections populated. Save to advance.</p></div>`
      } else {
        content += `<div class="pipeline-panel__sections">`
        content += `<p class="pipeline-panel__description">${uncovered.length} section${uncovered.length > 1 ? 's' : ''} need fields:</p>`
        content += `<ul class="pipeline-panel__section-list">`
        for (const g of uncovered) {
          content += `<li class="pipeline-panel__section-item">
            <span>${g.title}</span>
            <button type="button" class="flex-button" data-variant="outline" data-action="generate-section" data-group-id="${g.id}" data-group-title="${g.title}">Generate</button>
          </li>`
        }
        content += `</ul>`
        content += `</div>`
      }
    } else if (stage === 'complete') {
      content += `<div class="pipeline-panel__complete">
        <span class="pipeline-panel__check">&#x2713;</span>
        <span>Pipeline complete</span>
      </div>`
    }

    this.innerHTML = `<div class="pipeline-panel">${content}</div>`
    this.bindHandlers()
  }

  private stageLabel(stage: string): string {
    const labels: Record<string, string> = {
      criteria: 'Criteria',
      structure: 'Structure',
      sections: 'Sections',
      complete: 'Complete',
    }
    return labels[stage] ?? stage
  }

  private bindHandlers() {
    this.addEventListener('click', async (e) => {
      const target = e.target as HTMLElement
      const btn = target.closest<HTMLElement>('[data-action]')
      if (!btn || this.loading) return
      const action = btn.dataset.action

      if (action === 'analyze-criteria') await this.analyzeCriteria()
      if (action === 'approve-all') await this.approveCriteria()
      if (action === 'approve-criterion' && btn.dataset.id)
        await this.approveSingleCriterion(btn.dataset.id)
      if (action === 'reject-criterion' && btn.dataset.id)
        await this.rejectSingleCriterion(btn.dataset.id)
      if (action === 'plan-structure') await this.planStructure()
      if (
        action === 'generate-section' &&
        btn.dataset.groupId &&
        btn.dataset.groupTitle
      )
        await this.generateSection(btn.dataset.groupId, btn.dataset.groupTitle)
    })
  }

  private async analyzeCriteria() {
    if (!this.state) return
    this.setLoading(true)
    const res = await fetch(
      `${this.state.editBase}/authoring/analyze-criteria`,
      { method: 'POST' },
    )
    if (res.ok) await this.refreshState()
    else this.setLoading(false)
  }

  private async approveCriteria() {
    if (!this.state) return
    this.setLoading(true)
    const res = await fetch(
      `${this.state.editBase}/authoring/approve-criteria`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      },
    )
    if (res.ok) await this.refreshState()
    else this.setLoading(false)
  }

  private async approveSingleCriterion(id: string) {
    if (!this.state) return
    this.setLoading(true)
    await fetch(`${this.state.editBase}/authoring/update-criteria`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approve: [id], reject: [], add: [], edit: [] }),
    })
    await this.refreshState()
  }

  private async rejectSingleCriterion(id: string) {
    if (!this.state) return
    this.setLoading(true)
    await fetch(`${this.state.editBase}/authoring/update-criteria`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approve: [], reject: [id], add: [], edit: [] }),
    })
    await this.refreshState()
  }

  private async planStructure() {
    if (!this.state) return
    this.setLoading(true)
    const res = await fetch(`${this.state.editBase}/authoring/plan-structure`, {
      method: 'POST',
    })
    if (res.ok) {
      const data = await res.json()
      this.dispatchEvent(
        new CustomEvent('formeditor:stage-batch', {
          detail: {
            commands: data.commands,
            summary: data.explanation,
            source: 'llm',
          },
          bubbles: true,
          composed: true,
        }),
      )
    }
    await this.refreshState()
  }

  private async generateSection(groupId: string, groupTitle: string) {
    if (!this.state) return
    this.setLoading(true)
    const res = await fetch(
      `${this.state.editBase}/authoring/generate-section`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId, groupTitle }),
      },
    )
    if (res.ok) {
      const data = await res.json()
      this.dispatchEvent(
        new CustomEvent('formeditor:stage-batch', {
          detail: {
            commands: data.commands,
            summary: data.explanation,
            source: 'llm',
          },
          bubbles: true,
          composed: true,
        }),
      )
    }
    await this.refreshState()
  }

  private async refreshState() {
    if (!this.state) return
    const res = await fetch(`${this.state.editBase}/authoring/stage`)
    if (res.ok) {
      const data = await res.json()
      this.state = { ...this.state, ...data }
    }
    this.loading = false
    this.render()
  }

  private setLoading(loading: boolean) {
    this.loading = loading
    this.render()
  }
}

if (!customElements.get('flex-pipeline-panel')) {
  customElements.define('flex-pipeline-panel', FlexPipelinePanel)
}
