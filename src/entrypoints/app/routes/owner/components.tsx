import type { FC } from 'hono/jsx'
import type { DemoFixture } from '../../../../../fixtures/index'
import { Alert } from '../../../../design-system/components/flex-alert'
import { BranchSwitcher } from '../../../../design-system/components/flex-branch-switcher'
import { Breadcrumb } from '../../../../design-system/components/flex-breadcrumb'
import { SpecBrowser } from '../../../../design-system/components/flex-spec-browser'
import { VariantBadge } from '../../../../design-system/components/flex-variant-badge'
import { VariantCallout } from '../../../../design-system/components/flex-variant-callout'
import type { SessionUser } from '../../../../services/auth'
import type {
  BranchEntry,
  CommitEntry,
  ProjectView,
  TreeEntry,
} from '../../../../services/projects'
import { resolveUrl } from '../../../../shared/base-path'
import type { ProjectIndex, UserProfile } from '../../../../types/models'

// ConfidenceBadge lives in the design system. Re-exported here for backward
// compatibility with any module that previously imported it from this file.
export { ConfidenceBadge } from '../../../../design-system/components/flex-confidence-badge'

// ---------------------------------------------------------------------------
// 1. ProfilePage
// ---------------------------------------------------------------------------

export const ProfilePage: FC<{
  user: UserProfile
  projects: ProjectIndex[]
  currentUser: SessionUser | null
}> = ({ user, projects, currentUser }) => {
  const isOwnProfile = currentUser?.login === user.login
  return (
    <div class="l-stack" data-space="lg">
      <Breadcrumb items={[{ label: user.login }]} />
      <div
        class="l-cluster"
        style="gap: var(--flex-space-xl); align-items: center;"
      >
        {user.avatarUrl && (
          <img
            src={user.avatarUrl}
            alt=""
            width="64"
            height="64"
            style="border-radius: 50%;"
          />
        )}
        <div>
          <h1 style="margin: 0;">{user.name}</h1>
          <p class="text-muted" style="margin: 0;">
            {user.login}
          </p>
        </div>
      </div>

      <section class="l-stack">
        <div class="l-cluster justify-between" style="align-items: baseline;">
          <h2>Projects</h2>
          {isOwnProfile && projects.length > 0 && (
            <a href={resolveUrl('/new')} class="flex-button">
              New Project
            </a>
          )}
        </div>
        {projects.length === 0 ? (
          <p class="text-muted">
            {isOwnProfile ? (
              <>
                No projects yet.{' '}
                <a href={resolveUrl('/new')}>Create your first project</a>.
              </>
            ) : (
              'No projects yet.'
            )}
          </p>
        ) : (
          <table class="flex-table" data-variant="borderless" data-stacked>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Status</th>
                <th scope="col">Created</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => {
                const created = new Date(p.createdAt * 1000).toLocaleDateString(
                  'en-US',
                  { month: 'short', day: 'numeric', year: 'numeric' },
                )
                const forkedFrom = parseForkedFrom(p.forkedFrom)
                return (
                  <tr key={p.id}>
                    <td data-label="Name">
                      <a href={resolveUrl(`/${p.createdBy}/${p.slug}`)}>
                        <strong>{p.name}</strong>
                      </a>
                      {forkedFrom && (
                        <div class="text-muted text-sm">
                          forked from{' '}
                          <a
                            href={resolveUrl(
                              `/${forkedFrom.owner}/${forkedFrom.slug}`,
                            )}
                          >
                            {forkedFrom.owner}/{forkedFrom.slug}
                          </a>
                        </div>
                      )}
                    </td>
                    <td data-label="Status">
                      <span class="badge" data-status={p.status}>
                        {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                      </span>
                    </td>
                    <td data-label="Created" class="text-muted text-sm">
                      {created}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 2. ProjectOverview
// ---------------------------------------------------------------------------

/**
 * Metadata about a project's policy corpus. When present on
 * ProjectOverview the page renders a short callout identifying the
 * source corpus and summarising the form being built. Routes should
 * resolve this from the RAG service's `getCorpusMetadata(slug)` so
 * the presentation layer stays stateless.
 */
export interface ProjectCorpusInfo {
  slug: string
  formName: string
  formDescription: string
  source: string
}

export const ProjectOverview: FC<{
  view: ProjectView
  owner: string
  user: SessionUser | null
  viewingSha?: string
  origin?: string
  branches?: BranchEntry[]
  branch?: string
  extractionBadge?: { variantId: string; variantName: string } | null
  corpus?: ProjectCorpusInfo | null
}> = ({
  view,
  owner,
  user,
  viewingSha,
  origin,
  branches,
  branch = 'main',
  extractionBadge,
  corpus,
}) => {
  const {
    project,
    spec,
    formSpec,
    confidence,
    isOwner,
    forkedFrom,
    pendingBranch,
  } = view

  if (project.status === 'extracting') {
    return (
      <ExtractingBanner project={project} owner={owner} isOwner={isOwner} />
    )
  }
  if (project.status === 'error') {
    return <ErrorBanner project={project} owner={owner} isOwner={isOwner} />
  }

  // Extraction has landed on a working branch (e.g. 'import') and nothing
  // has been published to main yet. Show a CTA to review/merge the branch.
  if (!spec && pendingBranch) {
    return (
      <PendingReviewBanner
        project={project}
        owner={owner}
        isOwner={isOwner}
        branch={pendingBranch}
        extractionBadge={extractionBadge}
      />
    )
  }

  const groupCount = spec?.groups.length ?? 0
  const fieldCount =
    spec?.groups.reduce((sum, g) => sum + g.requirements.length, 0) ?? 0
  const pageCount = formSpec?.pages.length ?? 0
  const lowConfCount = confidence?.filter((c) => c.confidence < 0.8).length ?? 0
  const blobBasePath = `/${owner}/${project.slug}/blob/${branch}`

  const repoBase = `/${owner}/${project.slug}`
  const cloneUrl = `${origin ?? ''}/git/${project.slug}.git`

  return (
    <div class="l-stack">
      <header class="repo-header">
        <Breadcrumb
          items={[
            { label: owner, href: resolveUrl(`/${owner}`) },
            { label: project.slug },
          ]}
        />
        {forkedFrom && (
          <span class="repo-header__fork-badge">
            forked from{' '}
            <a href={resolveUrl(`/${forkedFrom.owner}/${forkedFrom.slug}`)}>
              {forkedFrom.owner}/{forkedFrom.slug}
            </a>
          </span>
        )}
        <div class="repo-header__title-row">
          <h1 class="repo-header__title">{project.name}</h1>
        </div>
      </header>

      <RepoNav
        owner={owner}
        slug={project.slug}
        current="overview"
        isOwner={isOwner}
      />

      {corpus && (
        <aside
          class="l-stack"
          style="gap: var(--flex-space-xs); padding: var(--flex-space-md); border: 1px solid var(--flex-color-border); border-radius: var(--flex-radius-md); background: var(--flex-color-primary-lighter);"
        >
          <div
            class="l-cluster"
            style="gap: var(--flex-space-sm); align-items: baseline;"
          >
            <strong>Form:</strong>
            <span>{corpus.formName}</span>
            <span class="text-muted text-sm">&middot; built from corpus</span>
            <code class="flex-mono text-sm">{corpus.slug}</code>
            <span class="text-muted text-sm">&middot; {corpus.source}</span>
          </div>
          {corpus.formDescription && (
            <p style="margin: 0;">{corpus.formDescription}</p>
          )}
        </aside>
      )}

      {branches && branches.length > 1 && (
        <BranchSwitcher
          current={branch}
          branches={branches}
          branchHref={(b) =>
            resolveUrl(`/${owner}/${project.slug}?branch=${b}`)
          }
          createHref={resolveUrl(`/${owner}/${project.slug}/edit/main/branch`)}
        />
      )}

      <div class="clone-bar">
        <code class="clone-bar__url">{cloneUrl}</code>
        <button
          type="button"
          class="clone-bar__copy"
          aria-label="Copy git clone command"
          data-clone-cmd={`git -c http.sslVerify=false clone ${cloneUrl}`}
          onclick="navigator.clipboard.writeText(this.dataset.cloneCmd).then(function(){var b=event.target.closest('button');b.textContent='Copied!';setTimeout(function(){b.textContent='Copy'},2000)})"
        >
          Copy
        </button>
        {isOwner && formSpec && (
          <a
            href={resolveUrl(
              branch && branch !== 'main'
                ? `${repoBase}/edit/${branch}`
                : `${repoBase}/edit`,
            )}
            class="flex-button"
          >
            Edit form structure
          </a>
        )}
        {!isOwner && user && (
          <form method="post" action={resolveUrl(`${repoBase}/fork`)}>
            <button type="submit" class="flex-button" data-variant="outline">
              Fork
            </button>
          </form>
        )}
        {!isOwner && !user && (
          <a
            href={resolveUrl(
              `/auth/signin?returnTo=${encodeURIComponent(repoBase)}`,
            )}
            class="flex-button"
            data-variant="outline"
          >
            Sign in to fork
          </a>
        )}
      </div>

      {viewingSha && (
        <div class="flex-alert flex-alert--info" role="status">
          <p>
            Viewing snapshot <code>{viewingSha.slice(0, 8)}</code>.{' '}
            <a href={resolveUrl(repoBase)}>View latest</a>
            {' | '}
            <a href={resolveUrl(`${repoBase}/tree/${viewingSha}`)}>
              Browse repository at this commit
            </a>
          </p>
        </div>
      )}

      {extractionBadge ? (
        <VariantBadge
          task="extraction"
          variantId={extractionBadge.variantId}
          variantName={extractionBadge.variantName}
        />
      ) : null}

      <div class="project-summary">
        <span>
          <strong>{groupCount}</strong> groups
        </span>
        <span>
          <strong>{fieldCount}</strong> fields
        </span>
        <span>
          <strong>{pageCount}</strong> pages
        </span>
        <span>
          <strong>{lowConfCount}</strong> low confidence
        </span>
      </div>

      {spec && formSpec && (
        <SpecBrowser
          dataSpec={spec}
          formSpec={formSpec}
          confidence={confidence ?? []}
          blobBasePath={blobBasePath}
        />
      )}
    </div>
  )
}

export type RepoTab =
  | 'overview'
  | 'forms'
  | 'pulls'
  | 'history'
  | 'files'
  | 'settings'

export const RepoNav: FC<{
  owner: string
  slug: string
  current: RepoTab
  isOwner?: boolean
}> = ({ owner, slug, current, isOwner }) => {
  const base = `/${owner}/${slug}`
  const tabs: { id: RepoTab; label: string; href: string }[] = [
    { id: 'overview', label: 'Overview', href: base },
    { id: 'forms', label: 'Forms', href: `${base}/forms` },
    { id: 'pulls', label: 'Pull Requests', href: `${base}/pulls` },
    { id: 'history', label: 'History', href: `${base}/commits` },
    { id: 'files', label: 'Files', href: `${base}/tree/main` },
  ]
  if (isOwner) {
    tabs.push({ id: 'settings', label: 'Settings', href: `${base}/settings` })
  }
  return (
    <nav class="repo-nav" aria-label="Repository">
      <ul class="repo-nav__list">
        {tabs.map((tab) => (
          <li key={tab.id} class="repo-nav__item">
            <a
              href={resolveUrl(tab.href)}
              class={`repo-nav__link${tab.id === current ? ' repo-nav__link--current' : ''}`}
              aria-current={tab.id === current ? 'page' : undefined}
            >
              {tab.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

// ---------------------------------------------------------------------------
// 2b. PullRequestsPage
// ---------------------------------------------------------------------------

export const PullRequestsPage: FC<{
  view: ProjectView
  owner: string
  branches: BranchEntry[]
}> = ({ view, owner, branches }) => {
  const { project, isOwner, forkedFrom } = view
  const repoBase = `/${owner}/${project.slug}`
  const openPRs = branches.filter((b) => b.name !== 'main' && b.ahead > 0)

  return (
    <div class="l-stack">
      <header class="repo-header">
        <Breadcrumb
          items={[
            { label: owner, href: resolveUrl(`/${owner}`) },
            { label: project.slug },
          ]}
        />
        {forkedFrom && (
          <span class="repo-header__fork-badge">
            forked from{' '}
            <a href={resolveUrl(`/${forkedFrom.owner}/${forkedFrom.slug}`)}>
              {forkedFrom.owner}/{forkedFrom.slug}
            </a>
          </span>
        )}
        <div class="repo-header__title-row">
          <h1 class="repo-header__title">{project.name}</h1>
        </div>
      </header>

      <RepoNav
        owner={owner}
        slug={project.slug}
        current="pulls"
        isOwner={isOwner}
      />

      <section class="l-stack">
        <h2>Open</h2>
        {openPRs.length === 0 ? (
          <p class="text-muted">No open pull requests.</p>
        ) : (
          <table class="flex-table" data-variant="borderless" data-stacked>
            <thead>
              <tr>
                <th scope="col">Branch</th>
                <th scope="col">Ahead</th>
                <th scope="col" />
              </tr>
            </thead>
            <tbody>
              {openPRs.map((b) => (
                <tr key={b.name}>
                  <td data-label="Branch">
                    <a
                      href={resolveUrl(`${repoBase}/compare/main...${b.name}`)}
                    >
                      {b.name}
                    </a>
                  </td>
                  <td data-label="Ahead">
                    {b.ahead} commit{b.ahead === 1 ? '' : 's'} ahead
                  </td>
                  <td>
                    <a
                      href={resolveUrl(`${repoBase}/compare/main...${b.name}`)}
                      class="flex-button"
                      data-variant="outline"
                    >
                      Review
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <h2>Merged</h2>
        <p class="text-muted">Merged pull requests are not tracked yet.</p>
      </section>
    </div>
  )
}

const ExtractingBanner: FC<{
  project: ProjectIndex
  owner: string
  isOwner: boolean
}> = ({ project, owner, isOwner }) => {
  const startedAt = project.updatedAt * 1000
  const elapsedMs = Date.now() - startedAt
  const stuck = elapsedMs > 2 * 60 * 1000 // 2 minutes
  return (
    <div class="l-stack">
      {!stuck && <meta http-equiv="refresh" content="3" />}
      <header class="repo-header">
        <Breadcrumb
          items={[
            { label: owner, href: resolveUrl(`/${owner}`) },
            { label: project.slug },
          ]}
        />
        <div class="repo-header__title-row">
          <h1 class="repo-header__title">{project.name}</h1>
          {isOwner && (
            <div class="repo-header__actions">
              <form
                method="post"
                action={resolveUrl(`/${owner}/${project.slug}/settings`)}
                onsubmit="return confirm('Cancel and delete this project?')"
              >
                <input type="hidden" name="action" value="delete" />
                <button
                  type="submit"
                  class="flex-button"
                  data-variant="outline"
                >
                  Cancel
                </button>
              </form>
            </div>
          )}
        </div>
      </header>
      <div
        class={`flex-alert flex-alert--${stuck ? 'warning' : 'info'}`}
        role="status"
        aria-live="polite"
      >
        {stuck ? (
          <>
            <p>
              <strong>Extraction appears stuck.</strong>
            </p>
            <p>
              This project has been extracting for more than 2 minutes. The
              server may have restarted during extraction.{' '}
              {isOwner && 'Use Cancel to delete and try again.'}
            </p>
          </>
        ) : (
          <>
            <p>
              <strong>Extracting form structure...</strong>
            </p>
            <p>
              This may take up to a minute for large forms. This page will
              refresh automatically.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

const PendingReviewBanner: FC<{
  project: ProjectIndex
  owner: string
  isOwner: boolean
  branch: string
  extractionBadge?: { variantId: string; variantName: string } | null
}> = ({ project, owner, isOwner, branch, extractionBadge }) => {
  const repoBase = `/${owner}/${project.slug}`
  return (
    <div class="l-stack">
      <header class="repo-header">
        <Breadcrumb
          items={[
            { label: owner, href: resolveUrl(`/${owner}`) },
            { label: project.slug },
          ]}
        />
        <div class="repo-header__title-row">
          <h1 class="repo-header__title">{project.name}</h1>
        </div>
      </header>
      {extractionBadge ? (
        <VariantBadge
          task="extraction"
          variantId={extractionBadge.variantId}
          variantName={extractionBadge.variantName}
        />
      ) : null}
      <Alert variant="info" heading="Initial extraction ready for review">
        The imported form lives on branch <code>{branch}</code>. Nothing has
        been published to <code>main</code> yet. Review the extracted structure
        and merge when it looks right, or keep editing if it needs corrections.
      </Alert>
      {isOwner && (
        <div class="l-cluster">
          <a
            href={resolveUrl(`${repoBase}/compare/main...${branch}`)}
            class="flex-button"
          >
            Review import
          </a>
          <a
            href={resolveUrl(`${repoBase}/edit/${branch}`)}
            class="flex-button"
            data-variant="outline"
          >
            Continue editing
          </a>
        </div>
      )}
    </div>
  )
}

const ErrorBanner: FC<{
  project: ProjectIndex
  owner: string
  isOwner: boolean
}> = ({ project, owner, isOwner }) => (
  <div class="l-stack">
    <Breadcrumb
      items={[
        { label: owner, href: resolveUrl(`/${owner}`) },
        { label: project.slug },
      ]}
    />
    <h1>{project.name}</h1>
    <div class="flex-alert flex-alert--error" role="alert">
      <p>
        <strong>Extraction failed</strong>
      </p>
      <p>{project.error ?? 'An unknown error occurred.'}</p>
    </div>
    {isOwner && (
      <div class="l-cluster">
        <form
          method="post"
          action={resolveUrl(`/${owner}/${project.slug}/settings`)}
        >
          <input type="hidden" name="action" value="retry" />
          <button type="submit" class="flex-button">
            Retry Extraction
          </button>
        </form>
      </div>
    )}
  </div>
)

// ---------------------------------------------------------------------------
// 3. SettingsPage
// ---------------------------------------------------------------------------

export const SettingsPage: FC<{
  project: ProjectIndex
  owner: string
}> = ({ project, owner }) => (
  <div class="l-stack">
    <header class="repo-header">
      <Breadcrumb
        items={[
          { label: owner, href: resolveUrl(`/${owner}`) },
          { label: project.slug },
        ]}
      />
      <div class="repo-header__title-row">
        <h1 class="repo-header__title">{project.name}</h1>
      </div>
    </header>

    <RepoNav
      owner={owner}
      slug={project.slug}
      current="settings"
      isOwner={true}
    />

    <section class="l-stack">
      <h2>Extraction</h2>
      <form
        method="post"
        action={resolveUrl(`/${owner}/${project.slug}/settings`)}
      >
        <input type="hidden" name="action" value="retry" />
        <button type="submit" class="flex-button" data-variant="outline">
          Re-extract from source PDF
        </button>
      </form>
    </section>

    <section class="l-stack">
      <h2>Danger zone</h2>
      <form
        method="post"
        action={resolveUrl(`/${owner}/${project.slug}/settings`)}
        onsubmit="return confirm('Are you sure you want to delete this project? This action cannot be undone.')"
      >
        <input type="hidden" name="action" value="delete" />
        <button type="submit" class="flex-button" data-variant="destructive">
          Delete project
        </button>
      </form>
    </section>
  </div>
)

// ---------------------------------------------------------------------------
// 4. TreePage
// ---------------------------------------------------------------------------

export const TreePage: FC<{
  entries: TreeEntry[]
  owner: string
  slug: string
  ref: string
  path: string
  isOwner?: boolean
  projectName?: string
}> = ({ entries, owner, slug, ref, path, isOwner, projectName }) => {
  const pathSegments = path ? path.split('/') : []

  return (
    <div class="l-stack">
      <header class="repo-header">
        <Breadcrumb
          variant="wrap"
          items={[
            { label: owner, href: resolveUrl(`/${owner}`) },
            { label: slug, href: resolveUrl(`/${owner}/${slug}`) },
            { label: 'tree' },
            { label: ref },
            ...pathSegments.map((seg, i) => ({
              label: seg,
              href:
                i < pathSegments.length - 1
                  ? resolveUrl(
                      `/${owner}/${slug}/tree/${ref}/${pathSegments.slice(0, i + 1).join('/')}`,
                    )
                  : undefined,
            })),
          ]}
        />
        <div class="repo-header__title-row">
          <h1 class="repo-header__title">{projectName ?? slug}</h1>
        </div>
      </header>

      <RepoNav owner={owner} slug={slug} current="files" isOwner={isOwner} />

      <table class="flex-table" data-variant="borderless">
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Type</th>
          </tr>
        </thead>
        <tbody>
          {entries
            .sort((a, b) => {
              if (a.type === b.type) return a.name.localeCompare(b.name)
              return a.type === 'tree' ? -1 : 1
            })
            .map((entry) => {
              const entryPath = path ? `${path}/${entry.name}` : entry.name
              const href =
                entry.type === 'tree'
                  ? `/${owner}/${slug}/tree/${ref}/${entryPath}`
                  : `/${owner}/${slug}/blob/${ref}/${entryPath}`
              return (
                <tr key={entry.name}>
                  <td>
                    <a href={resolveUrl(href)}>
                      {entry.type === 'tree' ? `${entry.name}/` : entry.name}
                    </a>
                  </td>
                  <td class="text-muted text-sm">
                    {entry.type === 'tree' ? 'Directory' : 'File'}
                  </td>
                </tr>
              )
            })}
        </tbody>
      </table>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 5. BlobPage
// ---------------------------------------------------------------------------

export const BlobPage: FC<{
  content: Buffer
  owner: string
  slug: string
  ref: string
  path: string
  isOwner?: boolean
  projectName?: string
}> = ({ content, owner, slug, ref, path, isOwner, projectName }) => {
  const pathSegments = path ? path.split('/') : []
  const fileName = path.split('/').pop() ?? path
  const isJson = fileName.endsWith('.json')
  const isPdf = fileName.endsWith('.pdf')
  const isSpecJson = fileName === 'spec.json' || fileName === 'form.json'

  let displayContent: string
  if (isPdf) {
    displayContent = `[Binary file: ${fileName}]`
  } else if (isJson) {
    try {
      displayContent = JSON.stringify(JSON.parse(content.toString()), null, 2)
    } catch {
      displayContent = content.toString()
    }
  } else {
    displayContent = content.toString()
  }

  return (
    <div class="l-stack">
      <header class="repo-header">
        <Breadcrumb
          variant="wrap"
          items={[
            { label: owner, href: resolveUrl(`/${owner}`) },
            { label: slug, href: resolveUrl(`/${owner}/${slug}`) },
            { label: 'blob' },
            { label: ref },
            ...pathSegments.map((seg, i) => ({
              label: seg,
              href:
                i < pathSegments.length - 1
                  ? resolveUrl(
                      `/${owner}/${slug}/tree/${ref}/${pathSegments.slice(0, i + 1).join('/')}`,
                    )
                  : undefined,
            })),
          ]}
        />
        <div class="repo-header__title-row">
          <h1 class="repo-header__title">{projectName ?? slug}</h1>
        </div>
      </header>

      <RepoNav owner={owner} slug={slug} current="files" isOwner={isOwner} />

      {isSpecJson && (
        <p>
          <a href={resolveUrl(`/${owner}/${slug}`)}>
            View as rendered specification
          </a>
        </p>
      )}

      {isPdf ? (
        <p>
          <a
            href={resolveUrl(`/${owner}/${slug}/blob/${ref}/${path}?raw=true`)}
            class="flex-button"
            data-variant="outline"
          >
            Download {fileName}
          </a>
        </p>
      ) : (
        <pre>
          <code>{displayContent}</code>
        </pre>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// 6. CommitListPage
// ---------------------------------------------------------------------------

export const CommitListPage: FC<{
  history: CommitEntry[]
  owner: string
  slug: string
  isOwner?: boolean
  projectName?: string
}> = ({ history, owner, slug, isOwner, projectName }) => (
  <div class="l-stack">
    <header class="repo-header">
      <Breadcrumb
        items={[
          { label: owner, href: resolveUrl(`/${owner}`) },
          { label: slug },
        ]}
      />
      <div class="repo-header__title-row">
        <h1 class="repo-header__title">{projectName ?? slug}</h1>
      </div>
    </header>

    <RepoNav owner={owner} slug={slug} current="history" isOwner={isOwner} />

    <table class="flex-table" data-variant="borderless" data-stacked>
      <thead>
        <tr>
          <th scope="col">SHA</th>
          <th scope="col">Message</th>
          <th scope="col">Author</th>
          <th scope="col">Date</th>
          <th scope="col">Browse</th>
        </tr>
      </thead>
      <tbody>
        {history.map((entry) => (
          <tr key={entry.sha}>
            <td data-label="SHA">
              <a href={resolveUrl(`/${owner}/${slug}/commit/${entry.sha}`)}>
                <code>{entry.shortSha}</code>
              </a>
            </td>
            <td data-label="Message">{entry.message}</td>
            <td data-label="Author">{entry.author}</td>
            <td data-label="Date" class="text-muted text-sm">
              {entry.date}
            </td>
            <td data-label="Browse">
              <a href={resolveUrl(`/${owner}/${slug}/tree/${entry.sha}`)}>
                Tree
              </a>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

// ---------------------------------------------------------------------------
// 7. ErrorPage
// ---------------------------------------------------------------------------

export const ErrorPage: FC<{
  statusCode: number
  message: string
}> = ({ statusCode, message }) => (
  <div class="l-stack">
    <h1>{statusCode}</h1>
    <p>{message}</p>
  </div>
)

// ---------------------------------------------------------------------------
// 8. NewProjectPage (updated for /:owner URL structure)
// ---------------------------------------------------------------------------

export interface CorpusChoice {
  slug: string
  formName: string
  formDescription: string
}

export const NewProjectPage: FC<{
  fixtures: DemoFixture[]
  corpora: CorpusChoice[]
  extractionVariant: {
    name: string
    description: string
    evaluationSummary: string
    catalogHref: string
  }
}> = ({ fixtures, corpora, extractionVariant }) => (
  <div class="l-stack">
    <h1>New Project</h1>

    <VariantCallout
      taskLabel="Extraction model"
      variantName={extractionVariant.name}
      variantDescription={extractionVariant.description}
      evaluationSummary={extractionVariant.evaluationSummary}
      changeHref={resolveUrl('/settings/variants?task=extraction')}
      catalogHref={extractionVariant.catalogHref}
    />

    <section class="l-stack">
      <h2>Start from a demo form</h2>
      <div class="l-grid">
        {fixtures.map((f) => (
          <form method="post" action={resolveUrl('/new')}>
            <input type="hidden" name="fixture" value={f.slug} />
            <button type="submit" class="flex-card fixture-card">
              <div class="l-stack" style="gap: var(--flex-space-2xs);">
                <strong>{f.name}</strong>
                <span class="text-muted text-sm">{f.description}</span>
              </div>
            </button>
          </form>
        ))}
      </div>
    </section>

    {corpora.length > 0 && (
      <section class="l-stack">
        <h2>Create from policy corpus (no PDF)</h2>
        <p class="text-muted text-sm">
          Build a form from a curated regulatory corpus using the RAG-driven
          authoring pipeline. Each corpus covers a specific government form.
        </p>
        <div class="l-grid">
          {corpora.map((c) => (
            <form method="post" action={resolveUrl('/new')}>
              <input type="hidden" name="corpus" value={c.slug} />
              <button type="submit" class="flex-card fixture-card">
                <div class="l-stack" style="gap: var(--flex-space-2xs);">
                  <strong>{c.formName}</strong>
                  <span class="text-muted text-sm">{c.formDescription}</span>
                </div>
              </button>
            </form>
          ))}
        </div>
      </section>
    )}

    <section class="l-stack">
      <h2>Upload your own PDF</h2>
      <form
        method="post"
        action={resolveUrl('/new')}
        enctype="multipart/form-data"
      >
        <div class="l-stack">
          <flex-file-input>
            <label class="flex-label" for="pdf-upload">
              PDF form
            </label>
            <span class="flex-file-input__hint" id="pdf-upload-hint">
              Select a government PDF form to extract
            </span>
            <div class="flex-file-input__target">
              <div class="flex-file-input__instructions" aria-hidden="true">
                Drag file here or{' '}
                <span class="flex-file-input__choose">choose from folder</span>
              </div>
              <input
                class="flex-file-input__input"
                id="pdf-upload"
                name="pdf"
                type="file"
                accept=".pdf,application/pdf"
                aria-describedby="pdf-upload-hint"
              />
            </div>
            <div class="flex-file-input__preview-area" />
          </flex-file-input>
          <div>
            <button type="submit" class="flex-button">
              Upload and Extract
            </button>
          </div>
        </div>
      </form>
    </section>
  </div>
)

// ---------------------------------------------------------------------------
// 9. Dashboard
// ---------------------------------------------------------------------------

export const Dashboard: FC<{
  projects: ProjectIndex[]
  user: SessionUser
  compact?: boolean
}> = ({ projects, user, compact }) => {
  const recentProjects = projects.slice(0, 5)
  const hasMore = projects.length > 5

  return (
    <div class="l-stack" data-space="lg">
      {!compact && <h1>Welcome back, {user.name.split(' ')[0]}</h1>}

      <section class="l-stack">
        <div class="l-cluster justify-between" style="align-items: baseline;">
          <h2>Recent projects</h2>
          {recentProjects.length > 0 && (
            <a href={resolveUrl('/new')} class="flex-button">
              New Project
            </a>
          )}
        </div>
        {recentProjects.length === 0 ? (
          <div class="l-stack">
            <p>
              Upload a government PDF form and the platform will extract its
              structure into a reviewable, version-controlled specification.
            </p>
            <p>
              <a href={resolveUrl('/new')} class="flex-button">
                Create your first project
              </a>
            </p>
          </div>
        ) : (
          <>
            <table class="flex-table" data-variant="borderless" data-stacked>
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentProjects.map((p) => {
                  const forkedFrom = parseForkedFrom(p.forkedFrom)
                  return (
                    <tr key={p.id}>
                      <td data-label="Name">
                        <a href={resolveUrl(`/${user.login}/${p.slug}`)}>
                          <strong>{p.name}</strong>
                        </a>
                        {forkedFrom && (
                          <span class="text-muted text-sm">
                            {' '}
                            forked from{' '}
                            <a
                              href={resolveUrl(
                                `/${forkedFrom.owner}/${forkedFrom.slug}`,
                              )}
                            >
                              {forkedFrom.owner}/{forkedFrom.slug}
                            </a>
                          </span>
                        )}
                      </td>
                      <td data-label="Status">
                        <span class="badge" data-status={p.status}>
                          {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {hasMore && (
              <p>
                <a href={resolveUrl(`/${user.login}`)}>
                  View all {projects.length} projects
                </a>
              </p>
            )}
          </>
        )}
      </section>

      <section class="l-stack">
        <h2>Explore</h2>
        <p class="text-muted">
          Browse the <a href={resolveUrl('/catalog')}>project catalog</a> for
          architecture decisions, design system components, and documentation.
        </p>
      </section>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 10. LandingPage
// ---------------------------------------------------------------------------

const AUTH_ERROR_MESSAGES: Record<string, { heading: string; body: string }> = {
  unauthorized: {
    heading: 'Access denied',
    body: 'Your GitHub account is not on the allowlist for this instance. Contact the administrator to request access.',
  },
  access_denied: {
    heading: 'Access denied',
    body: 'Your GitHub account is not on the allowlist for this instance. Contact the administrator to request access.',
  },
  config: {
    heading: 'Sign-in is not configured',
    body: 'The server is missing OAuth credentials. Contact the administrator.',
  },
  invalid_request: {
    heading: 'Invalid sign-in request',
    body: 'The OAuth callback was missing required parameters. Try signing in again.',
  },
  invalid_state: {
    heading: 'Invalid sign-in request',
    body: 'The OAuth state parameter could not be validated. Try signing in again.',
  },
  auth_failed: {
    heading: 'Sign-in failed',
    body: 'Something went wrong while exchanging your GitHub authorization. Try again, and if it keeps failing contact the administrator.',
  },
}

export const GetInvolved: FC = () => {
  return (
    <div class="l-stack" data-space="lg">
      <section class="l-stack">
        <h2>Get involved</h2>
        <p>
          <a href={resolveUrl('/auth/signin')} class="flex-button">
            Try it — sign in with GitHub
          </a>
        </p>
        <p>
          <a href={resolveUrl('/catalog')}>Learn more in the catalog</a>
        </p>
      </section>
    </div>
  )
}

export const LandingPage: FC<{
  error?: string | null
}> = ({ error }) => {
  const errorInfo = error ? AUTH_ERROR_MESSAGES[error] : null
  return (
    <div class="l-stack" data-space="lg">
      {errorInfo && (
        <div class="flex-alert flex-alert--error" role="alert">
          <p>
            <strong>{errorInfo.heading}</strong>
          </p>
          <p>{errorInfo.body}</p>
        </div>
      )}

      <section class="l-stack">
        <h1>Forms shouldn't be this hard.</h1>
        <p>
          Forms Lab is an experiment in making high-quality digital forms
          achievable for any public sector organization. It combines practical
          experience from federal forms work with LLM capabilities to collapse
          the cost of turning paper forms into accessible, modern experiences.
        </p>
        <p>
          Too many agencies are stuck with PDFs — not because they lack
          ambition, but because procurement timelines, authority-to-operate
          processes, and limited development capacity make change expensive.
          Forms Lab is designed to change that equation.
        </p>
      </section>

      <section class="l-stack">
        <h2>What it does</h2>
        <dl class="l-grid" style="--grid-min: 300px">
          <div>
            <dt>
              <strong>Upload a PDF, get a structured specification</strong>
            </dt>
            <dd>
              Agencies have forms locked in PDFs. Extracting their logic
              manually takes weeks. LLM-assisted extraction collapses that to
              minutes — fields, types, validation rules, conditional logic, all
              captured in a reviewable spec.
            </dd>
          </div>
          <div>
            <dt>
              <strong>Shape the experience through conversation</strong>
            </dt>
            <dd>
              Designing accessible, plain-language forms usually requires
              specialized UX talent. Here, you describe what you want and the
              system produces it — page structure, field labels, help text,
              conditional flow.
            </dd>
          </div>
          <div>
            <dt>
              <strong>Deliver forms that meet people where they are</strong>
            </dt>
            <dd>
              Responsive, accessible, mobile-friendly. The kind of experience
              the public deserves but most agencies can't afford to build from
              scratch.
            </dd>
          </div>
          <div>
            <dt>
              <strong>Own your data, track every change</strong>
            </dt>
            <dd>
              Form definitions are version-controlled, not locked in a vendor's
              database. Fork, adapt, collaborate — like code.
            </dd>
          </div>
        </dl>
      </section>

      <hr style="border: 0; border-top: 1px solid var(--flex-color-border); margin-block: var(--flex-space-lg) var(--flex-space-md);" />
      <p style="text-align: center;">
        <small>
          Forms Lab grew out of Flexion's{' '}
          <a href="https://www.manning.com/books/llms-in-production">
            LLMs In Production
          </a>{' '}
          <a href="https://github.com/flexion/llm-class-2026-winter-cohort">
            class
          </a>
          , building on experience from the{' '}
          <a href="https://github.com/gsa-tts/forms">10x Form Platform</a> (
          <a href="https://github.com/flexion/forms">Flexion fork</a>).
        </small>
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
