import { Hono } from 'hono'
import type { SessionUser } from '../../../../../services/auth'
import {
  approveCriteriaSet,
  type CriteriaEdits,
  type CriteriaSet,
  createAuthoringEvaluator,
  createAuthoringPipeline,
  detectAuthoringStage,
  emptyCriteriaSet,
  mergeCriteriaEdits,
  parseCriteriaSet,
  serializeCriteriaSet,
} from '../../../../../services/form-authoring'
import type { ProjectState } from '../../../../../services/forms'
import type { ProjectService } from '../../../../../services/projects'
import { loadPolicyCorpus } from '../../../../../services/rag'
import { UnauthenticatedError } from '../../../../../shared/errors'

export function createAuthoringRoutes(service: ProjectService): Hono {
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

        // Load corpus and analyze
        const corpus = loadPolicyCorpus({ slug: 'snap-wisconsin' })
        const pipeline = createAuthoringPipeline()
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
      const corpus = await loadPolicyCorpus({ slug: 'snap-wisconsin' })

      const state =
        view.formSpec && view.spec
          ? {
              formSpec: view.formSpec as unknown as ProjectState['formSpec'],
              dataSpec: view.spec as unknown as ProjectState['dataSpec'],
            }
          : null

      const pipeline = createAuthoringPipeline()
      const result = await pipeline.planStructure(
        criteria.criteria,
        corpus,
        state,
      )

      return c.json({
        commands: result.commands,
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
        const corpus = await loadPolicyCorpus({ slug: 'snap-wisconsin' })

        const pipeline = createAuthoringPipeline()
        const result = await pipeline.generateSection(
          body.groupId,
          body.groupTitle,
          criteriaSet.criteria,
          corpus,
        )

        return c.json({
          commands: result.commands,
          explanation: result.explanation,
        })
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
        const corpus = await loadPolicyCorpus({ slug: 'snap-wisconsin' })

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

      return c.json({
        stage,
        criteria,
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
