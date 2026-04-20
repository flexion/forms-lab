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
        body += `<p>Form built: ${groups.length} sections with fields.</p>
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
    this.render()

    const { criteria } = this.state

    // Step 1: Analyze if needed
    if (criteria.criteria.length === 0) {
      this.progressLog.push('Analyzing policy corpus...')
      this.render()
      const res = await fetch(
        `${this.state.editBase}/authoring/analyze-criteria`,
        { method: 'POST' },
      )
      if (!res.ok) {
        await this.fail(res, 'Corpus analysis failed')
        return
      }
      this.progressLog.push('Criteria generated.')
    }

    // Step 2: Approve if needed
    if (!this.state.criteria.approvedAt) {
      this.progressLog.push('Approving criteria...')
      this.render()
      const res = await fetch(
        `${this.state.editBase}/authoring/approve-criteria`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        },
      )
      if (!res.ok) {
        await this.fail(res, 'Criteria approval failed')
        return
      }
      this.progressLog.push('Criteria approved.')
    }

    // Step 3: Generate structure
    this.progressLog.push('Generating page/group structure...')
    this.render()
    const structRes = await fetch(
      `${this.state.editBase}/authoring/plan-structure`,
      { method: 'POST' },
    )
    if (!structRes.ok) {
      await this.fail(structRes, 'Structure generation failed')
      return
    }

    const structData = await structRes.json()
    const pages = structData.commands.filter(
      (c: { kind: string }) => c.kind === 'addPage',
    ).length
    const groups = structData.commands.filter(
      (c: { kind: string }) => c.kind === 'addGroup',
    ).length
    this.progressLog.push(`Created ${pages} pages, ${groups} groups. Saving...`)
    this.render()

    // Save structure
    this.stageCommands(structData.commands, structData.explanation)
    await this.save()

    // Step 4: Generate fields for each section
    this.progressLog.push('Generating fields...')
    this.render()

    // Refresh state to get updated groups
    await this.refreshState()
    const uncovered = this.state!.groups.filter((g) => g.fieldCount === 0)

    for (let i = 0; i < uncovered.length; i++) {
      const group = uncovered[i]
      this.progressLog.push(
        `  ${group.title} (${i + 1}/${uncovered.length})...`,
      )
      this.render()

      const res = await fetch(
        `${this.state!.editBase}/authoring/generate-section`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ groupId: group.id, groupTitle: group.title }),
        },
      )

      if (!res.ok) {
        this.progressLog.push(`    Failed, skipping.`)
        continue
      }

      const data = await res.json()
      const fields = data.commands.filter(
        (c: { kind: string }) => c.kind === 'addField',
      ).length
      this.progressLog.push(`    ${fields} fields added.`)
      this.render()

      this.stageCommands(data.commands, data.explanation)
      await this.save()
    }

    this.progressLog.push('Done! Reloading...')
    this.render()
    setTimeout(() => window.location.reload(), 1000)
  }

  private stageCommands(commands: unknown[], explanation: string) {
    this.dispatchEvent(
      new CustomEvent('formeditor:stage-batch', {
        detail: { commands, summary: explanation, source: 'llm' },
        bubbles: true,
        composed: true,
      }),
    )
  }

  private async save() {
    const saveBtn = this.closest(
      'flex-form-editor',
    )?.querySelector<HTMLButtonElement>('[data-action="save-staged"]')
    if (saveBtn && !saveBtn.hidden) {
      saveBtn.click()
      await new Promise((r) => setTimeout(r, 800))
    }
  }

  private async refreshState() {
    if (!this.state) return
    const res = await fetch(`${this.state.editBase}/authoring/stage`)
    if (res.ok) {
      const data = await res.json()
      this.state = { ...this.state, ...data }
    }
  }

  private async fail(res: Response, context: string) {
    const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
    this.error = `${context}: ${data.error ?? 'Unknown error'}`
    this.running = false
    this.render()
  }
}

if (!customElements.get('flex-pipeline-panel')) {
  customElements.define('flex-pipeline-panel', FlexPipelinePanel)
}
