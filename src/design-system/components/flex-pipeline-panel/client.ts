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
  }

  private get editBase(): string {
    return this.state?.editBase ?? ''
  }

  private get currentSha(): string {
    return (
      this.closest('flex-form-editor')?.getAttribute('data-current-sha') ?? ''
    )
  }

  private set currentSha(sha: string) {
    this.closest('flex-form-editor')?.setAttribute('data-current-sha', sha)
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
        <p class="pipeline-panel__hint">Analyzes policy corpus, generates criteria, then builds complete form structure and fields automatically.</p>`
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
    this.progressLog = []

    // Step 1: Analyze if needed
    if (this.state.criteria.criteria.length === 0) {
      await this.log('Analyzing policy corpus (this takes ~15s)...')
      const res = await this.post('/authoring/analyze-criteria')
      if (!res.ok) return this.abort(res, 'Corpus analysis failed')
      await this.log('Criteria generated.')
      await this.refreshState()
    }

    // Step 2: Approve if needed
    if (!this.state!.criteria.approvedAt) {
      await this.log('Approving criteria...')
      const res = await this.post('/authoring/approve-criteria', {})
      if (!res.ok) return this.abort(res, 'Criteria approval failed')
      await this.log('Criteria approved.')
      await this.refreshState()
    }

    // Step 3: Generate structure
    await this.log('Generating page/group structure (~20s)...')
    const structRes = await this.post('/authoring/plan-structure')
    if (!structRes.ok)
      return this.abort(structRes, 'Structure generation failed')

    const structData = await structRes.json()
    if (structData.commands.length > 0) {
      const pages = structData.commands.filter(
        (c: { kind: string }) => c.kind === 'addPage',
      ).length
      const groups = structData.commands.filter(
        (c: { kind: string }) => c.kind === 'addGroup',
      ).length
      await this.log(`Structure: ${pages} pages, ${groups} groups. Saving...`)
      await this.saveCommands(structData.commands, structData.explanation)
    }

    // Step 4: Generate fields for each uncovered section
    await this.log('Generating fields for all sections...')
    await this.refreshState()

    const uncovered = (this.state?.groups ?? []).filter(
      (g) => g.fieldCount === 0,
    )
    for (let i = 0; i < uncovered.length; i++) {
      const group = uncovered[i]
      await this.log(`  ${group.title} (${i + 1}/${uncovered.length})...`)

      const res = await this.post('/authoring/generate-section', {
        groupId: group.id,
        groupTitle: group.title,
      })

      if (!res.ok) {
        await this.log('    Failed, skipping.')
        continue
      }

      const data = await res.json()
      if (data.commands.length > 0) {
        const fields = data.commands.filter(
          (c: { kind: string }) => c.kind === 'addField',
        ).length
        await this.log(`    ${fields} fields. Saving...`)
        await this.saveCommands(data.commands, data.explanation)
      }
    }

    await this.log('Done! Reloading...')
    setTimeout(() => window.location.reload(), 800)
  }

  private async post(path: string, body?: unknown): Promise<Response> {
    const opts: RequestInit = { method: 'POST' }
    if (body !== undefined) {
      opts.headers = { 'Content-Type': 'application/json' }
      opts.body = JSON.stringify(body)
    }
    return fetch(`${this.editBase}${path}`, opts)
  }

  private async saveCommands(
    commands: unknown[],
    explanation: string,
  ): Promise<void> {
    const res = await fetch(`${this.editBase}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commands,
        parentSha: this.currentSha,
        summary: explanation,
        source: 'llm',
      }),
    })
    if (res.ok) {
      const data = await res.json()
      this.currentSha = data.sha
    }
  }

  private async refreshState() {
    const res = await fetch(`${this.editBase}/authoring/stage`)
    if (res.ok) {
      const data = await res.json()
      if (this.state) this.state = { ...this.state, ...data }
    }
  }

  private async log(msg: string) {
    this.progressLog.push(msg)
    this.render()
    await new Promise((r) => setTimeout(r, 0))
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
