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
  settingsUrl?: string
  groups: Array<{ id: string; title: string; fieldCount: number }>
  corpus: Array<{ source: string; title: string }>
}

class FlexPipelinePanel extends HTMLElement {
  private state: PipelineState | null = null
  private running = false
  private progressLog: string[] = []
  private error: string | null = null

  connectedCallback() {
    const script = this.querySelector('script[data-pipeline-state]')
    if (script) {
      this.state = JSON.parse(script.textContent ?? '{}')
    }
    this.render()
    // Check if a build is already running
    this.checkExistingBuild()
  }

  private async checkExistingBuild() {
    if (!this.state) return
    const res = await fetch(`${this.editBase}/authoring/build-status`)
    if (!res.ok) return
    const data = await res.json()
    if (data.status === 'running') {
      this.running = true
      this.progressLog = data.log ?? []
      this.render()
      await this.pollBuildStatus()
    }
  }

  private get editBase(): string {
    return this.state?.editBase ?? ''
  }

  private render() {
    if (!this.state) {
      this.innerHTML = ''
      return
    }

    const { stage, criteria } = this.state
    const stages = ['criteria', 'structure', 'sections']
    const stageIndex = stages.indexOf(stage)
    const dots = stages
      .map(
        (_, i) =>
          `<span class="pipeline-panel__dot" data-state="${i < stageIndex ? 'complete' : i === stageIndex ? 'current' : 'future'}"></span>`,
      )
      .join('')
    const stageLabel =
      {
        criteria: 'Criteria',
        structure: 'Structure',
        sections: 'Sections',
        complete: 'Complete',
      }[stage] ?? stage

    let body = ''

    if (this.error) {
      body += `<div class="pipeline-panel__error">${this.error}<button type="button" class="pipeline-panel__dismiss" data-action="dismiss-error">\u00d7</button></div>`
    }

    if (this.running) {
      body += `<div class="pipeline-panel__progress">`
      body += `<div class="pipeline-panel__loading"><span class="pipeline-panel__spinner"></span> Building form...</div>`
      if (this.progressLog.length > 0) {
        body += `<ul class="pipeline-panel__log">`
        for (const msg of this.progressLog) {
          body += `<li>${msg}</li>`
        }
        body += `</ul>`
      }
      body += `</div>`
    } else if (criteria.criteria.length === 0) {
      body += `<button type="button" class="flex-button" data-action="build-form">Build Form from Corpus</button>
        <p class="pipeline-panel__hint">Analyzes policy corpus, generates criteria, then builds complete form structure and fields automatically.</p>
        <a href="${this.state.settingsUrl ?? '/settings/variants'}" class="pipeline-panel__settings-link">Configure models \u2192</a>`
    } else if (criteria.approvedAt === null) {
      body += `<p>${criteria.criteria.length} criteria ready for review (see sidebar).</p>
        <button type="button" class="flex-button" data-action="build-form">Approve & Build Form</button>
        <p class="pipeline-panel__hint">Approves all criteria and generates the full form structure with fields.</p>`
    } else {
      const { groups } = this.state
      const uncovered = groups.filter((g) => g.fieldCount === 0).length
      if (uncovered > 0) {
        body += `<p>${uncovered} of ${groups.length} sections need fields.</p>
          <button type="button" class="flex-button" data-action="build-form">Generate All Fields</button>`
      } else if (groups.length > 0) {
        body += `<p>Form complete: ${groups.length} sections with fields.</p>
          <button type="button" class="flex-button" data-variant="outline" data-action="build-form">Rebuild Form</button>
          <p class="pipeline-panel__hint">Re-generates structure and fields from criteria.</p>`
      } else {
        body += `<button type="button" class="flex-button" data-action="build-form">Build Structure & Fields</button>`
      }
    }

    this.innerHTML = `<div class="pipeline-panel">
      <div class="pipeline-panel__header">
        <span class="pipeline-panel__title">Pipeline</span>
        <span class="pipeline-panel__dots">${dots}</span>
        <span class="pipeline-panel__stage-label">${stageLabel}</span>
      </div>
      <div class="pipeline-panel__body">${body}</div>
    </div>`
    this.bindHandlers()
  }

  private bindHandlers() {
    this.addEventListener('click', async (e) => {
      const target = e.target as HTMLElement
      const btn = target.closest<HTMLElement>('[data-action]')
      if (!btn || this.running) return
      const action = btn.dataset.action
      if (action === 'build-form') await this.buildForm()
      if (action === 'dismiss-error') {
        this.error = null
        this.render()
      }
    })
  }

  private async buildForm() {
    if (!this.state) return
    this.running = true
    this.error = null
    this.progressLog = ['Starting build...']
    this.render()
    await new Promise((r) => setTimeout(r, 0))

    // Kick off server-side build
    const res = await this.post('/authoring/build')
    if (!res.ok) {
      return this.abort(res, 'Failed to start build')
    }

    // Poll for status
    await this.pollBuildStatus()
  }

  private async pollBuildStatus() {
    while (true) {
      await new Promise((r) => setTimeout(r, 2000))

      const res = await fetch(`${this.editBase}/authoring/build-status`)
      if (!res.ok) continue

      const data = await res.json()
      this.progressLog = data.log ?? []
      this.render()
      await new Promise((r) => setTimeout(r, 0))

      if (data.status === 'done') {
        this.running = false
        this.innerHTML = `<div class="pipeline-panel">
          <div class="pipeline-panel__header">
            <span class="pipeline-panel__title">Pipeline</span>
          </div>
          <div class="pipeline-panel__body">
            <p>Form generation complete.</p>
            <ul class="pipeline-panel__log">${this.progressLog.map((m) => `<li>${m}</li>`).join('')}</ul>
            <button type="button" class="flex-button" onclick="window.location.reload()">Reload to see form</button>
          </div>
        </div>`
        return
      }

      if (data.status === 'error') {
        this.error = data.error ?? 'Build failed'
        this.running = false
        this.render()
        return
      }
    }
  }

  private async post(path: string, body?: unknown): Promise<Response> {
    const opts: RequestInit = { method: 'POST' }
    if (body !== undefined) {
      opts.headers = { 'Content-Type': 'application/json' }
      opts.body = JSON.stringify(body)
    }
    return fetch(`${this.editBase}${path}`, opts)
  }

  private async abort(res: Response, context: string) {
    const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
    this.error = `${context}: ${data.error ?? 'Unknown error'}`
    this.running = false
    this.render()
  }
}

if (!customElements.get('flex-pipeline-panel')) {
  customElements.define('flex-pipeline-panel', FlexPipelinePanel)
}
