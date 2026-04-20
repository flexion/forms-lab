import { Hono } from 'hono'
import type { SessionUser } from '../../../../../services/auth'
import {
  HAIKU_MODEL_ID,
  OPUS_MODEL_ID,
  SONNET_MODEL_ID,
} from '../../../../../services/extraction'
import {
  approveCriteriaSet,
  type CriteriaEdits,
  type CriteriaSet,
  createAuthoringEvaluator,
  detectAuthoringStage,
  emptyCriteriaSet,
  mergeCriteriaEdits,
  parseCriteriaSet,
  resolveAuthoringPipeline,
  serializeCriteriaSet,
} from '../../../../../services/form-authoring'
import type { Command, ProjectState } from '../../../../../services/forms'
import type { ProjectService } from '../../../../../services/projects'
import {
  getCorpusMetadata,
  retrieveOrFullCorpus,
} from '../../../../../services/rag'
import type { VariantPreferencesService } from '../../../../../services/variant-preferences'
import { UnauthenticatedError } from '../../../../../shared/errors'

/**
 * Build a broad retrieval query for the planning stages (criteria
 * analysis and structure generation). Uses the corpus's form name
 * so the query is generic across corpora — for SNAP this becomes
 * "Wisconsin FoodShare (SNAP) Application — eligibility, required
 * information, application process, regulatory requirements."
 */
function planningQuery(corpusSlug: string): string {
  const meta = getCorpusMetadata(corpusSlug)
  const formName = meta?.formName ?? corpusSlug
  return `${formName} — eligibility, required information, application process, regulatory requirements`
}

// Retrieval widths chosen to give the planning stages broad coverage
// (criteria/structure need to see almost every policy topic to
// produce a complete form) while narrowing section generation to
// just the chunks closest to the group title.
const PLANNING_K = 15
const SECTION_K = 5

const llmCache = new Map<string, unknown>()

interface BuildProgress {
  status: 'running' | 'done' | 'error'
  log: string[]
  error?: string
  startedAt: string
}

const builds = new Map<string, BuildProgress>()

function modelIdFromVariant(variantId: string): string {
  if (variantId.includes('haiku')) return HAIKU_MODEL_ID
  if (variantId.includes('opus')) return OPUS_MODEL_ID
  return SONNET_MODEL_ID
}

