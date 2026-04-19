import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { SessionUser } from '../src/services/auth/session'
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  UnauthenticatedError,
} from '../src/services/errors'
import type { PdfExtractor } from '../src/services/form-documents/extraction'
import type { FormProjectRepo } from '../src/services/form-project-repo'
import { createFormProjectRepo } from '../src/services/form-project-repo'
import {
  createProjectService,
  type ProjectService,
} from '../src/services/project-service'
import type { ProjectStore } from '../src/services/storage'
import { createProjectStore } from '../src/services/storage'
import type { ExtractionResult } from '../src/types/models'

const SAMPLE_PDF = Buffer.from('%PDF-1.4 sample')

const SAMPLE_RESULT: ExtractionResult = {
  spec: {
    id: 'test-form',
    title: 'Test Form',
    description: 'A test form',
    groups: [
      {
        id: 'group-1',
        title: 'Basic Info',
        requirements: [
          {
            id: 'field-name',
            fieldName: 'fullName',
            label: 'Full Name',
            fieldType: 'text',
            required: true,
          },
        ],
      },
    ],
  },
  formSpec: {
    id: 'form-test-form',
    specId: 'test-form',
    title: 'Test Form',
    pages: [
      {
        id: 'page-1',
        title: 'Basic Info',
        groups: ['group-1'],
        deliveryMode: 'static',
      },
    ],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  confidence: [{ fieldId: 'field-name', confidence: 0.95 }],
  fieldMapping: {},
}

function stubExtractor(result: ExtractionResult = SAMPLE_RESULT): PdfExtractor {
  return {
    extract: async () => result,
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

describe('ProjectService — branches', () => {
  let basePath: string
  let store: ProjectStore
  let repo: FormProjectRepo
  let service: ProjectService

  beforeEach(() => {
    basePath = mkdtempSync(join(tmpdir(), 'project-service-branches-'))
    store = createProjectStore(':memory:')
    repo = createFormProjectRepo(basePath)
    service = createProjectService(store, repo, stubExtraction())
  })

  afterEach(() => {
    rmSync(basePath, { recursive: true, force: true })
  })

  describe('listBranches', () => {
    it('returns the main branch for a new project', async () => {
      const project = await service.createProject('List', SAMPLE_PDF, alice)
      await waitForStatus(store, project.id, 'ready')

      const branches = await service.listBranches(project.slug)
      const names = branches.map((b) => b.name).sort()
      expect(names).toContain('main')
    })
  })

  describe('createBranch', () => {
    it('creates a branch from an existing ref', async () => {
      const project = await service.createProject('Create', SAMPLE_PDF, alice)
      await waitForStatus(store, project.id, 'ready')

      await service.createBranch(project.slug, 'feature', 'main', alice)

      const branches = await service.listBranches(project.slug)
      const names = branches.map((b) => b.name).sort()
      expect(names).toContain('feature')
      expect(names).toContain('main')
    })

    it('throws UnauthenticatedError when user is null', async () => {
      const project = await service.createProject('Auth', SAMPLE_PDF, alice)
      expect(
        service.createBranch(
          project.slug,
          'feature',
          'main',
          null as unknown as SessionUser,
        ),
      ).rejects.toBeInstanceOf(UnauthenticatedError)
    })

    it('throws ForbiddenError for non-owner', async () => {
      const project = await service.createProject('Forbid', SAMPLE_PDF, alice)
      expect(
        service.createBranch(project.slug, 'feature', 'main', bob),
      ).rejects.toBeInstanceOf(ForbiddenError)
    })

    it('throws NotFoundError for unknown project', async () => {
      expect(
        service.createBranch('nonexistent', 'feature', 'main', alice),
      ).rejects.toBeInstanceOf(NotFoundError)
    })
  })

  describe('deleteBranch', () => {
    it('deletes a non-main branch', async () => {
      const project = await service.createProject('Delete', SAMPLE_PDF, alice)
      await waitForStatus(store, project.id, 'ready')

      await service.createBranch(project.slug, 'feature', 'main', alice)
      await service.deleteBranch(project.slug, 'feature', alice)

      const branches = await service.listBranches(project.slug)
      const names = branches.map((b) => b.name)
      expect(names).not.toContain('feature')
    })

    it('rejects deleting main', async () => {
      const project = await service.createProject(
        'Protect Main',
        SAMPLE_PDF,
        alice,
      )
      await waitForStatus(store, project.id, 'ready')

      expect(
        service.deleteBranch(project.slug, 'main', alice),
      ).rejects.toBeInstanceOf(BadRequestError)
    })

    it('throws ForbiddenError for non-owner', async () => {
      const project = await service.createProject('Forbid', SAMPLE_PDF, alice)
      await waitForStatus(store, project.id, 'ready')
      await service.createBranch(project.slug, 'feature', 'main', alice)

      expect(
        service.deleteBranch(project.slug, 'feature', bob),
      ).rejects.toBeInstanceOf(ForbiddenError)
    })
  })

  describe('executeCommands with branch', () => {
    it('writes changes to the specified branch, not main', async () => {
      const project = await service.createProject(
        'Branch Edits',
        SAMPLE_PDF,
        alice,
      )
      await waitForStatus(store, project.id, 'ready')
      await repo.mergeBranch(project.slug, 'import', 'main')

      // Create a branch from main
      await service.createBranch(project.slug, 'feature', 'main', alice)

      // Apply a shaping command on the branch
      const viewBefore = await service.getProject(
        'alice',
        project.slug,
        alice,
        'feature',
      )
      if (!viewBefore.formSpec) throw new Error('FormSpec is null')
      const firstPageId = viewBefore.formSpec.pages[0].id

      const result = await service.executeCommands(
        'alice',
        project.slug,
        [{ kind: 'renamePage', id: firstPageId, title: 'On Feature' }],
        'Rename on feature branch',
        'manual',
        alice,
        { branch: 'feature' },
      )
      expect(result.ok).toBe(true)

      // Feature branch sees the change
      const featureView = await service.getProject(
        'alice',
        project.slug,
        alice,
        'feature',
      )
      expect(featureView.formSpec?.pages[0].title).toBe('On Feature')

      // Main branch does not see the change
      const mainView = await service.getProject('alice', project.slug, alice)
      expect(mainView.formSpec?.pages[0].title).not.toBe('On Feature')
    })

    it('getShapingLog reads from the specified branch', async () => {
      const project = await service.createProject(
        'Branch Log',
        SAMPLE_PDF,
        alice,
      )
      await waitForStatus(store, project.id, 'ready')
      await repo.mergeBranch(project.slug, 'import', 'main')

      await service.createBranch(project.slug, 'feature', 'main', alice)

      const view = await service.getProject(
        'alice',
        project.slug,
        alice,
        'feature',
      )
      if (!view.formSpec) throw new Error('FormSpec is null')
      const firstPageId = view.formSpec.pages[0].id

      await service.executeCommands(
        'alice',
        project.slug,
        [{ kind: 'renamePage', id: firstPageId, title: 'Logged' }],
        'Log entry on feature',
        'manual',
        alice,
        { branch: 'feature' },
      )

      const featureLog = await service.getShapingLog(
        'alice',
        project.slug,
        'feature',
      )
      expect(featureLog.length).toBe(1)
      expect(featureLog[0].explanation).toBe('Log entry on feature')

      const mainLog = await service.getShapingLog('alice', project.slug)
      expect(mainLog.length).toBe(0)
    })
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
