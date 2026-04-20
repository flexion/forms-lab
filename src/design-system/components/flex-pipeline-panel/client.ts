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

interface PendingProposal {
  commands: Array<{ kind: string; [key: string]: unknown }>
  explanation: string
  groupId?: string
}

class FlexPipelinePanel extends HTMLElement {
  private state: PipelineState | null = null
  private loading = false
  private error: string | null = null
  private pendingProposal: PendingProposal | null = null

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

    let body = ''

    if (this.error) {
      body += `<div class="pipeline-panel__error">${this.error}</div>`
    }

    if (this.pendingProposal) {
      body += this.renderProposal(this.pendingProposal)
    } else if (this.loading) {
      body += `<div class="pipeline-panel__loading"><span class="pipeline-panel__spinner"></span> Working...</div>`
    } else if (stage === 'criteria' && criteria.criteria.length === 0) {
      body += `<button type="button" class="flex-button" data-action="analyze-criteria">Analyze Corpus</button>
        <p class="pipeline-panel__hint">Extract evaluation criteria from the SNAP policy corpus.</p>`
    } else if (stage === 'criteria') {
      const approvedCount = criteria.criteria.filter(
        (c) => c.status === 'approved',
      ).length
      const totalCount = criteria.criteria.filter(
        (c) => c.status !== 'rejected',
      ).length
      body += `<p class="pipeline-panel__hint">${approvedCount} of ${totalCount} criteria approved</p>`
      body += `<ul class="pipeline-panel__criteria-list">`
      for (const c of criteria.criteria) {
        if (c.status === 'rejected') continue
        body += `<li class="pipeline-panel__criterion" data-status="${c.status}">
          <span class="pipeline-panel__criterion-text">${c.text}</span>
          <span class="pipeline-panel__criterion-source">${c.source}</span>
          ${
            c.status === 'pending'
              ? `<span class="pipeline-panel__criterion-actions">
              <button type="button" data-action="approve-criterion" data-id="${c.id}" title="Approve">\u2713</button>
              <button type="button" data-action="reject-criterion" data-id="${c.id}" title="Reject">\u2717</button>
            </span>`
              : ''
          }
        </li>`
      }
      body += `</ul>`
      body += `<button type="button" class="flex-button" data-action="approve-all">Approve All & Continue</button>`
    } else if (stage === 'structure') {
      body += `<button type="button" class="flex-button" data-action="plan-structure">Generate Structure</button>
        <p class="pipeline-panel__hint">Create pages and groups from approved criteria.</p>`
    } else if (stage === 'sections') {
      if (groups.length === 0) {
        body += `<p class="pipeline-panel__hint">No groups yet. Generate structure first.</p>`
      } else {
        body += `<p class="pipeline-panel__hint">Generate fields per section:</p>`
        body += `<ul class="pipeline-panel__section-list">`
        for (const g of groups) {
          const btnLabel =
            g.fieldCount > 0
              ? `Regenerate (${g.fieldCount} fields)`
              : 'Generate fields'
          body += `<li class="pipeline-panel__section-item">
            <span>${g.title}</span>
            <button type="button" class="flex-button" data-variant="outline" data-size="sm" data-action="generate-section" data-group-id="${g.id}" data-group-title="${g.title}">${btnLabel}</button>
          </li>`
        }
        body += `</ul>`
      }
    }

    const stageLabel = {
      criteria: 'Criteria',
      structure: 'Structure',
      sections: 'Sections',
      complete: 'Complete',
    }[stage]

    this.innerHTML = `<div class="pipeline-panel">
      <div class="pipeline-panel__header">
        <span class="pipeline-panel__title">Pipeline</span>
        <span class="pipeline-panel__badge" data-stage="${stage}">${stageLabel}</span>
      </div>
      <div class="pipeline-panel__body">${body}</div>
    </div>`
    this.bindHandlers()
  }

  private renderProposal(proposal: PendingProposal): string {
    const commandsList = proposal.commands
      .map((cmd) => `<li>${this.humanizeCommand(cmd)}</li>`)
      .join('')
    return `
      <div class="pipeline-panel__proposal">
        <p class="pipeline-panel__proposal-summary">${proposal.explanation}</p>
        <ul class="pipeline-panel__proposal-commands">${commandsList}</ul>
        <div class="pipeline-panel__proposal-actions">
          <button type="button" class="flex-button" data-action="accept-proposal">Accept (${proposal.commands.length} changes)</button>
          <button type="button" class="flex-button" data-variant="outline" data-action="discard-proposal">Discard</button>
        </div>
      </div>
    `
  }

  private humanizeCommand(cmd: Record<string, unknown>): string {
    switch (cmd.kind) {
      case 'addPage':
        return `Add page: "${cmd.title}"`
      case 'addGroup':
        return `Add group: "${cmd.title}"`
      case 'addField':
        return `Add field: "${cmd.label}" (${cmd.fieldType}${cmd.required ? ', required' : ''})`
      case 'setFieldSensitivity':
        return `Set sensitivity: ${cmd.level} on "${cmd.id}"`
      case 'relabelField':
        return `Relabel: "${cmd.label}"`
      case 'setRequired':
        return `Set ${cmd.required ? 'required' : 'optional'}: "${cmd.id}"`
      case 'setFieldCondition':
        return `Set condition on "${cmd.id}"`
      default:
        return `${cmd.kind}: ${JSON.stringify(cmd).slice(0, 60)}`
    }
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
      if (action === 'accept-proposal') this.acceptProposal()
      if (action === 'discard-proposal') this.discardProposal()
    })
  }

  private async analyzeCriteria() {
    if (!this.state) return
    this.setLoading(true)
    const res = await fetch(
      `${this.state.editBase}/authoring/analyze-criteria`,
      { method: 'POST' },
    )
    if (res.ok) {
      this.error = null
      await this.refreshState()
    } else {
      const data = await res
        .json()
        .catch(() => ({ error: `HTTP ${res.status}` }))
      this.error = data.error ?? `Request failed (${res.status})`
      this.setLoading(false)
    }
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
    else this.showError(res)
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
      this.pendingProposal = {
        commands: data.commands,
        explanation: data.explanation,
      }
      this.loading = false
      this.error = null
      this.render()
    } else {
      await this.showError(res)
    }
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
      this.pendingProposal = {
        commands: data.commands,
        explanation: data.explanation,
        groupId,
      }
      this.loading = false
      this.error = null
      this.render()
    } else {
      await this.showError(res)
    }
  }

  private acceptProposal() {
    if (!this.pendingProposal) return
    this.dispatchEvent(
      new CustomEvent('formeditor:stage-batch', {
        detail: {
          commands: this.pendingProposal.commands,
          summary: this.pendingProposal.explanation,
          source: 'llm',
        },
        bubbles: true,
        composed: true,
      }),
    )
    this.pendingProposal = null
    this.refreshState()
  }

  private discardProposal() {
    this.pendingProposal = null
    this.render()
  }

  private async showError(res: Response) {
    const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
    this.error = data.error ?? `Request failed (${res.status})`
    this.setLoading(false)
  }

  private async refreshState() {
    if (!this.state) return
    const res = await fetch(`${this.state.editBase}/authoring/stage`)
    if (res.ok) {
      const data = await res.json()
      this.state = { ...this.state, ...data }
    }
    this.loading = false
    this.error = null
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
