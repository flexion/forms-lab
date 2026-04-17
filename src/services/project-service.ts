import { slugify } from '../shared/slugify'
import type {
  DataCollectionSpec,
  FieldConfidence,
  FormSpec,
  ProjectIndex,
} from '../types/models'
import type { SessionUser } from './auth/session'
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  UnauthenticatedError,
} from './errors'
import type {
  BranchEntry,
  CommitEntry,
  FormProjectRepo,
  TreeEntry,
} from './form-project-repo'
import type { Command } from './forms/shaping/commands'
import { executeBatch } from './forms/shaping/executor'
import type { PdfExtractor } from './pdf-extractor'
import type { ProjectStore } from './storage'

export type { BranchEntry } from './form-project-repo'

export interface ShapingLogEntry {
  timestamp: string
  authorCommit: string
  source: 'llm' | 'manual'
  commands: Command[]
  explanation: string
}

export interface ProjectView {
  project: ProjectIndex
  spec: DataCollectionSpec | null
  formSpec: FormSpec | null
  confidence: FieldConfidence[] | null
  history: CommitEntry[]
  isOwner: boolean
  forkedFrom: { owner: string; slug: string } | null
  currentSha: string
}

export interface ProjectService {
  createProject(
    name: string,
    pdf: Buffer,
    user: SessionUser,
  ): Promise<ProjectIndex>
  getProject(
    owner: string,
    slug: string,
    user: SessionUser | null,
    branch?: string,
  ): Promise<ProjectView>
  listUserProjects(owner: string): ProjectIndex[]
  deleteProject(owner: string, slug: string, user: SessionUser): Promise<void>
  retryExtraction(owner: string, slug: string, user: SessionUser): Promise<void>
  forkProject(
    owner: string,
    slug: string,
    user: SessionUser,
  ): Promise<ProjectIndex>
  getFileContent(
    owner: string,
    slug: string,
    rev: string,
    path: string,
  ): Promise<Buffer | null>
  getTree(
    owner: string,
    slug: string,
    rev: string,
    path: string,
  ): Promise<TreeEntry[]>
  getHistory(
    owner: string,
    slug: string,
    limit?: number,
  ): Promise<CommitEntry[]>
  getProjectAtRef(
    owner: string,
    slug: string,
    sha: string,
    user: SessionUser | null,
  ): Promise<ProjectView>
  updateFormSpec(
    owner: string,
    slug: string,
    formSpec: FormSpec,
    message: string,
    user: SessionUser,
  ): Promise<string>
  getFormSpecHistory(owner: string, slug: string): Promise<CommitEntry[]>
  undoFormSpec(
    owner: string,
    slug: string,
    targetSha: string,
    user: SessionUser,
  ): Promise<string>
  executeCommands(
    owner: string,
    slug: string,
    commands: Command[],
    explanation: string,
    source: 'llm' | 'manual',
    user: SessionUser,
    options?: { branch?: string },
  ): Promise<
    | {
        ok: true
        state: { formSpec: FormSpec; dataSpec: DataCollectionSpec }
        sha: string
      }
    | { ok: false; error: string; failedAt: number; command: Command }
  >
  getShapingLog(
    owner: string,
    slug: string,
    branch?: string,
  ): Promise<ShapingLogEntry[]>
  listBranches(slug: string): Promise<BranchEntry[]>
  createBranch(
    slug: string,
    name: string,
    startPoint: string,
    user: SessionUser,
  ): Promise<void>
  deleteBranch(slug: string, name: string, user: SessionUser): Promise<void>
  getChangedResources(
    slug: string,
    branch: string,
  ): Promise<{ dataSpec: boolean; formSpec: boolean }>
}

