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
  CommitEntry,
  FormProjectRepo,
  TreeEntry,
} from './form-project-repo'
import type { PdfExtractor } from './pdf-extractor'
import type { ProjectStore } from './storage'

export interface ProjectView {
  project: ProjectIndex
  spec: DataCollectionSpec | null
  formSpec: FormSpec | null
  confidence: FieldConfidence[] | null
  history: CommitEntry[]
  isOwner: boolean
  forkedFrom: { owner: string; slug: string } | null
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
      repo.log(slug, 'main'),
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
    ): Promise<ProjectView> {
      const project = resolveProject(owner, slug)
      const isOwner = user?.login === project.createdBy
      const forkedFrom = parseForkedFrom(project.forkedFrom)

      if (project.status === 'ready') {
        const { spec, formSpec, confidence, history } = await readSpecs(slug)
        return {
          project,
          spec,
          formSpec,
          confidence,
          history,
          isOwner,
          forkedFrom,
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

      const { spec, formSpec, confidence, history } = await readSpecs(slug, sha)
      return {
        project,
        spec,
        formSpec,
        confidence,
        history,
        isOwner,
        forkedFrom,
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
  }
}
