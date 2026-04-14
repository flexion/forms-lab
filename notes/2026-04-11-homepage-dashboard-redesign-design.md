# Homepage Dashboard Redesign

**Date:** 2026-04-11
**Status:** approved
**Branch:** `infra/2026-04-11-homepage-dashboard`

## Context

The deployment dashboard homepage currently uses a card grid layout with individual `DeploymentCard` components. A table/list view would be more scannable, support sorting by update time, and surface PR status more prominently.

## Design

### Approach: Responsive table with expandable row detail

A USWDS-inspired data table on wide screens, with each row expandable via native `<details>` for secondary information. On narrow screens, rows collapse to stacked cards via CSS.

**Implementation note:** Since `<details>` cannot wrap `<tr>` elements in valid HTML, the "table" is built as a CSS grid layout of `<details>` elements. A static header row provides column labels. Each `<details>` has a `<summary>` with column data laid out via CSS grid (visually identical to a table row). This approach is semantically valid, requires no JS, and naturally adapts to the responsive card pattern.

### Data & Sorting

- `getDeploymentSummary()` in `deployment-metadata.ts` sorts deployments by `commit.date` descending (most recently updated first).
- No changes to `DeploymentSummary` or `DeploymentInfo` types.
- Mock data for development mode returns a single-row table.

### Table Columns (wide screen)

| Column | Content | Notes |
|--------|---------|-------|
| Branch | Branch name, linked to deployment URL | Primary identifier |
| Last Updated | Relative time (e.g. "2h ago") with full timestamp in `title` | Sort key |
| Commit | Short SHA (linked to GitHub) + truncated message + author | Truncated via CSS `text-overflow: ellipsis` |
| PR | `#N` linked to GitHub + status tag, or muted "No PR" | Tags use USWDS semantic colors |
| Health | Single combined badge | Collapses service + health into one signal |

### Expandable Row Detail

Each row uses `<details>` to disclose:
- Full commit message (untruncated)
- Health error message (if any)
- Service uptime and response time

### Combined Health Column

Collapses service status and health check into a single badge:
- **Healthy** (green) -- service running and health check passing
- **Unhealthy/Failed** (red) -- service failed or health check failing
- **Unknown** (yellow) -- health check inconclusive
- **Inactive** (gray) -- service not running

### PR Status Tags

Inline `<span>` elements styled after `usa-tag`:
- **Open** -- green (`--flex-color-success-lighter` bg, `--flex-color-success-darker` text)
- **Merged** -- default dark tag (`--flex-color-base-darker` bg, white text)
- **Closed** -- gray (`--flex-color-base-lighter` bg, `--flex-color-text-muted` text)
- **No PR** -- plain muted text, no tag

Uppercase, `--flex-text-2xs`, consistent with existing `StatusBadge` pattern.

### Summary Stats

The three metric cards (Total / Healthy / Failed) remain above the table unchanged.

### Responsive Behavior

**Wide (above 768px):** CSS grid layout matching table appearance -- header row with column labels, each `<details>` summary as a grid row, striped rows via `nth-child`, disclosure marker on the left.

**Narrow (at or below 768px):** Each `<details>` summary switches from grid to stacked block layout. Column labels rendered via `data-label` attributes and `::before` pseudo-elements. Header row hidden. `<details>` expand/collapse works natively.

Reuses the existing 768px breakpoint.

## Files Changed

### Modified
- **`src/homepage/server.tsx`** -- Replace `DeploymentCard` grid with `DeploymentTable` component. Summary stat cards stay.
- **`src/services/deployment-metadata.ts`** -- Sort deployments by `commit.date` descending.

### New
- **`src/app/components/deployment-table.tsx`** -- Table component containing `DeploymentTable`, `DeploymentRow`, `HealthBadge`, `PRTag`, and `RelativeTime`.
- **`src/app/components/deployment-table.css`** -- Table styles using `--flex-*` tokens, cascade layers, responsive breakpoint.

### Removed
- **`src/app/components/deployment-card.tsx`** -- Replaced by the table component.

### Unchanged
- `src/types/deployment.ts`
- `src/services/github.ts`
- `infrastructure/nixos/modules/homepage.nix`
