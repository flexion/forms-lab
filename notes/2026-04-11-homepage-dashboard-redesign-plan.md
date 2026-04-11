# Homepage Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the deployment dashboard card grid with a responsive table layout featuring expandable row details, sorted by most recently updated, with combined health badges and PR status tags.

**Architecture:** CSS grid of `<details>` elements that looks like a table on wide screens and stacks to cards on narrow screens. A static header row provides column labels. Each row expands to show full commit message, health errors, and operational metadata. The data layer adds descending date sorting to the existing `getDeploymentSummary()`.

**Tech Stack:** Bun, Hono (server-rendered JSX), CSS custom properties (`--flex-*` tokens), cascade layers

**Worktree:** `/home/daniel/src/forms-lab/.worktrees/infra-2026-04-11-homepage-dashboard`

---

### Task 1: Sort deployments by commit date

**Files:**
- Create: `test/deployment-table.test.tsx`
- Modify: `src/services/deployment-metadata.ts:318-334`

- [ ] **Step 1: Write the failing test**

Create `test/deployment-table.test.tsx`:

```tsx
import { describe, expect, it } from 'bun:test'
import type { DeploymentInfo, DeploymentSummary } from '../src/types/deployment'

function makeDeployment(branch: string, date: string): DeploymentInfo {
  return {
    branch,
    port: 3001,
    url: `/${branch}/`,
    commit: {
      sha: 'abc123',
      shortSha: 'abc123',
      message: `commit on ${branch}`,
      author: 'Dev',
      date,
      githubUrl: `https://github.com/flexion/forms-lab/commit/abc123`,
    },
    service: { status: 'running' },
    health: { status: 'healthy', lastCheck: new Date().toISOString() },
  }
}

export { makeDeployment }
```

This file will accumulate all deployment-table tests across tasks. The `makeDeployment` helper is exported for reuse.

No test assertion yet -- this step just creates the file and helper.

- [ ] **Step 2: Write the sorting test**

Add to `test/deployment-table.test.tsx`:

```tsx
import { sortDeploymentsByDate } from '../src/services/deployment-metadata'

