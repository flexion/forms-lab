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

    const { stage, criteria, corpus } = this.state

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
    } else if (stage === 'criteria' && criteria.criteria.length === 0) {
      if (corpus.length > 0) {
        body += `<p>Policy corpus loaded with <strong>${corpus.length} regulatory sections</strong> from 7 CFR 273 (SNAP).</p>`
      }
      body += `<button type="button" class="flex-button" data-action="build-form">Build Form from Corpus</button>
        <p class="pipeline-panel__hint">Analyzes the policy corpus, generates evaluation criteria, and builds a complete form structure with fields.</p>`
    } else if (stage === 'criteria' && criteria.criteria.length > 0) {
      const pending = criteria.criteria.filter(
        (c) => c.status === 'pending',
      ).length
      if (pending > 0) {
        body += `<p>${criteria.criteria.length} criteria generated. Review in sidebar or continue.</p>`
        body += `<button type="button" class="flex-button" data-action="approve-and-build">Approve & Build Structure</button>`
      } else {
        body += `<p>Criteria approved. Ready to generate form structure.</p>`
        body += `<button type="button" class="flex-button" data-action="build-structure">Build Structure & Fields</button>`
      }
    } else if (stage === 'structure' || stage === 'sections') {
      const { groups } = this.state
      const total = groups.length
      const filled = groups.filter((g) => g.fieldCount > 0).length
      if (total > 0) {
        body += `<p>${filled} of ${total} sections have fields.</p>`
      }
      body += `<button type="button" class="flex-button" data-action="build-remaining">Generate Remaining Fields</button>
        <p class="pipeline-panel__hint">Generates fields for all sections that don't have them yet.</p>`
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

      if (action === 'build-form') await this.buildFullForm()
      if (action === 'approve-and-build') await this.approveAndBuild()
      if (action === 'build-structure') await this.buildStructureAndFields()
      if (action === 'build-remaining') await this.buildRemainingFields()
      if (action === 'dismiss-error') {
        this.error = null
        this.render()
      }
    })
  }

  private async buildFullForm() {
    if (!this.state) return
    this.running = true
    this.error = null
    this.progressLog = ['Analyzing policy corpus...']
    this.render()

    // Stage 1: Analyze criteria
    const analyzeRes = await fetch(
      `${this.state.editBase}/authoring/analyze-criteria`,
      { method: 'POST' },
    )
    if (!analyzeRes.ok) {
      await this.handleError(analyzeRes, 'Corpus analysis failed')
      return
    }

    this.progressLog.push('Criteria generated. Approving...')
    this.render()

    // Approve criteria
    const approveRes = await fetch(
      `${this.state.editBase}/authoring/approve-criteria`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      },
    )
    if (!approveRes.ok) {
      await this.handleError(approveRes, 'Criteria approval failed')
      return
    }

    this.progressLog.push('Criteria approved. Generating structure...')
    this.render()

    await this.generateStructureAndSave()
  }

  private async approveAndBuild() {
    if (!this.state) return
    this.running = true
    this.error = null
    this.progressLog = ['Approving criteria...']
    this.render()

    const approveRes = await fetch(
      `${this.state.editBase}/authoring/approve-criteria`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      },
    )
    if (!approveRes.ok) {
      await this.handleError(approveRes, 'Criteria approval failed')
      return
    }

    this.progressLog.push('Generating structure...')
    this.render()

    await this.generateStructureAndSave()
  }

  private async buildStructureAndFields() {
    if (!this.state) return
    this.running = true
    this.error = null
    this.progressLog = ['Generating structure...']
    this.render()

    await this.generateStructureAndSave()
  }

  private async buildRemainingFields() {
    if (!this.state) return
    this.running = true
    this.error = null
    this.progressLog = ['Generating fields for remaining sections...']
    this.render()

    await this.generateAllSections()
  }

  private async generateStructureAndSave() {
    if (!this.state) return

    const structRes = await fetch(
      `${this.state.editBase}/authoring/plan-structure`,
      { method: 'POST' },
    )
    if (!structRes.ok) {
      await this.handleError(structRes, 'Structure generation failed')
      return
    }

    const structData = await structRes.json()
    const pageCount = structData.commands.filter(
      (c: { kind: string }) => c.kind === 'addPage',
    ).length
    const groupCount = structData.commands.filter(
      (c: { kind: string }) => c.kind === 'addGroup',
    ).length

    this.progressLog.push(
      `Structure: ${pageCount} pages, ${groupCount} groups. Saving...`,
    )
    this.render()

    // Auto-save structure commands
    this.dispatchEvent(
      new CustomEvent('formeditor:stage-batch', {
        detail: {
          commands: structData.commands,
          summary: structData.explanation,
          source: 'llm',
        },
        bubbles: true,
        composed: true,
      }),
    )

    // Trigger save automatically
    await this.autoSave()

    this.progressLog.push('Structure saved. Generating fields...')
    this.render()

    await this.generateAllSections()
  }

  private async generateAllSections() {
    if (!this.state) return

    // Refresh state to get updated groups
    const stageRes = await fetch(`${this.state.editBase}/authoring/stage`)
    if (stageRes.ok) {
      const data = await stageRes.json()
      this.state = { ...this.state, ...data }
    }

    const uncovered = this.state!.groups.filter((g) => g.fieldCount === 0)
    if (uncovered.length === 0) {
      this.progressLog.push('All sections already have fields.')
      this.finish()
      return
    }

    for (let i = 0; i < uncovered.length; i++) {
      const group = uncovered[i]
      this.progressLog.push(
        `Generating fields for "${group.title}" (${i + 1}/${uncovered.length})...`,
      )
      this.render()

      const res = await fetch(
        `${this.state!.editBase}/authoring/generate-section`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            groupId: group.id,
            groupTitle: group.title,
          }),
        },
      )

      if (!res.ok) {
        const data = await res
          .json()
          .catch(() => ({ error: `HTTP ${res.status}` }))
        this.progressLog.push(`Failed: ${data.error ?? 'Unknown error'}`)
        continue
      }

      const sectionData = await res.json()
      const fieldCount = sectionData.commands.filter(
        (c: { kind: string }) => c.kind === 'addField',
      ).length

      this.progressLog.push(`  Added ${fieldCount} fields.`)
      this.render()

      // Stage and save each section's commands
      this.dispatchEvent(
        new CustomEvent('formeditor:stage-batch', {
          detail: {
            commands: sectionData.commands,
            summary: sectionData.explanation,
            source: 'llm',
          },
          bubbles: true,
          composed: true,
        }),
      )

      await this.autoSave()
    }

    this.finish()
  }

  private async autoSave() {
    // Trigger the save button programmatically
    const saveBtn = this.closest(
      'flex-form-editor',
    )?.querySelector<HTMLButtonElement>('[data-action="save-staged"]')
    if (saveBtn && !saveBtn.hidden) {
      saveBtn.click()
      // Wait for save to complete
      await new Promise((r) => setTimeout(r, 500))
    }
  }

  private finish() {
    this.progressLog.push('Done!')
    this.running = false
    this.render()
    // Reload page to show final state
    setTimeout(() => window.location.reload(), 1500)
  }

  private async handleError(res: Response, context: string) {
    const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
    this.error = `${context}: ${data.error ?? 'Unknown error'}`
    this.running = false
    this.progressLog = []
    this.render()
  }

  private setLoading(loading: boolean) {
    this.running = loading
    this.render()
  }
}

if (!customElements.get('flex-pipeline-panel')) {
  customElements.define('flex-pipeline-panel', FlexPipelinePanel)
}
