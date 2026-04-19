import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { SessionUser } from '../../../src/services/auth'
import {
  BadRequestError,
  ForbiddenError,
  UnauthenticatedError,
} from '../../../src/services/errors'
import type { PdfExtractor } from '../../../src/services/form-documents'
import {
  createFormProjectRepo,
  createProjectService,
  type FormProjectRepo,
  type ProjectService,
} from '../../../src/services/projects'
import type { ProjectStore } from '../../../src/services/storage'
import { createProjectStore } from '../../../src/services/storage'
import type { ExtractionResult } from '../../../src/types/models'
import { testDataSpec, testFormSpec } from '../../forms/fixtures'

const SAMPLE_PDF = Buffer.from('%PDF-1.4 sample')

function createTestExtractionResult(): ExtractionResult {
  return {
    spec: testDataSpec,
    formSpec: testFormSpec,
    confidence: [{ fieldId: 'full-name', confidence: 0.95 }],
    fieldMapping: {},
  }
}

function stubExtractor(result?: ExtractionResult): PdfExtractor {
  return {
    extract: async () => result ?? createTestExtractionResult(),
  }
}

function stubExtraction(extractor: PdfExtractor = stubExtractor()) {
  return {
    resolveExtractor: () => extractor,
    resolveVariant: () => ({ variantId: 'sonnet', modelId: 'test-model' }),
  }
}

const alice: SessionUser = {
  login: 'alice',
  name: 'Alice',
  avatarUrl: 'https://example.com/alice.png',
}
const bob: SessionUser = {
  login: 'bob',
  name: 'Bob',
  avatarUrl: 'https://example.com/bob.png',
}

describe('ProjectService — FormSpec mutation', () => {
  let basePath: string
  let store: ProjectStore
  let repo: FormProjectRepo
  let service: ProjectService

  beforeEach(() => {
    basePath = mkdtempSync(join(tmpdir(), 'project-service-shaping-'))
    store = createProjectStore(':memory:')
    repo = createFormProjectRepo(basePath)
    service = createProjectService(store, repo, stubExtraction())
  })

  afterEach(() => {
    rmSync(basePath, { recursive: true, force: true })
  })

  describe('undoFormSpec', () => {
    it('reverts to a previous version', async () => {
      const project = await service.createProject(
        'Test Project',
        SAMPLE_PDF,
        alice,
      )
      await waitForStatus(store, project.id, 'ready')
      await repo.mergeBranch(project.slug, 'import', 'main')

      const view = await service.getProject('alice', project.slug, alice)
      if (!view.formSpec) throw new Error('FormSpec is null')
      const originalTitle = view.formSpec.title

      // Make a change
      const updated = {
        ...view.formSpec,
        title: 'Changed Title',
      }
      await service.updateFormSpec(
        'alice',
        project.slug,
        updated,
        'Change title',
        alice,
      )

      // Verify change took effect
      const changedView = await service.getProject('alice', project.slug, alice)
      expect(changedView.formSpec?.title).toBe('Changed Title')

      // Find the original commit
      const history = await service.getFormSpecHistory('alice', project.slug)
      const originalCommit = history.find((c) =>
        c.message.includes('Extract form specifications'),
      )
      expect(originalCommit).toBeDefined()
      if (!originalCommit) throw new Error('Original commit not found')

      // Undo to original
      const undoSha = await service.undoFormSpec(
        'alice',
        project.slug,
        originalCommit.sha,
        alice,
      )
      expect(typeof undoSha).toBe('string')

      // Verify undo restored original
      const revertedView = await service.getProject(
        'alice',
        project.slug,
        alice,
      )
      expect(revertedView.formSpec?.title).toBe(originalTitle)
    })

    it('throws UnauthenticatedError when user is null', async () => {
      const project = await service.createProject('Test', SAMPLE_PDF, alice)
      await waitForStatus(store, project.id, 'ready')
      await repo.mergeBranch(project.slug, 'import', 'main')

      const history = await service.getFormSpecHistory('alice', project.slug)
      expect(
        service.undoFormSpec(
          'alice',
          project.slug,
          history[0].sha,
          null as unknown as SessionUser,
        ),
      ).rejects.toBeInstanceOf(UnauthenticatedError)
    })

    it('throws ForbiddenError for non-owner', async () => {
      const project = await service.createProject('Test', SAMPLE_PDF, alice)
      await waitForStatus(store, project.id, 'ready')
      await repo.mergeBranch(project.slug, 'import', 'main')

      const history = await service.getFormSpecHistory('alice', project.slug)
      expect(
        service.undoFormSpec('alice', project.slug, history[0].sha, bob),
      ).rejects.toBeInstanceOf(ForbiddenError)
    })

    it('throws BadRequestError when target revision has no FormSpec', async () => {
      const project = await service.createProject('Test', SAMPLE_PDF, alice)
      await waitForStatus(store, project.id, 'ready')
      await repo.mergeBranch(project.slug, 'import', 'main')

      // Get initial commit (before extraction)
      const allHistory = await service.getHistory('alice', project.slug)
      const initialCommit = allHistory[allHistory.length - 1]

      expect(
        service.undoFormSpec('alice', project.slug, initialCommit.sha, alice),
      ).rejects.toBeInstanceOf(BadRequestError)
    })
  })
})

describe('ProjectService.getProject', () => {
  let basePath: string
  let store: ProjectStore
  let repo: FormProjectRepo
  let service: ProjectService
  let slug: string

  beforeEach(async () => {
    basePath = mkdtempSync(join(tmpdir(), 'project-service-getproject-'))
    store = createProjectStore(':memory:')
    repo = createFormProjectRepo(basePath)
    service = createProjectService(store, repo, stubExtraction())
    const project = await service.createProject(
      'Test Project',
      SAMPLE_PDF,
      alice,
    )
    slug = project.slug
    await waitForStatus(store, project.id, 'ready')
  })

  afterEach(() => {
    rmSync(basePath, { recursive: true, force: true })
  })

  it('returns the current sha for the project', async () => {
    const view = await service.getProject('alice', slug, alice)
    expect(view.currentSha).toMatch(/^[0-9a-f]{40}$/)
  })
})

/** Poll store until project reaches expected status or timeout */
async function waitForStatus(
  store: ProjectStore,
  id: string,
  status: string,
  timeoutMs = 2000,
): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const p = store.get(id)
    if (p?.status === status) return
    await new Promise((r) => setTimeout(r, 10))
  }
  throw new Error(
    `Timed out waiting for project ${id} to reach status "${status}"`,
  )
}