export function createAuthoringRoutes(
  service: ProjectService,
  variantPreferences?: VariantPreferencesService,
): Hono {
  const app = new Hono()

  async function loadCriteria(
    owner: string,
    slug: string,
    branch: string,
  ): Promise<CriteriaSet> {
    const buf = await service.getFileContent(
      owner,
      slug,
      branch,
      'forms/default/criteria.json',
    )
    if (!buf) return emptyCriteriaSet()
    return parseCriteriaSet(buf.toString())
  }

  /**
   * Resolve the policy corpus slug for a project. Authoring routes
   * should fail fast when the project has no corpus association
   * rather than silently defaulting to SNAP — every other outcome
   * hides a data-model bug.
   */
  async function requireProjectCorpusSlug(
    owner: string,
    slug: string,
    user: SessionUser,
    branch: string,
  ): Promise<string> {
    const view = await service.getProject(owner, slug, user, branch)
    const corpusSlug = view.project.corpusSlug
    if (!corpusSlug) {
      throw new Error(
        `Project "${slug}" has no associated policy corpus. Authoring requires a corpus-based project — create one from /new using a "Build from corpus" button.`,
      )
    }
    return corpusSlug
  }

  async function runBuild(
    owner: string,
    slug: string,
    branch: string,
    user: SessionUser,
    progress: BuildProgress,
  ): Promise<void> {
    const log = (msg: string) => {
      progress.log.push(msg)
    }

    try {
      // Resolve per-stage variant preferences — each maps to a model ID
      const criteriaVariantId = variantPreferences?.get(
        user.login,
        'authoring-criteria',
      )
      const structureVariantId = variantPreferences?.get(
        user.login,
        'authoring-structure',
      )
      const generationVariantId = variantPreferences?.get(
        user.login,
        'authoring-generation',
      )

      // Model IDs default to Sonnet when no preference is set
      const criteriaModelId = criteriaVariantId
        ? modelIdFromVariant(criteriaVariantId)
        : SONNET_MODEL_ID
      const structureModelId = structureVariantId
        ? modelIdFromVariant(structureVariantId)
        : SONNET_MODEL_ID
      const generationModelId = generationVariantId
        ? modelIdFromVariant(generationVariantId)
        : SONNET_MODEL_ID

      const pipeline = resolveAuthoringPipeline(
        criteriaModelId,
        structureModelId,
        generationModelId,
      )

      log(
        `Models: criteria=${criteriaModelId.split('.').pop()}, structure=${structureModelId.split('.').pop()}, generation=${generationModelId.split('.').pop()}`,
      )

      // Every stage in this build uses the same corpus; resolve the
      // slug once from the project.
      const corpusSlug = await requireProjectCorpusSlug(
        owner,
        slug,
        user,
        branch,
      )
      log(`Corpus: ${corpusSlug}`)

      // Step 1: Analyze criteria if needed
      const existingCriteria = await loadCriteria(owner, slug, branch)
      let criteriaSet = existingCriteria

      if (criteriaSet.criteria.length === 0) {
        log('Analyzing policy corpus...')
        const criteriaRetrieval = await retrieveOrFullCorpus(
          corpusSlug,
          planningQuery(corpusSlug),
          PLANNING_K,
        )
        log(
          `  criteria: ${criteriaRetrieval.source} (${criteriaRetrieval.chunks.length} chunks)`,
        )
        const criteriaList = await pipeline.analyzeCriteria(
          criteriaRetrieval.chunks,
        )
        criteriaSet = {
          criteria: criteriaList,
          approvedAt: null,
          approvedBy: null,
        }
        await service.commitFile(
          slug,
          branch,
          'forms/default/criteria.json',
          serializeCriteriaSet(criteriaSet),
          'Generate evaluation criteria',
          user,
        )
        log(`${criteriaList.length} criteria generated.`)
      }

      // Step 2: Approve if needed
      if (!criteriaSet.approvedAt) {
        log('Approving criteria...')
        criteriaSet = approveCriteriaSet(criteriaSet, user.login)
        await service.commitFile(
          slug,
          branch,
          'forms/default/criteria.json',
          serializeCriteriaSet(criteriaSet),
          'Approve criteria',
          user,
        )
        log('Criteria approved.')
      }

      // Step 3: Generate structure (pages only)
      log('Generating page structure (~20s)...')
      const structureRetrieval = await retrieveOrFullCorpus(
        corpusSlug,
        planningQuery(corpusSlug),
        PLANNING_K,
      )
      log(
        `  structure: ${structureRetrieval.source} (${structureRetrieval.chunks.length} chunks)`,
      )
      const corpus = structureRetrieval.chunks

      const view = await service.getProject(owner, slug, user, branch)
      const state =
        view.formSpec && view.spec
          ? {
              formSpec: view.formSpec as unknown as ProjectState['formSpec'],
              dataSpec: view.spec as unknown as ProjectState['dataSpec'],
            }
          : null

      const structResult = await pipeline.planStructure(
        criteriaSet.criteria,
        corpus,
        state,
      )
      const pageCommands = structResult.commands.filter(
        (c) => c.kind === 'addPage',
      )

      if (pageCommands.length > 0) {
        const result = await service.executeCommands(
          owner,
          slug,
          pageCommands,
          'Add pages',
          'llm',
          user,
          { branch },
        )
        if (!result.ok) {
          throw new Error(`Structure save failed: ${result.error}`)
        }
        log(`${pageCommands.length} pages created.`)
      }

      // Step 4: Create one group per page
      log('Creating groups...')
      const view2 = await service.getProject(owner, slug, user, branch)
      if (view2.formSpec) {
        const emptyPages = view2.formSpec.pages.filter(
          (p) => p.groups.length === 0,
        )
        if (emptyPages.length > 0) {
          const groupCommands = emptyPages.map((p) => ({
            kind: 'addGroup' as const,
            pageId: p.id,
            title: p.title,
          }))
          const result = await service.executeCommands(
            owner,
            slug,
            groupCommands,
            'Add groups',
            'llm',
            user,
            { branch },
          )
          if (!result.ok) {
            throw new Error(`Groups save failed: ${result.error}`)
          }
          log(`${groupCommands.length} groups created.`)
        }
      }

      // Step 5: Generate fields for each group
      log('Generating fields...')
      const view3 = await service.getProject(owner, slug, user, branch)
      if (view3.spec) {
        const groups = view3.spec.groups.filter(
          (g) => g.requirements.length === 0,
        )
        for (let i = 0; i < groups.length; i++) {
          const group = groups[i]
          log(`  ${group.title} (${i + 1}/${groups.length})...`)

          const cacheKey = `section:${slug}:${branch}:${group.id}`
          let sectionResult: {
            commands: Command[]
            explanation: string
          }
          if (llmCache.has(cacheKey)) {
            sectionResult = llmCache.get(cacheKey) as {
              commands: Command[]
              explanation: string
            }
          } else {
            // Per-section retrieval: the group title is the query;
            // we expect a few nearest-neighbour chunks to cover the
            // regulations relevant to the fields that section
            // collects.
            const sectionRetrieval = await retrieveOrFullCorpus(
              corpusSlug,
              group.title,
              SECTION_K,
            )
            log(
              `    [${group.title}] ${sectionRetrieval.source} (${sectionRetrieval.chunks.length} chunks)`,
            )
            sectionResult = await pipeline.generateSection(
              group.id,
              group.title,
              criteriaSet.criteria,
              sectionRetrieval.chunks,
            )
            llmCache.set(cacheKey, sectionResult)
          }

          if (sectionResult.commands.length > 0) {
            const fieldCount = sectionResult.commands.filter(
              (c) => c.kind === 'addField',
            ).length
            const result = await service.executeCommands(
              owner,
              slug,
              sectionResult.commands,
              sectionResult.explanation,
              'llm',
              user,
              { branch },
            )
            if (result.ok) {
              log(`    ${fieldCount} fields added.`)
            } else {
              log(`    Save failed: ${result.error}`)
            }
          }
        }
      }

      log('Done!')
      progress.status = 'done'
    } catch (err) {
      progress.status = 'error'
      progress.error = err instanceof Error ? err.message : String(err)
      log(`Error: ${progress.error}`)
    }
  }

  // POST /:owner/:slug/edit/:branch/authoring/build
  // Kick off the full pipeline as a background task
  app.post('/:owner/:slug/edit/:branch/authoring/build', async (c) => {
    const owner = c.req.param('owner')
    const slug = c.req.param('slug')
    const branch = c.req.param('branch')
    const user = c.get('user') as SessionUser | null

    if (!user) throw new UnauthenticatedError()

    const key = `${slug}:${branch}`

    // Don't start if already running
    const existing = builds.get(key)
    if (existing?.status === 'running') {
      return c.json({ status: 'already-running' })
    }

    const progress: BuildProgress = {
      status: 'running',
      log: [],
      startedAt: new Date().toISOString(),
    }
    builds.set(key, progress)

    // Run in background — don't await
    runBuild(owner, slug, branch, user, progress).catch((err) => {
      progress.status = 'error'
      progress.error = err instanceof Error ? err.message : String(err)
    })

    return c.json({ status: 'started' })
  })

  // GET /:owner/:slug/edit/:branch/authoring/build-status
  // Returns the current build progress
  app.get('/:owner/:slug/edit/:branch/authoring/build-status', async (c) => {
    const slug = c.req.param('slug')
    const branch = c.req.param('branch')
    const key = `${slug}:${branch}`
    const progress = builds.get(key)
    if (!progress) {
      return c.json({ status: 'idle', log: [] })
    }
    return c.json(progress)
  })

  // POST /:owner/:slug/edit/:branch/authoring/analyze-criteria
  // Stage 1: calls pipeline.analyzeCriteria, persists criteria.json to git
  app.post(
    '/:owner/:slug/edit/:branch/authoring/analyze-criteria',
    async (c) => {
      const owner = c.req.param('owner')
      const slug = c.req.param('slug')
      const branch = c.req.param('branch')
      const user = c.get('user') as SessionUser | null

      try {
        if (!user) throw new UnauthenticatedError()
        if (branch === 'main') {
          return c.json({ error: 'main is read-only' }, 403)
        }

        const view = await service.getProject(owner, slug, user, branch)
        if (!view.isOwner) {
          return c.json({ error: 'not allowed' }, 403)
        }

        // Return cached criteria if they already exist
        const existing = await loadCriteria(owner, slug, branch)
        if (existing.criteria.length > 0) {
          return c.json({ criteria: existing })
        }

        // Resolve variant per-user preference

        const pipeline = resolveAuthoringPipeline(
          SONNET_MODEL_ID,
          SONNET_MODEL_ID,
          SONNET_MODEL_ID,
        )

        // Load corpus for this project and analyze
        const corpusSlug = await requireProjectCorpusSlug(
          owner,
          slug,
          user,
          branch,
        )
        const { chunks: corpus } = await retrieveOrFullCorpus(
          corpusSlug,
          planningQuery(corpusSlug),
          PLANNING_K,
        )
        const criteriaList = await pipeline.analyzeCriteria(corpus)

        const criteria: CriteriaSet = {
          criteria: criteriaList,
          approvedAt: null,
          approvedBy: null,
        }

        // Persist to git
        const content = serializeCriteriaSet(criteria)
        await service.commitFile(
          slug,
          branch,
          'forms/default/criteria.json',
          content,
          'Extract form authoring criteria',
          user,
        )

        return c.json({ criteria })
      } catch (err) {
        console.error('[authoring/analyze-criteria]', err)
        return c.json(
          { error: err instanceof Error ? err.message : String(err) },
          500,
        )
      }
    },
  )

  // POST /:owner/:slug/edit/:branch/authoring/update-criteria
  // Human edits (approve/reject/add/edit individual criteria)
  app.post(
    '/:owner/:slug/edit/:branch/authoring/update-criteria',
    async (c) => {
      const owner = c.req.param('owner')
      const slug = c.req.param('slug')
      const branch = c.req.param('branch')
      const user = c.get('user') as SessionUser | null

      try {
        if (!user) throw new UnauthenticatedError()
        if (branch === 'main') {
          return c.json({ error: 'main is read-only' }, 403)
        }

        const view = await service.getProject(owner, slug, user, branch)
        if (!view.isOwner) {
          return c.json({ error: 'not allowed' }, 403)
        }

        const body = (await c.req.json()) as CriteriaEdits
        const current = await loadCriteria(owner, slug, branch)
        const updated = mergeCriteriaEdits(current, body)

        // Persist to git
        const content = serializeCriteriaSet(updated)
        await service.commitFile(
          slug,
          branch,
          'forms/default/criteria.json',
          content,
          'Update authoring criteria',
          user,
        )

        return c.json({ criteria: updated })
      } catch (err) {
        console.error('[authoring/update-criteria]', err)
        return c.json(
          { error: err instanceof Error ? err.message : String(err) },
          500,
        )
      }
    },
  )

  // POST /:owner/:slug/edit/:branch/authoring/approve-criteria
  // Freeze criteria, advance to Stage 2
  app.post(
    '/:owner/:slug/edit/:branch/authoring/approve-criteria',
    async (c) => {
      const owner = c.req.param('owner')
      const slug = c.req.param('slug')
      const branch = c.req.param('branch')
      const user = c.get('user') as SessionUser | null

      try {
        if (!user) throw new UnauthenticatedError()
        if (branch === 'main') {
          return c.json({ error: 'main is read-only' }, 403)
        }

        const view = await service.getProject(owner, slug, user, branch)
        if (!view.isOwner) {
          return c.json({ error: 'not allowed' }, 403)
        }

        const current = await loadCriteria(owner, slug, branch)
        const frozen = approveCriteriaSet(current, user.login)

        // Persist to git
        const content = serializeCriteriaSet(frozen)
        await service.commitFile(
          slug,
          branch,
          'forms/default/criteria.json',
          content,
          'Approve authoring criteria',
          user,
        )

        return c.json({ criteria: frozen })
      } catch (err) {
        console.error('[authoring/approve-criteria]', err)
        return c.json(
          { error: err instanceof Error ? err.message : String(err) },
          500,
        )
      }
    },
  )

  // POST /:owner/:slug/edit/:branch/authoring/plan-structure
  // Stage 2: generate page/group skeleton
  app.post('/:owner/:slug/edit/:branch/authoring/plan-structure', async (c) => {
    const owner = c.req.param('owner')
    const slug = c.req.param('slug')
    const branch = c.req.param('branch')
    const user = c.get('user') as SessionUser | null

    try {
      if (!user) throw new UnauthenticatedError()
      if (branch === 'main') {
        return c.json({ error: 'main is read-only' }, 403)
      }

      const view = await service.getProject(owner, slug, user, branch)
      if (!view.isOwner || !view.formSpec || !view.spec) {
        return c.json({ error: 'not allowed' }, 403)
      }

      const criteria = await loadCriteria(owner, slug, branch)
      const corpusSlug = view.project.corpusSlug
      if (!corpusSlug) {
        return c.json({ error: 'project has no associated policy corpus' }, 400)
      }
      const { chunks: corpus } = await retrieveOrFullCorpus(
        corpusSlug,
        planningQuery(corpusSlug),
        PLANNING_K,
      )

      const state =
        view.formSpec && view.spec
          ? {
              formSpec: view.formSpec as unknown as ProjectState['formSpec'],
              dataSpec: view.spec as unknown as ProjectState['dataSpec'],
            }
          : null

      // Resolve variant per-user preference
      const pipeline = resolveAuthoringPipeline(
        SONNET_MODEL_ID,
        SONNET_MODEL_ID,
        SONNET_MODEL_ID,
      )

      const result = await pipeline.planStructure(
        criteria.criteria,
        corpus,
        state,
      )

      // Only return addPage commands — addGroup commands from the LLM
      // reference fake page IDs. Groups will be created in a follow-up step.
      const pageCommands = result.commands.filter((c) => c.kind === 'addPage')

      return c.json({
        commands: pageCommands.length > 0 ? pageCommands : result.commands,
        explanation: result.explanation,
      })
    } catch (err) {
      console.error('[authoring/plan-structure]', err)
      return c.json(
        { error: err instanceof Error ? err.message : String(err) },
        500,
      )
    }
  })

  // POST /:owner/:slug/edit/:branch/authoring/generate-section
  // Stage 3: generate fields per group
  app.post(
    '/:owner/:slug/edit/:branch/authoring/generate-section',
    async (c) => {
      const owner = c.req.param('owner')
      const slug = c.req.param('slug')
      const branch = c.req.param('branch')
      const user = c.get('user') as SessionUser | null

      try {
        if (!user) throw new UnauthenticatedError()
        if (branch === 'main') {
          return c.json({ error: 'main is read-only' }, 403)
        }

        const view = await service.getProject(owner, slug, user, branch)
        if (!view.isOwner || !view.formSpec || !view.spec) {
          return c.json({ error: 'not allowed' }, 403)
        }

        const body = (await c.req.json()) as {
          groupId: string
          groupTitle: string
        }
        const criteriaSet = await loadCriteria(owner, slug, branch)
        if (!view.project.corpusSlug) {
          return c.json(
            { error: 'project has no associated policy corpus' },
            400,
          )
        }
        // Per-section retrieval: the group title is the query.
        const { chunks: corpus } = await retrieveOrFullCorpus(
          view.project.corpusSlug,
          body.groupTitle,
          SECTION_K,
        )

        const cacheKey = `section:${slug}:${branch}:${body.groupId}`
        if (llmCache.has(cacheKey)) {
          return c.json(llmCache.get(cacheKey))
        }

        // Resolve variant per-user preference

        const pipeline = resolveAuthoringPipeline(
          SONNET_MODEL_ID,
          SONNET_MODEL_ID,
          SONNET_MODEL_ID,
        )

        const result = await pipeline.generateSection(
          body.groupId,
          body.groupTitle,
          criteriaSet.criteria,
          corpus,
        )

        const response = {
          commands: result.commands,
          explanation: result.explanation,
        }
        llmCache.set(cacheKey, response)
        return c.json(response)
      } catch (err) {
        console.error('[authoring/generate-section]', err)
        return c.json(
          { error: err instanceof Error ? err.message : String(err) },
          500,
        )
      }
    },
  )

  // POST /:owner/:slug/edit/:branch/authoring/evaluate-section
  // Stage 4: evaluate section criteria
  app.post(
    '/:owner/:slug/edit/:branch/authoring/evaluate-section',
    async (c) => {
      const owner = c.req.param('owner')
      const slug = c.req.param('slug')
      const branch = c.req.param('branch')
      const user = c.get('user') as SessionUser | null

      try {
        if (!user) throw new UnauthenticatedError()
        if (branch === 'main') {
          return c.json({ error: 'main is read-only' }, 403)
        }

        const view = await service.getProject(owner, slug, user, branch)
        if (!view.isOwner || !view.formSpec || !view.spec) {
          return c.json({ error: 'not allowed' }, 403)
        }

        const body = (await c.req.json()) as { groupId: string }
        const criteriaSet = await loadCriteria(owner, slug, branch)
        if (!view.project.corpusSlug) {
          return c.json(
            { error: 'project has no associated policy corpus' },
            400,
          )
        }

        // Resolve the group title so retrieval can use a natural-
        // language query ("Household Composition") rather than the
        // opaque group id.
        const group = view.spec.groups.find((g) => g.id === body.groupId)
        const query = group?.title ?? body.groupId
        const { chunks: corpus } = await retrieveOrFullCorpus(
          view.project.corpusSlug,
          query,
          SECTION_K,
        )

        const state = {
          formSpec: view.formSpec as unknown as ProjectState['formSpec'],
          dataSpec: view.spec as unknown as ProjectState['dataSpec'],
        }

        const evaluator = createAuthoringEvaluator()
        const result = await evaluator.evaluateSection(
          body.groupId,
          state,
          criteriaSet.criteria,
          corpus,
        )

        // Persist evaluation results to git
        const content = JSON.stringify(result, null, 2)
        await service.commitFile(
          slug,
          branch,
          'forms/default/eval-results.json',
          content,
          'Evaluate section criteria',
          user,
        )

        return c.json({ evalResult: result })
      } catch (err) {
        console.error('[authoring/evaluate-section]', err)
        return c.json(
          { error: err instanceof Error ? err.message : String(err) },
          500,
        )
      }
    },
  )

  // GET /:owner/:slug/edit/:branch/authoring/stage
  // Returns current pipeline stage and criteria
  app.get('/:owner/:slug/edit/:branch/authoring/stage', async (c) => {
    const owner = c.req.param('owner')
    const slug = c.req.param('slug')
    const branch = c.req.param('branch')
    const user = c.get('user') as SessionUser | null

    try {
      if (!user) throw new UnauthenticatedError()

      const view = await service.getProject(owner, slug, user, branch)
      if (!view.isOwner) {
        return c.json({ error: 'not allowed' }, 403)
      }

      const criteriaBuf = await service.getFileContent(
        owner,
        slug,
        branch,
        'forms/default/criteria.json',
      )
      const criteria = criteriaBuf
        ? parseCriteriaSet(criteriaBuf.toString())
        : null

      // Detect stage based on form state
      let uncoveredGroupCount = 0
      if (view.formSpec && view.spec) {
        // Count groups that have no requirements (fields)
        const groupIds = new Set<string>()
        for (const page of view.formSpec.pages) {
          for (const groupId of page.groups) {
            groupIds.add(groupId)
          }
        }

        for (const group of view.spec.groups) {
          if (groupIds.has(group.id) && group.requirements.length === 0) {
            uncoveredGroupCount++
          }
        }
      }

      const stage = detectAuthoringStage({
        hasCriteria: !!criteriaBuf,
        criteriaApproved: criteria?.approvedAt !== null,
        hasPages: view.formSpec ? view.formSpec.pages.length > 0 : false,
        uncoveredGroupCount,
      })

      const groups = view.spec
        ? view.spec.groups.map((g) => ({
            id: g.id,
            title: g.title,
            fieldCount: g.requirements.length,
          }))
        : []

      const pages = view.formSpec
        ? view.formSpec.pages.map((p) => ({
            id: p.id,
            title: p.title,
            groups: p.groups,
          }))
        : []

      return c.json({
        stage,
        criteria,
        groups,
        pages,
        currentSha: view.currentSha,
      })
    } catch (err) {
      console.error('[authoring/stage]', err)
      return c.json(
        { error: err instanceof Error ? err.message : String(err) },
        500,
      )
    }
  })

  return app
}
