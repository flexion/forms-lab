import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { mkdirSync, rmSync } from 'node:fs'
import type { SessionUser } from '../../../src/services/auth/session'
import { createFormProjectRepo } from '../../../src/services/form-project-repo'
import { createProjectService } from '../../../src/services/project-service'
import { createProjectStore } from '../../../src/services/storage'
import { testDataSpec, testFormSpec } from '../fixtures'

const TEST_DIR = 'test-data/shaping-commands'
const DB_PATH = `${TEST_DIR}/test.sqlite`
const REPOS_PATH = `${TEST_DIR}/repos`

const testUser: SessionUser = {
  login: 'testuser',
  name: 'Test User',
  avatarUrl: '',
}

const dummyExtractor = {
  async extract() {
    return { spec: testDataSpec, formSpec: testFormSpec, confidence: [] }
  },
}

describe('ProjectService.executeCommands', () => {
  let service: ReturnType<typeof createProjectService>
  let slug: string

  beforeAll(async () => {
    rmSync(TEST_DIR, { recursive: true, force: true })
    mkdirSync(REPOS_PATH, { recursive: true })
    const store = createProjectStore(DB_PATH)
    const repo = createFormProjectRepo(REPOS_PATH)
    // biome-ignore lint/suspicious/noExplicitAny: test dummy extractor
    service = createProjectService(store, repo, dummyExtractor as any)
    const project = await service.createProject(
      'test',
      Buffer.from('fake'),
      testUser,
    )
    slug = project.slug
    // Wait for fire-and-forget extraction to commit the form/spec files
    await new Promise((resolve) => setTimeout(resolve, 500))
    await repo.mergeBranch(slug, 'import', 'main')
  })

  afterAll(() => {
    rmSync(TEST_DIR, { recursive: true, force: true })
  })

  it('executes a command batch and commits to git', async () => {
    const firstPageId = testFormSpec.pages[0].id
    const result = await service.executeCommands(
      testUser.login,
      slug,
      [{ kind: 'renamePage', id: firstPageId, title: 'Renamed' }],
      'Rename first page',
      'manual',
      testUser,
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.state.formSpec.pages[0].title).toBe('Renamed')
    }
  })

  it('appends to the shaping log', async () => {
    const secondPageId = testFormSpec.pages[1]?.id ?? testFormSpec.pages[0].id
    await service.executeCommands(
      testUser.login,
      slug,
      [{ kind: 'renamePage', id: secondPageId, title: 'Second' }],
      'Rename second page',
      'manual',
      testUser,
    )
    const log = await service.getShapingLog(testUser.login, slug)
    expect(log.length).toBeGreaterThanOrEqual(2)
    expect(log[log.length - 1].explanation).toBe('Rename second page')
  })

  it('rejects invalid command batches without committing', async () => {
    const before = await service.getFormSpecHistory(testUser.login, slug)
    const result = await service.executeCommands(
      testUser.login,
      slug,
      [{ kind: 'renamePage', id: 'nope', title: 'x' }],
      'Bad',
      'manual',
      testUser,
    )
    expect(result.ok).toBe(false)
    const after = await service.getFormSpecHistory(testUser.login, slug)
    expect(after.length).toBe(before.length)
  })
})