export function createProjectService(
  store: ProjectStore,
  repo: FormProjectRepo,
  extractor: PdfExtractor,
): ProjectService {
  function requireAuth(
    user: SessionUser | null | undefined,
  ): asserts user is SessionUser {
    if (!user) throw new UnauthenticatedError()
  }

  function resolveProject(owner: string, slug: string): ProjectIndex {
    const project = store.getBySlug(slug)
    if (!project || project.createdBy !== owner) throw new NotFoundError()
    return project
  }

  function requireOwner(project: ProjectIndex, user: SessionUser): void {
    if (project.createdBy !== user.login) throw new ForbiddenError()
  }

  function generateUniqueSlug(baseName: string): string {
    const base = slugify(baseName)
    let slug = base
    let suffix = 1
    // A slug is only unique when both the SQLite index and the git repo
    // directory are free. Checking the filesystem catches orphaned repos
    // from server crashes or manual cleanup that left SQLite inconsistent.
    while (store.getBySlug(slug) || repo.exists(slug)) {
      suffix++
      slug = `${base}-${suffix}`
    }
    return slug
  }

  function parseForkedFrom(
    forkedFrom: string | null,
  ): { owner: string; slug: string } | null {
    if (!forkedFrom) return null
    const slashIndex = forkedFrom.indexOf('/')
    if (slashIndex === -1) return null
    return {
      owner: forkedFrom.slice(0, slashIndex),
      slug: forkedFrom.slice(slashIndex + 1),
    }
  }

  async function readSpecs(
    slug: string,
    rev = 'main',
    historyRev = 'main',
  ): Promise<{
    spec: DataCollectionSpec | null
    formSpec: FormSpec | null
    confidence: FieldConfidence[] | null
    history: CommitEntry[]
  }> {
    const [specBuf, formBuf, confBuf, history] = await Promise.all([
      repo.readFile(slug, rev, 'forms/default/spec.json'),
      repo.readFile(slug, rev, 'forms/default/form.json'),
      repo.readFile(slug, rev, 'forms/default/confidence.json'),
      repo.log(slug, historyRev),
    ])

    return {
      spec: specBuf ? JSON.parse(specBuf.toString()) : null,
      formSpec: formBuf ? JSON.parse(formBuf.toString()) : null,
      confidence: confBuf ? JSON.parse(confBuf.toString()) : null,
      history,
    }
  }

  function fireAndForgetExtraction(
    projectId: string,
    slug: string,
    pdf: Buffer,
    author: string,
  ): void {
    extractor
      .extract(pdf)
      .then(async (result) => {
        await repo.commit(
          slug,
          [
            {
              path: 'forms/default/spec.json',
              content: Buffer.from(JSON.stringify(result.spec, null, 2)),
            },
            {
              path: 'forms/default/form.json',
              content: Buffer.from(JSON.stringify(result.formSpec, null, 2)),
            },
            {
              path: 'forms/default/confidence.json',
              content: Buffer.from(JSON.stringify(result.confidence, null, 2)),
            },
          ],
          'Extract form specifications',
          author,
        )
        store.update(projectId, { status: 'ready' })
      })
      .catch((err) => {
        store.update(projectId, {
          status: 'error',
          error: err instanceof Error ? err.message : String(err),
        })
      })
  }

  return {
    async createProject(
      name: string,
      pdf: Buffer,
      user: SessionUser,
    ): Promise<ProjectIndex> {
      requireAuth(user)

      const slug = generateUniqueSlug(name)
      const project = store.create({
        name,
        slug,
        createdBy: user.login,
      })

      try {
        await repo.init(slug)
        await repo.commit(
          slug,
          [
            { path: `source/${slug}.pdf`, content: pdf },
            {
              path: 'project.json',
              content: Buffer.from(
                JSON.stringify({ name, slug, createdBy: user.login }, null, 2),
              ),
            },
          ],
          `Initialize project: ${name}`,
          user.login,
        )
      } catch (err) {
        // Git init/commit failed; clean up the SQLite row so the project
        // isn't stuck in 'extracting' forever.
        store.delete(project.id)
        throw err
      }

      fireAndForgetExtraction(project.id, slug, pdf, user.login)

      return project
    },

    async getProject(
      owner: string,
      slug: string,
      user: SessionUser | null,
      branch = 'main',
    ): Promise<ProjectView> {
      const project = resolveProject(owner, slug)
      const isOwner = user?.login === project.createdBy
      const forkedFrom = parseForkedFrom(project.forkedFrom)
      const currentSha = await repo.headSha(slug, 'main')

      if (project.status === 'ready') {
        const { spec, formSpec, confidence, history } = await readSpecs(
          slug,
          branch,
          branch,
        )
        return {
          project,
          spec,
          formSpec,
          confidence,
          history,
          isOwner,
          forkedFrom,
          currentSha,
        }
      }

      return {
        project,
        spec: null,
        formSpec: null,
        confidence: null,
        history: [],
        isOwner,
        forkedFrom,
        currentSha,
      }
    },

    listUserProjects(owner: string): ProjectIndex[] {
      return store.list(owner)
    },

    async deleteProject(
      owner: string,
      slug: string,
      user: SessionUser,
    ): Promise<void> {
      requireAuth(user)
      const project = resolveProject(owner, slug)
      requireOwner(project, user)
      store.delete(project.id)
      // Also remove the bare git repo so the slug can be reused and the
      // disk doesn't fill up with orphaned project data.
      await repo.remove(slug)
    },

    async retryExtraction(
      owner: string,
      slug: string,
      user: SessionUser,
    ): Promise<void> {
      requireAuth(user)
      const project = resolveProject(owner, slug)
      requireOwner(project, user)

      const pdfBuffer = await repo.readFile(slug, 'main', `source/${slug}.pdf`)
      if (!pdfBuffer) {
        store.update(project.id, {
          status: 'error',
          error: 'Source PDF not found in repository',
        })
        return
      }

      store.update(project.id, { status: 'extracting', error: null })
      fireAndForgetExtraction(project.id, slug, pdfBuffer, user.login)
    },

    async forkProject(
      owner: string,
      slug: string,
      user: SessionUser,
    ): Promise<ProjectIndex> {
      requireAuth(user)
      const sourceProject = resolveProject(owner, slug)

      if (owner === user.login) {
        throw new BadRequestError('Cannot fork your own project')
      }

      const forkSlug = generateUniqueSlug(sourceProject.name)
      const forkedFromValue = `${owner}/${sourceProject.slug}`

      await repo.cloneBare(slug, forkSlug)

      // Read existing project.json, add forkedFrom, and commit
      const projectJsonBuf = await repo.readFile(
        forkSlug,
        'HEAD',
        'project.json',
      )
      const projectMeta = projectJsonBuf
        ? JSON.parse(projectJsonBuf.toString())
        : { name: sourceProject.name }
      projectMeta.forkedFrom = forkedFromValue
      projectMeta.createdBy = user.login
      projectMeta.slug = forkSlug

      await repo.commit(
        forkSlug,
        [
          {
            path: 'project.json',
            content: Buffer.from(JSON.stringify(projectMeta, null, 2)),
          },
        ],
        `Fork from ${forkedFromValue}`,
        user.login,
      )

      const forkedProject = store.create({
        name: sourceProject.name,
        slug: forkSlug,
        createdBy: user.login,
        forkedFrom: forkedFromValue,
      })

      // The fork inherits all committed specs from the source via the clone,
      // so there's nothing to extract. Mark it ready immediately.
      return store.update(forkedProject.id, { status: 'ready' })
    },

    async getFileContent(
      owner: string,
      slug: string,
      rev: string,
      path: string,
    ): Promise<Buffer | null> {
      resolveProject(owner, slug)
      return repo.readFile(slug, rev, path)
    },

    async getTree(
      owner: string,
      slug: string,
      rev: string,
      path: string,
    ): Promise<TreeEntry[]> {
      resolveProject(owner, slug)
      return repo.listTree(slug, rev, path)
    },

    async getHistory(
      owner: string,
      slug: string,
      limit?: number,
    ): Promise<CommitEntry[]> {
      resolveProject(owner, slug)
      return repo.log(slug, 'main', undefined, limit)
    },

    async getProjectAtRef(
      owner: string,
      slug: string,
      sha: string,
      user: SessionUser | null,
    ): Promise<ProjectView> {
      const project = resolveProject(owner, slug)
      const isOwner = user?.login === project.createdBy
      const forkedFrom = parseForkedFrom(project.forkedFrom)
      const currentSha = await repo.headSha(slug, 'main')

      const { spec, formSpec, confidence, history } = await readSpecs(slug, sha)
      return {
        project,
        spec,
        formSpec,
        confidence,
        history,
        isOwner,
        forkedFrom,
        currentSha,
      }
    },

    async updateFormSpec(
      owner: string,
      slug: string,
      formSpec: FormSpec,
      message: string,
      user: SessionUser,
    ): Promise<string> {
      requireAuth(user)
      const project = resolveProject(owner, slug)
      requireOwner(project, user)

      return repo.commit(
        slug,
        [
          {
            path: 'forms/default/form.json',
            content: Buffer.from(JSON.stringify(formSpec, null, 2)),
          },
        ],
        message,
        user.login,
      )
    },

    async getFormSpecHistory(
      owner: string,
      slug: string,
    ): Promise<CommitEntry[]> {
      resolveProject(owner, slug)
      return repo.log(slug, 'main', 'forms/default/form.json')
    },

    async undoFormSpec(
      owner: string,
      slug: string,
      targetSha: string,
      user: SessionUser,
    ): Promise<string> {
      requireAuth(user)
      const project = resolveProject(owner, slug)
      requireOwner(project, user)

      const formBuf = await repo.readFile(
        slug,
        targetSha,
        'forms/default/form.json',
      )
      if (!formBuf) {
        throw new BadRequestError('No FormSpec found at that revision')
      }

      return repo.commit(
        slug,
        [{ path: 'forms/default/form.json', content: formBuf }],
        `Undo: revert to ${targetSha.slice(0, 7)}`,
        user.login,
      )
    },

    async executeCommands(
      owner,
      slug,
      commands,
      explanation,
      source,
      user,
      options,
    ) {
      requireAuth(user)
      const project = resolveProject(owner, slug)
      requireOwner(project, user)

      const branch = options?.branch ?? 'main'

      const [formBuf, specBuf, logBuf] = await Promise.all([
        repo.readFile(slug, branch, 'forms/default/form.json'),
        repo.readFile(slug, branch, 'forms/default/spec.json'),
        repo.readFile(slug, branch, 'forms/default/shaping-log.json'),
      ])
      if (!formBuf || !specBuf) {
        throw new BadRequestError('Project has no FormSpec to edit yet')
      }
      const currentFormSpec = JSON.parse(formBuf.toString()) as FormSpec
      const currentDataSpec = JSON.parse(
        specBuf.toString(),
      ) as DataCollectionSpec
      const log: ShapingLogEntry[] = logBuf
        ? (JSON.parse(logBuf.toString()) as ShapingLogEntry[])
        : []

      const batchResult = executeBatch(
        {
          formSpec:
            currentFormSpec as unknown as import('./forms/types').FormSpec,
          dataSpec:
            currentDataSpec as unknown as import('./data-collection/types').DataCollectionSpec,
        },
        commands,
      )
      if (!batchResult.ok) {
        return {
          ok: false as const,
          error: batchResult.error,
          failedAt: batchResult.failedAt,
          command: batchResult.command,
        }
      }

      const timestamp = new Date().toISOString()
      const newEntry: ShapingLogEntry = {
        timestamp,
        authorCommit: '',
        source,
        commands,
        explanation,
      }
      const nextLog = [...log, newEntry]

      const sha = await repo.commit(
        slug,
        [
          {
            path: 'forms/default/form.json',
            content: Buffer.from(
              JSON.stringify(batchResult.state.formSpec, null, 2),
            ),
          },
          {
            path: 'forms/default/spec.json',
            content: Buffer.from(
              JSON.stringify(batchResult.state.dataSpec, null, 2),
            ),
          },
          {
            path: 'forms/default/shaping-log.json',
            content: Buffer.from(JSON.stringify(nextLog, null, 2)),
          },
        ],
        `Apply shaping: ${explanation}`,
        user.login,
        { branch },
      )

      newEntry.authorCommit = sha

      return {
        ok: true as const,
        state: batchResult.state as unknown as {
          formSpec: FormSpec
          dataSpec: DataCollectionSpec
        },
        sha,
      }
    },

    async getShapingLog(
      owner: string,
      slug: string,
      branch = 'main',
    ): Promise<ShapingLogEntry[]> {
      resolveProject(owner, slug)
      const buf = await repo.readFile(
        slug,
        branch,
        'forms/default/shaping-log.json',
      )
      if (!buf) return []
      return JSON.parse(buf.toString()) as ShapingLogEntry[]
    },

    async listBranches(slug: string): Promise<BranchEntry[]> {
      return repo.listBranches(slug)
    },

    async createBranch(
      slug: string,
      name: string,
      startPoint: string,
      user: SessionUser,
    ): Promise<void> {
      requireAuth(user)
      const project = store.getBySlug(slug)
      if (!project) throw new NotFoundError()
      requireOwner(project, user)
      await repo.createBranch(slug, name, startPoint)
    },

    async deleteBranch(
      slug: string,
      name: string,
      user: SessionUser,
    ): Promise<void> {
      requireAuth(user)
      if (name === 'main') {
        throw new BadRequestError('Cannot delete main branch')
      }
      const project = store.getBySlug(slug)
      if (!project) throw new NotFoundError()
      requireOwner(project, user)
      await repo.deleteBranch(slug, name)
    },

    async getChangedResources(
      slug: string,
      branch: string,
    ): Promise<{ dataSpec: boolean; formSpec: boolean }> {
      if (branch === 'main') return { dataSpec: false, formSpec: false }
      const files = await repo.getBranchDiff(slug, 'main', branch)
      return {
        dataSpec: files.includes('forms/default/spec.json'),
        formSpec: files.includes('forms/default/form.json'),
      }
    },
  }
}
