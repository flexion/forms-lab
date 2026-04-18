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
import type { FormProjectRepo } from '../src/services/form-project-repo'
import { createFormProjectRepo } from '../src/services/form-project-repo'
import type { PdfExtractor } from '../src/services/form-documents/extraction'
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
}

function stubExtractor(result: ExtractionResult = SAMPLE_RESULT): PdfExtractor {
  return {
    extract: async () => result,
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

describe('ProjectService', () => {
  let basePath: string
  let store: ProjectStore
  let repo: FormProjectRepo
  let service: ProjectService

  beforeEach(() => {
    basePath = mkdtempSync(join(tmpdir(), 'project-service-'))
    store = createProjectStore(':memory:')
    repo = createFormProjectRepo(basePath)
    service = createProjectService(store, repo, stubExtractor())
  })

  afterEach(() => {
    rmSync(basePath, { recursive: true, force: true })
  })

  describe('createProject', () => {
    it('creates a project for authenticated user', async () => {
      const project = await service.createProject(
        'Test Form',
        SAMPLE_PDF,
        alice,
      )
      expect(project.name).toBe('Test Form')
      expect(project.slug).toBe('test-form')
      expect(project.createdBy).toBe('alice')
      expect(project.status).toBe('extracting')

      // Verify git repo was initialized with source PDF and project.json
      const pdf = await repo.readFile(
        project.slug,
        'HEAD',
        `source/${project.slug}.pdf`,
      )
      expect(pdf).not.toBeNull()
      // biome-ignore lint/style/noNonNullAssertion: guarded by expect above
      expect(Buffer.compare(pdf!, SAMPLE_PDF)).toBe(0)

      const projectJson = await repo.readFile(
        project.slug,
        'HEAD',
        'project.json',
      )
      expect(projectJson).not.toBeNull()
      // biome-ignore lint/style/noNonNullAssertion: guarded by expect above
      const meta = JSON.parse(projectJson!.toString())
      expect(meta.name).toBe('Test Form')
      expect(meta.slug).toBe('test-form')
      expect(meta.createdBy).toBe('alice')
    })

    it('throws UnauthenticatedError when user is null', async () => {
      expect(
        service.createProject(
          'Test',
          SAMPLE_PDF,
          null as unknown as SessionUser,
        ),
      ).rejects.toBeInstanceOf(UnauthenticatedError)
    })

    it('handles duplicate slugs', async () => {
      await service.createProject('My Form', SAMPLE_PDF, alice)
      const second = await service.createProject('My Form', SAMPLE_PDF, alice)
      expect(second.slug).toBe('my-form-2')

      const third = await service.createProject('My Form', SAMPLE_PDF, alice)
      expect(third.slug).toBe('my-form-3')
    })

    it('rolls back SQLite row when git init fails', async () => {
      // A repo wrapper that throws on init to simulate git failure
      const failingRepo = {
        ...repo,
        init: async () => {
          throw new Error('simulated git failure')
        },
      }
      const failingService = createProjectService(
        store,
        failingRepo,
        stubExtractor(),
      )

      expect(
        failingService.createProject('Broken Form', SAMPLE_PDF, alice),
      ).rejects.toThrow('simulated git failure')

      // The SQLite row should not exist — cleanup happened
      await new Promise((r) => setTimeout(r, 10))
      expect(store.getBySlug('broken-form')).toBeNull()
      expect(store.list('alice')).toHaveLength(0)
    })

    it('rolls back SQLite row when git commit fails', async () => {
      const failingRepo = {
        ...repo,
        commit: async () => {
          throw new Error('simulated commit failure')
        },
      }
      const failingService = createProjectService(
        store,
        failingRepo,
        stubExtractor(),
      )

      expect(
        failingService.createProject('Broken Form', SAMPLE_PDF, alice),
      ).rejects.toThrow('simulated commit failure')

      expect(store.getBySlug('broken-form')).toBeNull()
    })
  })

  describe('deleteProject', () => {
    it('allows owner to delete', async () => {
      const project = await service.createProject(
        'Delete Me',
        SAMPLE_PDF,
        alice,
      )
      await service.deleteProject('alice', project.slug, alice)
      expect(store.getBySlug(project.slug)).toBeNull()
    })

    it('throws ForbiddenError for non-owner', async () => {
      const project = await service.createProject(
        'Protected',
        SAMPLE_PDF,
        alice,
      )
      expect(
        service.deleteProject('alice', project.slug, bob),
      ).rejects.toBeInstanceOf(ForbiddenError)
    })

    it('throws UnauthenticatedError when not logged in', async () => {
      const project = await service.createProject(
        'Protected',
        SAMPLE_PDF,
        alice,
      )
      expect(
        service.deleteProject(
          'alice',
          project.slug,
          null as unknown as SessionUser,
        ),
      ).rejects.toBeInstanceOf(UnauthenticatedError)
    })

    it('throws NotFoundError for nonexistent project', async () => {
      expect(
        service.deleteProject('alice', 'nonexistent', alice),
      ).rejects.toBeInstanceOf(NotFoundError)
    })

    it('removes the bare git repo from disk', async () => {
      const project = await service.createProject(
        'To Delete',
        SAMPLE_PDF,
        alice,
      )
      expect(repo.exists(project.slug)).toBe(true)

      await service.deleteProject('alice', project.slug, alice)
      expect(repo.exists(project.slug)).toBe(false)
    })

    it('allows slug to be reused after deletion', async () => {
      const first = await service.createProject('Reusable', SAMPLE_PDF, alice)
      await service.deleteProject('alice', first.slug, alice)

      const second = await service.createProject('Reusable', SAMPLE_PDF, alice)
      // Without filesystem-aware slug uniqueness, this would become 'reusable-2'.
      expect(second.slug).toBe('reusable')
    })
  })

  describe('retryExtraction', () => {
    it('allows owner to retry', async () => {
      const project = await service.createProject('Retry Me', SAMPLE_PDF, alice)

      // Wait for initial extraction to complete
      await waitForStatus(store, project.id, 'ready')

      await service.retryExtraction('alice', project.slug, alice)
      // After calling retryExtraction, status should be extracting
      const updated = store.get(project.id)
      expect(updated?.status).toBe('extracting')
    })

    it('throws ForbiddenError for non-owner', async () => {
      const project = await service.createProject(
        'Not Yours',
        SAMPLE_PDF,
        alice,
      )
      expect(
        service.retryExtraction('alice', project.slug, bob),
      ).rejects.toBeInstanceOf(ForbiddenError)
    })
  })

  describe('forkProject', () => {
    it('allows non-owner to fork', async () => {
      const original = await service.createProject(
        'Original',
        SAMPLE_PDF,
        alice,
      )
      await waitForStatus(store, original.id, 'ready')

      const fork = await service.forkProject('alice', original.slug, bob)
      expect(fork.createdBy).toBe('bob')
      // Slug "original" is taken by alice, so bob's fork gets "original-2"
      expect(fork.slug).toBe('original-2')
      expect(fork.forkedFrom).toBe('alice/original')
    })

    it('fork starts in ready status (no extraction needed)', async () => {
      const original = await service.createProject(
        'Ready Source',
        SAMPLE_PDF,
        alice,
      )
      await waitForStatus(store, original.id, 'ready')

      const fork = await service.forkProject('alice', original.slug, bob)
      expect(fork.status).toBe('ready')
    })

    it('throws BadRequestError when forking own project', async () => {
      const project = await service.createProject('Mine', SAMPLE_PDF, alice)
      expect(
        service.forkProject('alice', project.slug, alice),
      ).rejects.toBeInstanceOf(BadRequestError)
    })

    it('throws UnauthenticatedError when not logged in', async () => {
      const project = await service.createProject('Public', SAMPLE_PDF, alice)
      expect(
        service.forkProject(
          'alice',
          project.slug,
          null as unknown as SessionUser,
        ),
      ).rejects.toBeInstanceOf(UnauthenticatedError)
    })

    it('preserves source content in fork', async () => {
      const original = await service.createProject(
        'With Content',
        SAMPLE_PDF,
        alice,
      )
      await waitForStatus(store, original.id, 'ready')
      await repo.mergeBranch(original.slug, 'import', 'main')

      const fork = await service.forkProject('alice', original.slug, bob)

      // The fork should have the same files as the original
      const pdf = await repo.readFile(
        fork.slug,
        'HEAD',
        `source/${original.slug}.pdf`,
      )
      expect(pdf).not.toBeNull()

      const specBuf = await repo.readFile(
        fork.slug,
        'HEAD',
        'forms/default/spec.json',
      )
      expect(specBuf).not.toBeNull()
      // biome-ignore lint/style/noNonNullAssertion: guarded by expect above
      const spec = JSON.parse(specBuf!.toString())
      expect(spec.title).toBe('Test Form')
    })

    it('records provenance in project.json and SQLite', async () => {
      const original = await service.createProject(
        'Provenance Test',
        SAMPLE_PDF,
        alice,
      )
      await waitForStatus(store, original.id, 'ready')

      const fork = await service.forkProject('alice', original.slug, bob)

      // Check SQLite
      expect(fork.forkedFrom).toBe('alice/provenance-test')

      // Check project.json in git
      const projectJson = await repo.readFile(fork.slug, 'HEAD', 'project.json')
      expect(projectJson).not.toBeNull()
      // biome-ignore lint/style/noNonNullAssertion: guarded by expect above
      const meta = JSON.parse(projectJson!.toString())
      expect(meta.forkedFrom).toBe('alice/provenance-test')
    })

    it('generates unique slug when fork slug already taken', async () => {
      // Alice creates "original", bob forks it (slug = "original")
      const orig = await service.createProject('Original', SAMPLE_PDF, alice)
      await waitForStatus(store, orig.id, 'ready')

      const fork1 = await service.forkProject('alice', orig.slug, bob)
      // "original" is taken by alice, so bob gets "original-2"
      expect(fork1.slug).toBe('original-2')

      // Create a third user who also forks
      const charlie: SessionUser = {
        login: 'charlie',
        name: 'Charlie',
        avatarUrl: 'https://example.com/charlie.png',
      }
      const fork2 = await service.forkProject('alice', orig.slug, charlie)
      expect(fork2.slug).toBe('original-3')
    })
  })

  describe('getProject', () => {
    it('returns project view for existing project', async () => {
      const project = await service.createProject('View Me', SAMPLE_PDF, alice)
      await waitForStatus(store, project.id, 'ready')
      await repo.mergeBranch(project.slug, 'import', 'main')

      const view = await service.getProject('alice', project.slug, alice)
      expect(view.project.name).toBe('View Me')
      expect(view.isOwner).toBe(true)
      expect(view.spec).not.toBeNull()
      expect(view.spec?.title).toBe('Test Form')
      expect(view.formSpec).not.toBeNull()
      expect(view.confidence).not.toBeNull()
      expect(view.history.length).toBeGreaterThan(0)
      expect(view.forkedFrom).toBeNull()
    })

    it('sets isOwner false for non-owner', async () => {
      const project = await service.createProject('Public', SAMPLE_PDF, alice)
      const view = await service.getProject('alice', project.slug, bob)
      expect(view.isOwner).toBe(false)
    })

    it('sets isOwner false for anonymous', async () => {
      const project = await service.createProject('Public', SAMPLE_PDF, alice)
      const view = await service.getProject('alice', project.slug, null)
      expect(view.isOwner).toBe(false)
    })

    it('throws NotFoundError when owner does not match', async () => {
      await service.createProject('My Project', SAMPLE_PDF, alice)
      expect(
        service.getProject('bob', 'my-project', bob),
      ).rejects.toBeInstanceOf(NotFoundError)
    })

    it('returns forkedFrom when project is a fork', async () => {
      const original = await service.createProject(
        'Forked Source',
        SAMPLE_PDF,
        alice,
      )
      await waitForStatus(store, original.id, 'ready')
      const fork = await service.forkProject('alice', original.slug, bob)

      const view = await service.getProject('bob', fork.slug, bob)
      expect(view.forkedFrom).toEqual({
        owner: 'alice',
        slug: original.slug,
      })
    })
  })

  describe('listUserProjects', () => {
    it('lists projects for a user', async () => {
      await service.createProject('Project A', SAMPLE_PDF, alice)
      await service.createProject('Project B', SAMPLE_PDF, alice)
      await service.createProject('Project C', SAMPLE_PDF, bob)

      const aliceProjects = service.listUserProjects('alice')
      expect(aliceProjects).toHaveLength(2)
      expect(aliceProjects.map((p) => p.name).sort()).toEqual([
        'Project A',
        'Project B',
      ])
    })
  })

  describe('getFileContent', () => {
    it('reads file from git repo', async () => {
      const project = await service.createProject(
        'File Test',
        SAMPLE_PDF,
        alice,
      )
      const content = await service.getFileContent(
        'alice',
        project.slug,
        'HEAD',
        'project.json',
      )
      expect(content).not.toBeNull()
      // biome-ignore lint/style/noNonNullAssertion: guarded by expect above
      const meta = JSON.parse(content!.toString())
      expect(meta.name).toBe('File Test')
    })
  })

  describe('getTree', () => {
    it('lists tree entries', async () => {
      const project = await service.createProject(
        'Tree Test',
        SAMPLE_PDF,
        alice,
      )
      const entries = await service.getTree('alice', project.slug, 'HEAD', '')
      const names = entries.map((e) => e.name).sort()
      expect(names).toContain('project.json')
      expect(names).toContain('source')
    })
  })

  describe('getHistory', () => {
    it('returns commit history', async () => {
      const project = await service.createProject(
        'History Test',
        SAMPLE_PDF,
        alice,
      )
      const history = await service.getHistory('alice', project.slug)
      expect(history.length).toBeGreaterThanOrEqual(1)
      expect(history[0].message).toContain('Initialize project')
    })
  })

  describe('getProjectAtRef', () => {
    it('returns project view at specific commit', async () => {
      const project = await service.createProject('Ref Test', SAMPLE_PDF, alice)
      await waitForStatus(store, project.id, 'ready')

      const history = await service.getHistory('alice', project.slug)
      const firstSha = history[history.length - 1].sha

      const view = await service.getProjectAtRef(
        'alice',
        project.slug,
        firstSha,
        alice,
      )
      expect(view.project.name).toBe('Ref Test')
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
