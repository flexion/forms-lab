import type { FC } from 'hono/jsx'
import type { DemoFixture } from '../../../../../fixtures/index'
import { Alert } from '../../../../design-system/components/flex-alert'
import { BranchSwitcher } from '../../../../design-system/components/flex-branch-switcher'
import { SpecBrowser } from '../../../../design-system/components/flex-spec-browser'
import { VariantBadge } from '../../../../design-system/components/flex-variant-badge'
import type { SessionUser } from '../../../../services/auth/session'
import type {
  CommitEntry,
  TreeEntry,
} from '../../../../services/form-project-repo'
import type {
  BranchEntry,
  ProjectView,
} from '../../../../services/project-service'
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
          {isOwnProfile && (
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

export const ProjectOverview: FC<{
  view: ProjectView
  owner: string
  user: SessionUser | null
  viewingSha?: string
  origin?: string
  branches?: BranchEntry[]
  branch?: string
  extractionBadge?: { variantId: string; variantName: string } | null
}> = ({
  view,
  owner,
  user,
  viewingSha,
  origin,
  branches,
  branch = 'main',
  extractionBadge,
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
        <nav class="repo-header__path" aria-label="Repository path">
          <a href={resolveUrl(`/${owner}`)}>{owner}</a>
          <span class="repo-header__path-sep" aria-hidden="true">
            /
          </span>
          <span class="repo-header__path-slug">{project.slug}</span>
          {forkedFrom && (
            <span class="repo-header__fork-badge">
              forked from{' '}
              <a href={resolveUrl(`/${forkedFrom.owner}/${forkedFrom.slug}`)}>
                {forkedFrom.owner}/{forkedFrom.slug}
              </a>
            </span>
          )}
        </nav>
        <div class="repo-header__title-row">
          <h1 class="repo-header__title">{project.name}</h1>
          <div class="repo-header__actions">
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
            {isOwner ? (
              <a
                href={resolveUrl(`${repoBase}/settings`)}
                class="flex-button"
                data-variant="outline"
              >
                Settings
              </a>
            ) : user ? (
              <form method="post" action={resolveUrl(`${repoBase}/fork`)}>
                <button
                  type="submit"
                  class="flex-button"
                  data-variant="outline"
                >
                  Fork
                </button>
              </form>
            ) : (
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
        </div>
      </header>

      <RepoNav owner={owner} slug={project.slug} current="overview" />

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

type RepoTab = 'overview' | 'pulls' | 'history' | 'files'

const RepoNav: FC<{
  owner: string
  slug: string
  current: RepoTab
}> = ({ owner, slug, current }) => {
  const base = `/${owner}/${slug}`
  const tabs: { id: RepoTab; label: string; href: string }[] = [
    { id: 'overview', label: 'Overview', href: base },
    { id: 'pulls', label: 'Pull Requests', href: `${base}/pulls` },
    { id: 'history', label: 'History', href: `${base}/commits` },
    { id: 'files', label: 'Files', href: `${base}/tree/main` },
  ]
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
        <nav class="repo-header__path" aria-label="Repository path">
          <a href={resolveUrl(`/${owner}`)}>{owner}</a>
          <span class="repo-header__path-sep" aria-hidden="true">
            /
          </span>
          <span class="repo-header__path-slug">{project.slug}</span>
          {forkedFrom && (
            <span class="repo-header__fork-badge">
              forked from{' '}
              <a href={resolveUrl(`/${forkedFrom.owner}/${forkedFrom.slug}`)}>
                {forkedFrom.owner}/{forkedFrom.slug}
              </a>
            </span>
          )}
        </nav>
        <div class="repo-header__title-row">
          <h1 class="repo-header__title">{project.name}</h1>
          <div class="repo-header__actions">
            {isOwner && (
              <a
                href={resolveUrl(`${repoBase}/settings`)}
                class="flex-button"
                data-variant="outline"
              >
                Settings
              </a>
            )}
          </div>
        </div>
      </header>

      <RepoNav owner={owner} slug={project.slug} current="pulls" />

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
        <nav class="repo-header__path" aria-label="Repository path">
          <a href={resolveUrl(`/${owner}`)}>{owner}</a>
          <span class="repo-header__path-sep" aria-hidden="true">
            /
          </span>
          <span class="repo-header__path-slug">{project.slug}</span>
        </nav>
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
        <nav class="repo-header__path" aria-label="Repository path">
          <a href={resolveUrl(`/${owner}`)}>{owner}</a>
          <span class="repo-header__path-sep" aria-hidden="true">
            /
          </span>
          <span class="repo-header__path-slug">{project.slug}</span>
        </nav>
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
    <h1>
      <a href={resolveUrl(`/${owner}`)} class="text-muted">
        {owner}
      </a>{' '}
      / {project.name}
    </h1>
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
      <nav class="repo-header__path" aria-label="Repository path">
        <a href={resolveUrl(`/${owner}`)}>{owner}</a>
        <span class="repo-header__path-sep" aria-hidden="true">
          /
        </span>
        <a href={resolveUrl(`/${owner}/${project.slug}`)}>{project.slug}</a>
      </nav>
      <div class="repo-header__title-row">
        <h1 class="repo-header__title">Settings</h1>
      </div>
    </header>

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
}> = ({ entries, owner, slug, ref, path }) => {
  const breadcrumbs = buildBreadcrumbs(owner, slug, ref, path)

  return (
    <div class="l-stack">
      <header class="repo-header">
        <nav class="repo-header__path" aria-label="Repository path">
          <a href={resolveUrl(`/${owner}`)}>{owner}</a>
          <span class="repo-header__path-sep" aria-hidden="true">
            /
          </span>
          <a href={resolveUrl(`/${owner}/${slug}`)}>{slug}</a>
        </nav>
        <div class="repo-header__title-row">
          <h1 class="repo-header__title">Files</h1>
        </div>
      </header>

      <RepoNav owner={owner} slug={slug} current="files" />

      <nav aria-label="Breadcrumb">
        <ol class="l-cluster" style="list-style: none; padding: 0;">
          {breadcrumbs.map((crumb, i) => (
            <li key={crumb.label}>
              {i > 0 && <span class="text-muted"> / </span>}
              {crumb.href ? (
                <a href={resolveUrl(crumb.href)}>{crumb.label}</a>
              ) : (
                <strong>{crumb.label}</strong>
              )}
            </li>
          ))}
        </ol>
      </nav>

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
}> = ({ content, owner, slug, ref, path }) => {
  const breadcrumbs = buildBreadcrumbs(owner, slug, ref, path)
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
        <nav class="repo-header__path" aria-label="Repository path">
          <a href={resolveUrl(`/${owner}`)}>{owner}</a>
          <span class="repo-header__path-sep" aria-hidden="true">
            /
          </span>
          <a href={resolveUrl(`/${owner}/${slug}`)}>{slug}</a>
        </nav>
        <div class="repo-header__title-row">
          <h1 class="repo-header__title">{fileName}</h1>
        </div>
      </header>

      <nav aria-label="Breadcrumb">
        <ol class="l-cluster" style="list-style: none; padding: 0;">
          {breadcrumbs.map((crumb, i) => (
            <li key={crumb.label}>
              {i > 0 && <span class="text-muted"> / </span>}
              {crumb.href ? (
                <a href={resolveUrl(crumb.href)}>{crumb.label}</a>
              ) : (
                <strong>{crumb.label}</strong>
              )}
            </li>
          ))}
        </ol>
      </nav>

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
}> = ({ history, owner, slug }) => (
  <div class="l-stack">
    <header class="repo-header">
      <nav class="repo-header__path" aria-label="Repository path">
        <a href={resolveUrl(`/${owner}`)}>{owner}</a>
        <span class="repo-header__path-sep" aria-hidden="true">
          /
        </span>
        <a href={resolveUrl(`/${owner}/${slug}`)}>{slug}</a>
      </nav>
      <div class="repo-header__title-row">
        <h1 class="repo-header__title">History</h1>
      </div>
    </header>

    <RepoNav owner={owner} slug={slug} current="history" />

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

export const NewProjectPage: FC<{ fixtures: DemoFixture[] }> = ({
  fixtures,
}) => (
  <div class="l-stack">
    <h1>New Project</h1>

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
}> = ({ projects, user }) => {
  const recentProjects = projects.slice(0, 5)
  const hasMore = projects.length > 5

  return (
    <div class="l-stack" data-space="lg">
      <h1>Welcome back, {user.name.split(' ')[0]}</h1>

      <section class="l-stack">
        <div class="l-cluster justify-between" style="align-items: baseline;">
          <h2>Recent projects</h2>
          <a href={resolveUrl('/new')} class="flex-button">
            New Project
          </a>
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

export const LandingPage: FC<{ error?: string | null }> = ({ error }) => {
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
      <h1>Forms Lab</h1>
      <p>
        An LLM-assisted platform for digitizing government forms. Upload a PDF,
        and the system extracts its structure into a reviewable specification --
        fields, types, validation rules, conditional logic -- all
        version-controlled in git.
      </p>

      <section class="l-stack">
        <h2>How it works</h2>
        <ol
          class="l-stack"
          style="list-style-position: inside; padding-left: 0;"
        >
          <li>
            <strong>Upload</strong> a government PDF form
          </li>
          <li>
            <strong>Extract</strong> -- the platform identifies fields,
            groupings, and conditions
          </li>
          <li>
            <strong>Review</strong> -- inspect the extracted specification, flag
            low-confidence fields
          </li>
          <li>
            <strong>Collaborate</strong> -- fork projects, track changes through
            git history
          </li>
        </ol>
      </section>

      <section class="l-stack">
        <h2>Get started</h2>
        <p>
          Sign in with GitHub to create your first project, or browse the{' '}
          <a href={resolveUrl('/catalog')}>catalog</a> to explore the platform's
          architecture and design decisions.
        </p>
        <p>
          <a href={resolveUrl('/auth/signin')} class="flex-button">
            Sign in with GitHub
          </a>
        </p>
      </section>
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

interface Breadcrumb {
  label: string
  href: string | null
}

function buildBreadcrumbs(
  owner: string,
  slug: string,
  ref: string,
  path: string,
): Breadcrumb[] {
  const crumbs: Breadcrumb[] = [
    { label: owner, href: `/${owner}` },
    { label: slug, href: `/${owner}/${slug}` },
    { label: ref, href: `/${owner}/${slug}/tree/${ref}` },
  ]

  if (path) {
    const parts = path.split('/')
    for (let i = 0; i < parts.length; i++) {
      const partialPath = parts.slice(0, i + 1).join('/')
      const isLast = i === parts.length - 1
      crumbs.push({
        label: parts[i],
        href: isLast ? null : `/${owner}/${slug}/tree/${ref}/${partialPath}`,
      })
    }
  }

  return crumbs
}