describe('sortDeploymentsByDate', () => {
  it('sorts deployments most recently updated first', () => {
    const old = makeDeployment('old-branch', '2026-04-01T00:00:00Z')
    const mid = makeDeployment('mid-branch', '2026-04-05T00:00:00Z')
    const recent = makeDeployment('recent-branch', '2026-04-10T00:00:00Z')

    const sorted = sortDeploymentsByDate([old, recent, mid])

    expect(sorted[0].branch).toBe('recent-branch')
    expect(sorted[1].branch).toBe('mid-branch')
    expect(sorted[2].branch).toBe('old-branch')
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd /home/daniel/src/forms-lab/.worktrees/infra-2026-04-11-homepage-dashboard && bun test test/deployment-table.test.tsx`

Expected: FAIL -- `sortDeploymentsByDate` is not exported from `deployment-metadata.ts`.

- [ ] **Step 4: Implement sortDeploymentsByDate**

In `src/services/deployment-metadata.ts`, add before the `getDeploymentSummary` function:

```typescript
export function sortDeploymentsByDate(
  deployments: DeploymentInfo[],
): DeploymentInfo[] {
  return [...deployments].sort(
    (a, b) => new Date(b.commit.date).getTime() - new Date(a.commit.date).getTime(),
  )
}
```

Then use it in `getDeploymentSummary()` -- change the return statement from:

```typescript
  return {
    totalDeployments: deployments.length,
    healthyDeployments,
    failedDeployments,
    deployments,
  }
```

to:

```typescript
  return {
    totalDeployments: deployments.length,
    healthyDeployments,
    failedDeployments,
    deployments: sortDeploymentsByDate(deployments),
  }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd /home/daniel/src/forms-lab/.worktrees/infra-2026-04-11-homepage-dashboard && bun test test/deployment-table.test.tsx`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
cd /home/daniel/src/forms-lab/.worktrees/infra-2026-04-11-homepage-dashboard
git add test/deployment-table.test.tsx src/services/deployment-metadata.ts
git commit -m "feat(homepage): sort deployments by commit date descending"
```

---

### Task 2: Create DeploymentTable component with helper functions

**Files:**
- Create: `src/app/components/deployment-table.tsx`
- Modify: `test/deployment-table.test.tsx`

- [ ] **Step 1: Write tests for helper functions**

Add to `test/deployment-table.test.tsx`:

```tsx
import {
  getCombinedHealthLabel,
  getCombinedHealthStatus,
  relativeTime,
} from '../src/app/components/deployment-table'

describe('getCombinedHealthStatus', () => {
  it('returns healthy when service running and health healthy', () => {
    expect(getCombinedHealthStatus('running', 'healthy')).toBe('healthy')
  })

  it('returns failed when service failed', () => {
    expect(getCombinedHealthStatus('failed', 'healthy')).toBe('failed')
  })

  it('returns unhealthy when health unhealthy', () => {
    expect(getCombinedHealthStatus('running', 'unhealthy')).toBe('unhealthy')
  })

  it('returns unknown when health unknown', () => {
    expect(getCombinedHealthStatus('running', 'unknown')).toBe('unknown')
  })

  it('returns inactive when service inactive', () => {
    expect(getCombinedHealthStatus('inactive', 'unknown')).toBe('inactive')
  })
})

describe('getCombinedHealthLabel', () => {
  it('returns Healthy for healthy status', () => {
    expect(getCombinedHealthLabel('healthy')).toBe('Healthy')
  })

  it('returns Failed for failed status', () => {
    expect(getCombinedHealthLabel('failed')).toBe('Failed')
  })

  it('returns Unhealthy for unhealthy status', () => {
    expect(getCombinedHealthLabel('unhealthy')).toBe('Unhealthy')
  })

  it('returns Unknown for unknown status', () => {
    expect(getCombinedHealthLabel('unknown')).toBe('Unknown')
  })

  it('returns Inactive for inactive status', () => {
    expect(getCombinedHealthLabel('inactive')).toBe('Inactive')
  })
})

describe('relativeTime', () => {
  it('returns "just now" for recent dates', () => {
    expect(relativeTime(new Date().toISOString())).toBe('just now')
  })

  it('returns minutes for dates within the hour', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    expect(relativeTime(fiveMinAgo)).toBe('5m ago')
  })

  it('returns hours for dates within the day', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
    expect(relativeTime(threeHoursAgo)).toBe('3h ago')
  })

  it('returns days for older dates', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    expect(relativeTime(twoDaysAgo)).toBe('2d ago')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /home/daniel/src/forms-lab/.worktrees/infra-2026-04-11-homepage-dashboard && bun test test/deployment-table.test.tsx`

Expected: FAIL -- imports from `deployment-table` don't exist yet.

- [ ] **Step 3: Write the DeploymentTable component**

Create `src/app/components/deployment-table.tsx`:

```tsx
import type { DeploymentInfo } from '../../types/deployment'
import type { ServiceStatus, HealthStatus } from '../../types/deployment'

type CombinedHealth = 'healthy' | 'unhealthy' | 'failed' | 'unknown' | 'inactive'

export function getCombinedHealthStatus(
  serviceStatus: ServiceStatus,
  healthStatus: HealthStatus,
): CombinedHealth {
  if (serviceStatus === 'failed') return 'failed'
  if (serviceStatus === 'inactive') return 'inactive'
  if (healthStatus === 'unhealthy') return 'unhealthy'
  if (healthStatus === 'unknown') return 'unknown'
  return 'healthy'
}

export function getCombinedHealthLabel(status: CombinedHealth): string {
  const labels: Record<CombinedHealth, string> = {
    healthy: 'Healthy',
    unhealthy: 'Unhealthy',
    failed: 'Failed',
    unknown: 'Unknown',
    inactive: 'Inactive',
  }
  return labels[status]
}

export function relativeTime(isoDate: string): string {
  const date = new Date(isoDate)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'just now'
}

function HealthBadge({ deployment }: { deployment: DeploymentInfo }) {
  const status = getCombinedHealthStatus(
    deployment.service.status,
    deployment.health.status,
  )
  const label = getCombinedHealthLabel(status)

  const colorMap: Record<CombinedHealth, { bg: string; text: string; border: string }> = {
    healthy: {
      bg: 'var(--flex-color-success-lighter)',
      text: 'var(--flex-color-success-darker)',
      border: 'var(--flex-color-success)',
    },
    unhealthy: {
      bg: 'var(--flex-color-error-lighter)',
      text: 'var(--flex-color-error-darker)',
      border: 'var(--flex-color-error)',
    },
    failed: {
      bg: 'var(--flex-color-error-lighter)',
      text: 'var(--flex-color-error-darker)',
      border: 'var(--flex-color-error)',
    },
    unknown: {
      bg: 'var(--flex-color-warning-lighter)',
      text: 'var(--flex-color-warning-darker)',
      border: 'var(--flex-color-warning)',
    },
    inactive: {
      bg: 'var(--flex-color-base-lighter)',
      text: 'var(--flex-color-text-muted)',
      border: 'var(--flex-color-base)',
    },
  }

  const colors = colorMap[status]

  return (
    <span
      class="deployment-table__tag"
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
        borderColor: colors.border,
      }}
    >
      {label}
    </span>
  )
}

function PRCell({ pullRequest }: { pullRequest: DeploymentInfo['pullRequest'] }) {
  if (!pullRequest) {
    return <span class="deployment-table__muted">No PR</span>
  }

  const tagColorMap: Record<string, { bg: string; text: string; border: string }> = {
    open: {
      bg: 'var(--flex-color-success-lighter)',
      text: 'var(--flex-color-success-darker)',
      border: 'var(--flex-color-success)',
    },
    merged: {
      bg: 'var(--flex-color-base-darker)',
      text: 'var(--flex-color-white)',
      border: 'var(--flex-color-base-darker)',
    },
    closed: {
      bg: 'var(--flex-color-base-lighter)',
      text: 'var(--flex-color-text-muted)',
      border: 'var(--flex-color-base)',
    },
  }

  const colors = tagColorMap[pullRequest.status] || tagColorMap.closed

  return (
    <span class="deployment-table__pr">
      <a
        href={pullRequest.url}
        target="_blank"
        rel="noopener noreferrer"
        class="deployment-table__link"
      >
        #{pullRequest.number}
      </a>
      <span
        class="deployment-table__tag"
        style={{
          backgroundColor: colors.bg,
          color: colors.text,
          borderColor: colors.border,
        }}
      >
        {pullRequest.status}
      </span>
    </span>
  )
}

function DeploymentRow({ deployment }: { deployment: DeploymentInfo }) {
  const { branch, url, commit, service, health, pullRequest } = deployment
  const time = relativeTime(commit.date)

  const hasDetail =
    commit.message.length > 50 ||
    (health.error && health.status !== 'healthy') ||
    service.uptime ||
    health.responseTime

  return (
    <details class="deployment-table__row">
      <summary class="deployment-table__summary">
        <span class="deployment-table__cell" data-label="Branch">
          <a href={url} class="deployment-table__link deployment-table__branch">
            {branch}
          </a>
        </span>
        <span class="deployment-table__cell" data-label="Last Updated">
          <time datetime={commit.date} title={new Date(commit.date).toLocaleString()}>
            {time}
          </time>
        </span>
        <span class="deployment-table__cell" data-label="Commit">
          <a
            href={commit.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            class="deployment-table__link deployment-table__sha"
          >
            {commit.shortSha}
          </a>
          <span class="deployment-table__commit-msg" title={commit.message}>
            {commit.message}
          </span>
          <span class="deployment-table__muted">{commit.author}</span>
        </span>
        <span class="deployment-table__cell" data-label="PR">
          <PRCell pullRequest={pullRequest} />
        </span>
        <span class="deployment-table__cell" data-label="Health">
          <HealthBadge deployment={deployment} />
        </span>
      </summary>
      {hasDetail && (
        <div class="deployment-table__detail">
          <dl class="deployment-table__detail-list">
            {commit.message.length > 50 && (
              <>
                <dt>Full commit message</dt>
                <dd>{commit.message}</dd>
              </>
            )}
            {health.error && health.status !== 'healthy' && (
              <>
                <dt>Health error</dt>
                <dd class="deployment-table__error">{health.error}</dd>
              </>
            )}
            {service.uptime && (
              <>
                <dt>Uptime</dt>
                <dd>{service.uptime}</dd>
              </>
            )}
            {health.responseTime && (
              <>
                <dt>Response time</dt>
                <dd>{health.responseTime}ms</dd>
              </>
            )}
          </dl>
        </div>
      )}
    </details>
  )
}

export function DeploymentTable({
  deployments,
}: { deployments: DeploymentInfo[] }) {
  if (deployments.length === 0) {
    return <p>No branches currently deployed.</p>
  }

  return (
    <div class="deployment-table">
      <div class="deployment-table__header" aria-hidden="true">
        <span class="deployment-table__cell" />
        <span class="deployment-table__cell">Branch</span>
        <span class="deployment-table__cell">Last Updated</span>
        <span class="deployment-table__cell">Commit</span>
        <span class="deployment-table__cell">PR</span>
        <span class="deployment-table__cell">Health</span>
      </div>
      {deployments.map((deployment) => (
        <DeploymentRow key={deployment.branch} deployment={deployment} />
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /home/daniel/src/forms-lab/.worktrees/infra-2026-04-11-homepage-dashboard && bun test test/deployment-table.test.tsx`

Expected: PASS for all helper function tests.

- [ ] **Step 5: Commit**

```bash
cd /home/daniel/src/forms-lab/.worktrees/infra-2026-04-11-homepage-dashboard
git add src/app/components/deployment-table.tsx test/deployment-table.test.tsx
git commit -m "feat(homepage): add DeploymentTable component with helper functions"
```

---

### Task 3: Add tests for DeploymentTable JSX rendering

**Files:**
- Modify: `test/deployment-table.test.tsx`

- [ ] **Step 1: Write rendering tests**

Add to `test/deployment-table.test.tsx`:

```tsx
import { DeploymentTable } from '../src/app/components/deployment-table'

describe('DeploymentTable', () => {
  it('renders empty message when no deployments', () => {
    const html = DeploymentTable({ deployments: [] })?.toString() ?? ''
    expect(html).toContain('No branches currently deployed')
  })

  it('renders header row with column labels', () => {
    const deployment = makeDeployment('main', '2026-04-10T00:00:00Z')
    const html = DeploymentTable({ deployments: [deployment] })?.toString() ?? ''

    expect(html).toContain('Branch')
    expect(html).toContain('Last Updated')
    expect(html).toContain('Commit')
    expect(html).toContain('PR')
    expect(html).toContain('Health')
  })

  it('renders branch name linked to deployment URL', () => {
    const deployment = makeDeployment('feature-x', '2026-04-10T00:00:00Z')
    const html = DeploymentTable({ deployments: [deployment] })?.toString() ?? ''

    expect(html).toContain('href="/feature-x/"')
    expect(html).toContain('feature-x')
  })

  it('renders commit SHA linked to GitHub', () => {
    const deployment = makeDeployment('main', '2026-04-10T00:00:00Z')
    const html = DeploymentTable({ deployments: [deployment] })?.toString() ?? ''

    expect(html).toContain('abc123')
    expect(html).toContain('href="https://github.com/flexion/forms-lab/commit/abc123"')
  })

  it('renders combined health badge as Healthy for running+healthy', () => {
    const deployment = makeDeployment('main', '2026-04-10T00:00:00Z')
    const html = DeploymentTable({ deployments: [deployment] })?.toString() ?? ''

    expect(html).toContain('Healthy')
  })

  it('renders combined health badge as Failed for failed service', () => {
    const deployment = makeDeployment('main', '2026-04-10T00:00:00Z')
    deployment.service.status = 'failed'
    const html = DeploymentTable({ deployments: [deployment] })?.toString() ?? ''

    expect(html).toContain('Failed')
  })

  it('renders "No PR" when no pull request', () => {
    const deployment = makeDeployment('main', '2026-04-10T00:00:00Z')
    const html = DeploymentTable({ deployments: [deployment] })?.toString() ?? ''

    expect(html).toContain('No PR')
  })

  it('renders PR number and status when pull request exists', () => {
    const deployment = makeDeployment('feature-x', '2026-04-10T00:00:00Z')
    deployment.pullRequest = {
      number: 42,
      title: 'Add feature X',
      url: 'https://github.com/flexion/forms-lab/pull/42',
      status: 'open',
    }
    const html = DeploymentTable({ deployments: [deployment] })?.toString() ?? ''

    expect(html).toContain('#42')
    expect(html).toContain('href="https://github.com/flexion/forms-lab/pull/42"')
    expect(html).toContain('open')
  })

  it('renders health error in detail section', () => {
    const deployment = makeDeployment('main', '2026-04-10T00:00:00Z')
    deployment.health.status = 'unhealthy'
    deployment.health.error = 'HTTP 502 Bad Gateway'
    const html = DeploymentTable({ deployments: [deployment] })?.toString() ?? ''

    expect(html).toContain('Health error')
    expect(html).toContain('HTTP 502 Bad Gateway')
  })

  it('renders multiple deployments as multiple rows', () => {
    const d1 = makeDeployment('branch-a', '2026-04-10T00:00:00Z')
    const d2 = makeDeployment('branch-b', '2026-04-09T00:00:00Z')
    const html = DeploymentTable({ deployments: [d1, d2] })?.toString() ?? ''

    expect(html).toContain('branch-a')
    expect(html).toContain('branch-b')
  })
})
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `cd /home/daniel/src/forms-lab/.worktrees/infra-2026-04-11-homepage-dashboard && bun test test/deployment-table.test.tsx`

Expected: PASS -- component was already implemented in Task 2.

- [ ] **Step 3: Commit**

```bash
cd /home/daniel/src/forms-lab/.worktrees/infra-2026-04-11-homepage-dashboard
git add test/deployment-table.test.tsx
git commit -m "test(homepage): add rendering tests for DeploymentTable component"
```

---

### Task 4: Add deployment-table CSS and wire into build

**Files:**
- Create: `src/app/components/deployment-table.css`
- Modify: `src/app/public/styles.css:69`

- [ ] **Step 1: Create the CSS file**

Create `src/app/components/deployment-table.css`:

```css
.deployment-table {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--flex-color-base-lighter);
  border-radius: var(--flex-radius-md);
  overflow: hidden;
}

/* Header row */
.deployment-table__header {
  display: grid;
  grid-template-columns: 1.5rem 1.5fr 1fr 2.5fr 1fr 1fr;
  gap: var(--flex-space-2);
  padding: var(--flex-space-2) var(--flex-space-3);
  background-color: var(--flex-color-base-lightest);
  border-bottom: 2px solid var(--flex-color-base-lighter);
  font-size: var(--flex-text-xs);
  font-weight: var(--flex-font-weight-bold);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--flex-color-text-muted);
}

/* Each deployment row */
.deployment-table__row {
  border-bottom: 1px solid var(--flex-color-base-lighter);
}

.deployment-table__row:last-child {
  border-bottom: none;
}

.deployment-table__row:nth-child(even) .deployment-table__summary {
  background-color: var(--flex-color-base-lightest);
}

/* Summary (the visible row) */
.deployment-table__summary {
  display: grid;
  grid-template-columns: 1.5rem 1.5fr 1fr 2.5fr 1fr 1fr;
  gap: var(--flex-space-2);
  padding: var(--flex-space-2) var(--flex-space-3);
  align-items: center;
  cursor: pointer;
  list-style: none;
  font-size: var(--flex-text-sm);
}

.deployment-table__summary::-webkit-details-marker {
  display: none;
}

.deployment-table__summary::marker {
  content: "";
}

/* Disclosure indicator */
.deployment-table__summary::before {
  content: "\25B8";
  font-size: var(--flex-text-xs);
  color: var(--flex-color-text-muted);
  transition: transform 0.15s ease;
}

.deployment-table__row[open] .deployment-table__summary::before {
  transform: rotate(90deg);
}

.deployment-table__summary:hover {
  background-color: var(--flex-color-primary-lightest);
}

/* Cells */
.deployment-table__cell {
  display: flex;
  align-items: center;
  gap: var(--flex-space-1);
  min-width: 0;
}

/* Branch name */
.deployment-table__branch {
  font-weight: var(--flex-font-weight-semibold);
  word-break: break-word;
}

/* Commit SHA */
.deployment-table__sha {
  font-family: var(--flex-font-mono);
  font-size: var(--flex-text-xs);
  flex-shrink: 0;
}

/* Commit message truncation */
.deployment-table__commit-msg {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

/* Links */
.deployment-table__link {
  color: var(--flex-color-primary);
  text-decoration: none;
}

.deployment-table__link:hover {
  text-decoration: underline;
}

/* Muted text */
.deployment-table__muted {
  color: var(--flex-color-text-muted);
  font-size: var(--flex-text-xs);
}

/* PR cell */
.deployment-table__pr {
  display: inline-flex;
  align-items: center;
  gap: var(--flex-space-1);
}

/* Tags (health badges + PR status) */
.deployment-table__tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  font-size: var(--flex-text-2xs);
  font-weight: var(--flex-font-weight-bold);
  border: 1px solid;
  border-radius: var(--flex-radius-md);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
}

/* Expandable detail section */
.deployment-table__detail {
  padding: var(--flex-space-2) var(--flex-space-3);
  padding-left: var(--flex-space-5);
  background-color: var(--flex-color-base-lightest);
  border-top: 1px solid var(--flex-color-base-lighter);
  font-size: var(--flex-text-sm);
}

.deployment-table__detail-list {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: var(--flex-space-1) var(--flex-space-3);
  margin: 0;
}

.deployment-table__detail-list dt {
  font-weight: var(--flex-font-weight-semibold);
  color: var(--flex-color-text-muted);
}

.deployment-table__detail-list dd {
  margin: 0;
}

.deployment-table__error {
  color: var(--flex-color-error);
}

/* Responsive: stack to cards on narrow screens */
@media (max-width: 768px) {
  .deployment-table__header {
    display: none;
  }

  .deployment-table__summary {
    display: flex;
    flex-direction: column;
    gap: var(--flex-space-1);
    align-items: flex-start;
  }

  .deployment-table__summary::before {
    content: none;
  }

  .deployment-table__cell {
    width: 100%;
  }

  .deployment-table__cell::before {
    content: attr(data-label);
    font-size: var(--flex-text-xs);
    font-weight: var(--flex-font-weight-bold);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--flex-color-text-muted);
    min-width: 6rem;
    flex-shrink: 0;
  }

  .deployment-table__detail {
    padding-left: var(--flex-space-3);
  }

  .deployment-table__detail-list {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 2: Add import to styles.css**

In `src/app/public/styles.css`, after the flex-diagram import (line 69), add:

```css
@import "../components/deployment-table.css" layer(block);
```

- [ ] **Step 3: Build CSS to verify**

Run: `cd /home/daniel/src/forms-lab/.worktrees/infra-2026-04-11-homepage-dashboard && bun run build:css`

Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
cd /home/daniel/src/forms-lab/.worktrees/infra-2026-04-11-homepage-dashboard
git add src/app/components/deployment-table.css src/app/public/styles.css
git commit -m "feat(homepage): add deployment table CSS with responsive breakpoint"
```

---

### Task 5: Update homepage server to use DeploymentTable

**Files:**
- Modify: `src/homepage/server.tsx`

- [ ] **Step 1: Replace DeploymentCard grid with DeploymentTable**

In `src/homepage/server.tsx`:

1. Replace the import on line 3:

   From: `import { DeploymentCard } from '../app/components/deployment-card'`
   To: `import { DeploymentTable } from '../app/components/deployment-table'`

2. Replace the deployment cards grid section (lines 148-163):

   From:
   ```tsx
        {/* Deployment cards grid */}
        {summary.deployments.length > 0 ? (
          <div class="l-stack">
            <h2>Active Deployments</h2>
            <div class="l-grid">
              {summary.deployments.map((deployment) => (
                <DeploymentCard
                  key={deployment.branch}
                  deployment={deployment}
                />
              ))}
            </div>
          </div>
        ) : (
          <p>No branches currently deployed.</p>
        )}
   ```

   To:
   ```tsx
        {/* Deployment table */}
        <div class="l-stack">
          <h2>Active Deployments</h2>
          <DeploymentTable deployments={summary.deployments} />
        </div>
   ```

- [ ] **Step 2: Run type check**

Run: `cd /home/daniel/src/forms-lab/.worktrees/infra-2026-04-11-homepage-dashboard && bun run --no-warnings tsc --noEmit`

Expected: No type errors.

- [ ] **Step 3: Run all tests**

Run: `cd /home/daniel/src/forms-lab/.worktrees/infra-2026-04-11-homepage-dashboard && bun test`

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
cd /home/daniel/src/forms-lab/.worktrees/infra-2026-04-11-homepage-dashboard
git add src/homepage/server.tsx
git commit -m "feat(homepage): switch dashboard from card grid to table layout"
```

---

### Task 6: Remove deployment-card.tsx

**Files:**
- Delete: `src/app/components/deployment-card.tsx`

- [ ] **Step 1: Verify no other imports of deployment-card**

Run: `cd /home/daniel/src/forms-lab/.worktrees/infra-2026-04-11-homepage-dashboard && grep -r "deployment-card" --include="*.ts" --include="*.tsx" src/`

Expected: No results (the only import was in `server.tsx`, already changed).

- [ ] **Step 2: Delete the file**

```bash
cd /home/daniel/src/forms-lab/.worktrees/infra-2026-04-11-homepage-dashboard
rm src/app/components/deployment-card.tsx
```

- [ ] **Step 3: Run full check**

Run: `cd /home/daniel/src/forms-lab/.worktrees/infra-2026-04-11-homepage-dashboard && bun run check`

Expected: Lint, type check, and all tests pass.

- [ ] **Step 4: Commit**

```bash
cd /home/daniel/src/forms-lab/.worktrees/infra-2026-04-11-homepage-dashboard
git add -u src/app/components/deployment-card.tsx
git commit -m "refactor(homepage): remove unused DeploymentCard component"
```
