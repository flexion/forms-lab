# Screaming Architecture Restructuring — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize `src/` from technical-layer organization into a screaming architecture with four top-level directories: `entrypoints/`, `services/`, `design-system/`, `shared/`.

**Architecture:** Mechanical refactor only — move files, update imports, update infrastructure references. No behavior changes, no new features. The dependency rule (shared → services/design-system → entrypoints) is enforced by directory structure. Types currently in the monolithic `src/types/models.ts` are decomposed into service-owned `types.ts` files.

**Tech Stack:** Bun, Hono, TypeScript, NixOS (infrastructure)

**Working directory:** `/home/daniel/src/forms-lab/.worktrees/screaming-architecture`

---

## File Move Map

This table shows every file's current and target location. Tasks reference this map.

### shared/

| Current | Target |
|---------|--------|
| `src/lib/base-path.ts` | `src/shared/base-path.ts` |
| `src/lib/format-html.ts` | `src/shared/format-html.ts` |
| `src/lib/test-helpers/` (entire directory) | `src/shared/test-helpers/` |
| `src/lib/visual-descriptor/` (entire directory) | `src/shared/visual-descriptor/` |
| `src/types/markdown-it-task-lists.d.ts` | `src/shared/types/markdown-it-task-lists.d.ts` |

### services/

| Current | Target |
|---------|--------|
| `src/services/database.ts` | `src/services/storage.ts` |
| `src/services/form-resolver.ts` | `src/services/forms/resolver.ts` |
| `src/services/form-validation.ts` | `src/services/forms/validation.ts` |
| `src/services/form-navigation.ts` | `src/services/forms/navigation.ts` |
| `src/services/form-session.ts` | `src/services/forms/session.ts` |
| `src/services/submission.ts` | `src/services/forms/submission.ts` |
| `src/services/pdf-extractor.ts` | `src/services/ingestion/pdf-extractor.ts` |
| `src/services/extraction-schemas.ts` | `src/services/ingestion/schemas.ts` |
| `src/services/github.ts` | `src/services/deployment/github.ts` |
| `src/services/deployment-metadata.ts` | `src/services/deployment/metadata.ts` |
| `src/lib/github-oauth.ts` | `src/services/auth/github-oauth.ts` |
| `src/lib/session.ts` | `src/services/auth/session.ts` |
| `src/lib/markdown.ts` | `src/services/content/markdown.ts` |
| `src/notify/client.ts` | `src/services/notifications/client.ts` |
| `src/notify/types.ts` | `src/services/notifications/types.ts` |

New files (type decomposition from `src/types/models.ts`):

| Target | Contents |
|--------|----------|
| `src/services/data-collection/types.ts` | `DataCollectionSpec`, `RequirementGroup`, `DataRequirement`, `FieldType`, `ValidationRule`, `FieldCondition` |
| `src/services/forms/types.ts` | `FormSpec`, `FormPage`, `ResolvedForm`, `ResolvedPage`, `FormSession`, `FieldEntry`, `Submission`, `FormSessionGateway`, `SubmissionGateway`, `FormProject` |
| `src/services/ingestion/types.ts` | `ExtractionResult`, `ExtractionOptions`, `FieldConfidence`, `StoredProject`, `NewProject`, `ProjectStatus` |
| `src/services/auth/types.ts` | `SessionUser` (from `src/lib/session.ts`) |
| `src/services/deployment/types.ts` | contents of `src/types/deployment.ts` |
| `src/services/notifications/types.ts` | already exists as `src/notify/types.ts` — moved |
| `src/services/content/types.ts` | `MarkdownFile` (from `src/lib/markdown.ts`), `Persona`, `Decision`, `ArchitectureDoc`, `Story` |

### design-system/

| Current | Target |
|---------|--------|
| `src/app/components/flex-*/` (all 50+ directories) | `src/design-system/components/flex-*/` |
| `src/app/components/register.ts` | `src/design-system/register.ts` |
| `src/app/components/registry.ts` | `src/design-system/registry.ts` |
| `src/app/components/types.ts` | `src/design-system/types.ts` |
| `src/app/components/conformance-types.ts` | `src/design-system/conformance/types.ts` |

### entrypoints/

| Current | Target |
|---------|--------|
| `src/app/main.ts` | `src/entrypoints/app/main.ts` |
| `src/app/server.tsx` | `src/entrypoints/app/server.tsx` |
| `src/app/middleware/` | `src/entrypoints/app/middleware/` |
| `src/app/routes/` | `src/entrypoints/app/routes/` |
| `src/app/public/` | `src/entrypoints/app/public/` |
| `src/homepage/main.ts` | `src/entrypoints/dashboard/main.ts` |
| `src/homepage/server.tsx` | `src/entrypoints/dashboard/server.tsx` |
| `src/app/components/deployment-table.tsx` | `src/entrypoints/dashboard/deployment-table.tsx` |
| `src/app/components/deployment-table.css` | `src/entrypoints/dashboard/deployment-table.css` |
| `src/webhook/main.ts` | `src/entrypoints/webhook/main.ts` |
| `src/webhook/handler.ts` | `src/entrypoints/webhook/handler.ts` |
| `src/webhook/deploy.ts` | `src/entrypoints/webhook/deploy.ts` |
| `src/notify/main.ts` | `src/entrypoints/notify/main.ts` |
| `src/notify/slack.ts` | `src/entrypoints/notify/slack.ts` |
| `src/cli.ts` | `src/entrypoints/cli/main.ts` |
| `src/commands/` (all files) | `src/entrypoints/cli/commands/` |

### Deleted after decomposition

| File | Reason |
|------|--------|
| `src/types/models.ts` | Decomposed into service-owned `types.ts` files |
| `src/types/deployment.ts` | Moved to `src/services/deployment/types.ts` |
| `src/lib/` (entire directory) | All files moved to `shared/` or `services/` |
| `src/notify/` (entire directory) | Split between `entrypoints/notify/` and `services/notifications/` |

---

## Task Sequence

Tasks are ordered leaf-to-root: shared (no deps) → services → design-system → entrypoints → infrastructure → cleanup. Each task ends with a passing `bun run check`.

---

### Task 1: Create `src/shared/` — move pure utilities

**Files:**
- Move: `src/lib/base-path.ts` → `src/shared/base-path.ts`
- Move: `src/lib/format-html.ts` → `src/shared/format-html.ts`
- Move: `src/lib/test-helpers/` → `src/shared/test-helpers/`
- Move: `src/lib/visual-descriptor/` → `src/shared/visual-descriptor/`
- Move: `src/types/markdown-it-task-lists.d.ts` → `src/shared/types/markdown-it-task-lists.d.ts`
- Update: all imports referencing these files

- [ ] **Step 1: Create the directory structure**

```bash
mkdir -p src/shared/types
```

- [ ] **Step 2: Move files with git**

```bash
git mv src/lib/base-path.ts src/shared/base-path.ts
git mv src/lib/format-html.ts src/shared/format-html.ts
git mv src/lib/test-helpers src/shared/test-helpers
git mv src/lib/visual-descriptor src/shared/visual-descriptor
git mv src/types/markdown-it-task-lists.d.ts src/shared/types/markdown-it-task-lists.d.ts
```

- [ ] **Step 3: Update all imports across the codebase**

Find every file importing from `src/lib/base-path`, `src/lib/format-html`, `src/lib/test-helpers`, `src/lib/visual-descriptor`, or `src/types/markdown-it-task-lists.d.ts` and update the import paths to point to `src/shared/`.

Use `grep -rn` to locate all import sites. The main consumers are:

- `src/app/server.tsx` — imports `base-path`
- `src/app/middleware/auth.ts` — imports `base-path`
- `src/app/routes/**/*.tsx` — imports `base-path`, `format-html`, `markdown`
- `test/base-path.test.ts` — imports `base-path`
- `test/format-html.test.ts` — imports `format-html`
- Various conformance tests in `src/app/components/flex-*/` — import `test-helpers`

Adjust relative paths based on each file's depth. For example, a file at `src/app/routes/catalog/architecture.tsx` currently uses `../../../lib/base-path` and should become `../../../shared/base-path`.

- [ ] **Step 4: Run checks**

```bash
bun run check
```

Expected: all checks pass. If type errors appear, they indicate a missed import — fix and re-run.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(shared): move pure utilities to src/shared/

Move base-path, format-html, test-helpers, visual-descriptor, and the
markdown-it type declaration from src/lib/ and src/types/ into src/shared/.
Update all import paths across the codebase.
"
```

---

### Task 2: Create `src/services/data-collection/` — extract core domain types

**Files:**
- Create: `src/services/data-collection/types.ts`
- Modify: every file that imports these types from `src/types/models`

- [ ] **Step 1: Create the directory**

```bash
mkdir -p src/services/data-collection
```

- [ ] **Step 2: Create `src/services/data-collection/types.ts`**

Extract these types from `src/types/models.ts`:

```typescript
/**
 * Data Collection domain types — what data to collect
 */

export interface DataCollectionSpec {
  id: string
  title: string
  description: string
  groups: RequirementGroup[]
}

export interface RequirementGroup {
  id: string
  title: string
  description?: string
  requirements: DataRequirement[]
  condition?: FieldCondition
}

export interface DataRequirement {
  id: string
  fieldName: string
  label: string
  fieldType: FieldType
  required: boolean
  helpText?: string
  choices?: string[]
  validation?: ValidationRule[]
  condition?: FieldCondition
  displayWidth?: '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
}

export type FieldType =
  | 'text'
  | 'email'
  | 'phone'
  | 'url'
  | 'number'
  | 'currency'
  | 'date'
  | 'boolean'
  | 'choice'
  | 'longText'

export interface ValidationRule {
  type: 'pattern' | 'min' | 'max' | 'minLength' | 'maxLength'
  value: string | number
  message?: string
}

export interface FieldCondition {
  field: string
  operator: 'equals' | 'notEquals' | 'contains'
  value: string | number | boolean
}
```

- [ ] **Step 3: Update `src/types/models.ts` to re-export from new location**

Replace the data-collection type definitions in `src/types/models.ts` with re-exports:

```typescript
// Re-export data-collection types from their new home
export type {
  DataCollectionSpec,
  RequirementGroup,
  DataRequirement,
  FieldType,
  ValidationRule,
  FieldCondition,
} from '../services/data-collection/types'
```

This is a temporary bridge — it lets us decompose incrementally without updating every consumer at once. Later tasks will update consumers to import directly and remove the re-exports.

- [ ] **Step 4: Run checks**

```bash
bun run check
```

Expected: all checks pass — the re-exports make this change transparent.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(data-collection): extract core domain types into src/services/data-collection/

Create src/services/data-collection/types.ts with DataCollectionSpec,
RequirementGroup, DataRequirement, FieldType, ValidationRule, FieldCondition.
Temporary re-exports from src/types/models.ts preserve existing imports.
"
```

---

### Task 3: Create `src/services/forms/` — extract form types and move form services

**Files:**
- Create: `src/services/forms/types.ts`
- Move: `src/services/form-resolver.ts` → `src/services/forms/resolver.ts`
- Move: `src/services/form-validation.ts` → `src/services/forms/validation.ts`
- Move: `src/services/form-navigation.ts` → `src/services/forms/navigation.ts`
- Move: `src/services/form-session.ts` → `src/services/forms/session.ts`
- Move: `src/services/submission.ts` → `src/services/forms/submission.ts`
- Update: all imports referencing moved files

- [ ] **Step 1: Create the directory**

```bash
mkdir -p src/services/forms
```

- [ ] **Step 2: Create `src/services/forms/types.ts`**

Extract from `src/types/models.ts`:

```typescript
/**
 * Forms domain types — form resolution, delivery, sessions
 */

import type {
  DataCollectionSpec,
  FieldCondition,
  RequirementGroup,
} from '../data-collection/types'

export interface FormSpec {
  id: string
  specId: string
  title: string
  description?: string
  pages: FormPage[]
}

export interface FormPage {
  id: string
  title: string
  description?: string
  groups: string[]
  condition?: FieldCondition
}

export interface ResolvedForm {
  formSpec: FormSpec
  dataSpec: DataCollectionSpec
  pages: ResolvedPage[]
}

export interface ResolvedPage {
  page: FormPage
  groups: RequirementGroup[]
}

export interface FormSession {
  id: string
  specId: string
  formSpecId: string
  ownerId: string
  fields: Record<string, FieldEntry>
  status: 'active' | 'submitted'
  createdAt: string
}

export interface FieldEntry {
  value: string | number | boolean | null
  errors?: string[]
}

export interface Submission {
  id: string
  specId: string
  formSpecId: string
  ownerId: string
  data: Record<string, unknown>
  submittedAt: string
}

export interface FormSessionGateway {
  createSession(
    specId: string,
    formSpecId: string,
    ownerId: string,
  ): FormSession
  getSession(id: string): FormSession | null
  listByOwner(ownerId: string): FormSession[]
  writeFields(sessionId: string, fields: Record<string, FieldEntry>): void
  submit(sessionId: string): Submission
}

export interface SubmissionGateway {
  save(submission: Submission): void
  getSubmission(id: string): Submission | null
}

export interface FormProject {
  id: string
  name: string
  description: string
  spec: DataCollectionSpec
  formSpecs: FormSpec[]
  createdAt: string
  updatedAt: string
}
```

- [ ] **Step 3: Move form service files**

```bash
git mv src/services/form-resolver.ts src/services/forms/resolver.ts
git mv src/services/form-validation.ts src/services/forms/validation.ts
git mv src/services/form-navigation.ts src/services/forms/navigation.ts
git mv src/services/form-session.ts src/services/forms/session.ts
git mv src/services/submission.ts src/services/forms/submission.ts
```

- [ ] **Step 4: Update internal imports in moved files**

Each moved service file imports from `src/types/models`. Update these to import from the new type locations:

- `src/services/forms/resolver.ts`: change `from '../../types/models'` → `from './types'` and `from '../data-collection/types'` as needed
- `src/services/forms/validation.ts`: same pattern, also update import of `form-resolver` → `from './resolver'`
- `src/services/forms/navigation.ts`: same pattern, also update import of `form-resolver` → `from './resolver'`
- `src/services/forms/session.ts`: change `from '../../types/models'` → `from './types'`
- `src/services/forms/submission.ts`: change `from '../../types/models'` → `from './types'`

- [ ] **Step 5: Update re-exports in `src/types/models.ts`**

Replace the forms type definitions with re-exports:

```typescript
export type {
  FormSpec,
  FormPage,
  ResolvedForm,
  ResolvedPage,
  FormSession,
  FieldEntry,
  Submission,
  FormSessionGateway,
  SubmissionGateway,
  FormProject,
} from '../services/forms/types'
```

- [ ] **Step 6: Update all external imports of moved service files**

Consumers of the old paths:

- `src/app/routes/forms/index.tsx`: `../../../services/form-navigation` → `../../../services/forms/navigation`, etc.
- `test/forms/resolver.test.ts`: `../../src/services/form-resolver` → `../../src/services/forms/resolver`, etc.
- `test/forms/validation.test.ts`: same pattern
- `test/forms/navigation.test.ts`: same pattern
- `test/forms/gateways.test.ts`: update `form-session` → `forms/session`
- `test/forms/routes.test.ts`: update service imports

Use `grep -rn 'form-resolver\|form-validation\|form-navigation\|form-session\|services/submission' src/ test/` to find all sites.

- [ ] **Step 7: Run checks**

```bash
bun run check
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor(forms): extract form types and move form services into src/services/forms/

Create src/services/forms/types.ts with FormSpec, FormSession, Submission,
and related types. Move resolver, validation, navigation, session, and
submission services into src/services/forms/. Update all import paths.
"
```

---

### Task 4: Create `src/services/ingestion/` — extract extraction types and move ingestion services

**Files:**
- Create: `src/services/ingestion/types.ts`
- Move: `src/services/pdf-extractor.ts` → `src/services/ingestion/pdf-extractor.ts`
- Move: `src/services/extraction-schemas.ts` → `src/services/ingestion/schemas.ts`
- Rename: `src/services/database.ts` → `src/services/storage.ts`
- Update: all imports

- [ ] **Step 1: Create the directory**

```bash
mkdir -p src/services/ingestion
```

- [ ] **Step 2: Create `src/services/ingestion/types.ts`**

Extract from `src/types/models.ts`:

```typescript
/**
 * Ingestion domain types — PDF → structured spec pipeline
 */

import type { DataCollectionSpec, FieldCondition } from '../data-collection/types'
import type { FormSpec } from '../forms/types'

export interface ExtractionResult {
  spec: DataCollectionSpec
  formSpec: FormSpec
  confidence: FieldConfidence[]
}

export interface FieldConfidence {
  fieldId: string
  confidence: number
  flags?: string[]
}

export interface ExtractionOptions {
  model?: string
}

export type ProjectStatus = 'extracting' | 'ready' | 'error'

export interface StoredProject {
  id: string
  name: string
  description: string
  status: ProjectStatus
  sourcePdf: Buffer
  spec: DataCollectionSpec | null
  formSpec: FormSpec | null
  confidence: FieldConfidence[] | null
  error: string | null
  createdBy: string
  createdAt: number
  updatedAt: number
}

export interface NewProject {
  name: string
  description: string
  sourcePdf: Buffer
  createdBy: string
}
```

- [ ] **Step 3: Rename database.ts to storage.ts**

```bash
git mv src/services/database.ts src/services/storage.ts
```

- [ ] **Step 4: Move ingestion files**

```bash
git mv src/services/pdf-extractor.ts src/services/ingestion/pdf-extractor.ts
git mv src/services/extraction-schemas.ts src/services/ingestion/schemas.ts
```

- [ ] **Step 5: Update internal imports in moved files**

- `src/services/ingestion/pdf-extractor.ts`: update `from '../../types/models'` → `from './types'` and `from '../data-collection/types'`, update `from './database'` → `from '../storage'`, update `from './extraction-schemas'` → `from './schemas'`
- `src/services/storage.ts`: update `from '../types/models'` → `from './ingestion/types'` (for `StoredProject`, `NewProject`)

- [ ] **Step 6: Update re-exports in `src/types/models.ts`**

Replace the ingestion type definitions with re-exports:

```typescript
export type {
  ExtractionResult,
  FieldConfidence,
  ExtractionOptions,
  StoredProject,
  NewProject,
  ProjectStatus,
} from '../services/ingestion/types'
```

- [ ] **Step 7: Update all external imports**

- `src/app/server.tsx`: `database` → `storage`
- `src/app/routes/projects/index.tsx`: `database` → `storage`, `pdf-extractor` → `ingestion/pdf-extractor`
- `src/commands/extract.ts`: same pattern
- `test/database.test.ts`: `../src/services/database` → `../src/services/storage`
- `test/pdf-extractor.test.ts`: `../src/services/pdf-extractor` → `../src/services/ingestion/pdf-extractor`

Use `grep -rn 'services/database\|services/pdf-extractor\|services/extraction-schemas' src/ test/` to find all sites.

- [ ] **Step 8: Run checks**

```bash
bun run check
```

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "refactor(ingestion): extract ingestion types and move pipeline services

Create src/services/ingestion/types.ts with ExtractionResult, StoredProject,
and related types. Move pdf-extractor and extraction-schemas into
src/services/ingestion/. Rename database.ts to storage.ts.
"
```

---

### Task 5: Create `src/services/auth/` — move auth services

**Files:**
- Create: `src/services/auth/types.ts`
- Move: `src/lib/github-oauth.ts` → `src/services/auth/github-oauth.ts`
- Move: `src/lib/session.ts` → `src/services/auth/session.ts`
- Update: all imports

- [ ] **Step 1: Create the directory**

```bash
mkdir -p src/services/auth
```

- [ ] **Step 2: Create `src/services/auth/types.ts`**

Extract `SessionUser` from `src/lib/session.ts`:

```typescript
/**
 * Auth domain types — authentication and sessions
 */

export interface SessionUser {
  login: string
  name: string | null
  avatarUrl: string
  accessToken: string
}
```

- [ ] **Step 3: Move auth files**

```bash
git mv src/lib/github-oauth.ts src/services/auth/github-oauth.ts
git mv src/lib/session.ts src/services/auth/session.ts
```

- [ ] **Step 4: Update `src/services/auth/session.ts`**

Remove the `SessionUser` interface definition and import it from `./types` instead:

```typescript
import type { SessionUser } from './types'
```

- [ ] **Step 5: Update all external imports**

Consumers:
- `src/app/middleware/auth.ts`: `../../lib/session` → `../../services/auth/session`
- `src/app/routes/auth/index.ts`: `../../lib/github-oauth` → `../../services/auth/github-oauth`, `../../lib/session` → `../../services/auth/session`
- `src/app/components/flex-layout/index.tsx`: `../../../lib/session` → `../../../services/auth/session` (for `SessionUser` type)
- `test/github-oauth.test.ts`: `../src/lib/github-oauth` → `../src/services/auth/github-oauth`
- `test/session.test.ts`: `../src/lib/session` → `../src/services/auth/session`
- `test/auth-middleware.test.ts`: check for `lib/session` imports
- `test/auth-routes.test.ts`: check for `lib/session` and `lib/github-oauth` imports

- [ ] **Step 6: Run checks**

```bash
bun run check
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor(auth): move auth services into src/services/auth/

Create src/services/auth/types.ts with SessionUser. Move github-oauth
and session from src/lib/ into src/services/auth/. Update all import paths.
"
```

---

### Task 6: Create `src/services/deployment/` and `src/services/content/` — move remaining services

**Files:**
- Create: `src/services/deployment/types.ts`
- Move: `src/services/github.ts` → `src/services/deployment/github.ts`
- Move: `src/services/deployment-metadata.ts` → `src/services/deployment/metadata.ts`
- Create: `src/services/content/types.ts`
- Move: `src/lib/markdown.ts` → `src/services/content/markdown.ts`
- Create: `src/services/notifications/` directory
- Move: `src/notify/client.ts` → `src/services/notifications/client.ts`
- Move: `src/notify/types.ts` → `src/services/notifications/types.ts`

- [ ] **Step 1: Create directories**

```bash
mkdir -p src/services/deployment src/services/content src/services/notifications
```

- [ ] **Step 2: Create `src/services/deployment/types.ts`**

Move the contents of `src/types/deployment.ts`:

```typescript
/**
 * Deployment domain types
 */

export type ServiceStatus = 'running' | 'failed' | 'restarting' | 'inactive'
export type HealthStatus = 'healthy' | 'unhealthy' | 'unknown'
export type PullRequestStatus = 'open' | 'closed' | 'merged'

export interface DeploymentInfo {
  branch: string
  port: number
  url: string
  commit: {
    sha: string
    shortSha: string
    message: string
    author: string
    date: string
    githubUrl: string
  }
  service: {
    status: ServiceStatus
    uptime?: string
    memory?: string
  }
  health: {
    status: HealthStatus
    responseTime?: number
    lastCheck: string
    error?: string
  }
  pullRequest?: {
    number: number
    title: string
    url: string
    status: PullRequestStatus
  }
  lastDeployed?: string
}

export interface DeploymentSummary {
  totalDeployments: number
  healthyDeployments: number
  failedDeployments: number
  deployments: DeploymentInfo[]
}
```

- [ ] **Step 3: Move deployment service files**

```bash
git mv src/services/github.ts src/services/deployment/github.ts
git mv src/services/deployment-metadata.ts src/services/deployment/metadata.ts
```

- [ ] **Step 4: Update deployment service internal imports**

- `src/services/deployment/metadata.ts`: update `from '../../types/deployment'` → `from './types'`, update `from './github'` → `from './github'` (stays the same since both moved)

- [ ] **Step 5: Create `src/services/content/types.ts`**

Extract `MarkdownFile` from `src/lib/markdown.ts`, and catalog types from `src/types/models.ts`:

```typescript
/**
 * Content domain types — content rendering and catalog entities
 */

export interface MarkdownFile {
  frontmatter: Record<string, unknown>
  content: string
  html: string
}

export interface Persona {
  id: string
  name: string
  role: string
  description: string
  needs: string[]
  content: string
}

export interface Decision {
  slug: string
  group: string
  title: string
  status: string
  tags: string[]
  decided: string
  content: string
}

export interface ArchitectureDoc {
  slug: string
  title: string
  status: string
  tags: string[]
  content: string
}

export interface Story {
  slug: string
  issue: number
  title: string
  milestone: string
  labels: string[]
  state: string
  syncedAt: string
  content: string
}
```

- [ ] **Step 6: Move markdown.ts and update it**

```bash
git mv src/lib/markdown.ts src/services/content/markdown.ts
```

Update `src/services/content/markdown.ts`: remove the inline `MarkdownFile` interface and import from `./types`:

```typescript
import type { MarkdownFile } from './types'
```

- [ ] **Step 7: Move notification files**

```bash
git mv src/notify/client.ts src/services/notifications/client.ts
git mv src/notify/types.ts src/services/notifications/types.ts
```

- [ ] **Step 8: Update `src/services/notifications/client.ts`**

Update import: `from './types'` (should remain the same since both moved together).

- [ ] **Step 9: Update re-exports in `src/types/models.ts`**

Replace the remaining type definitions (Persona, Decision, ArchitectureDoc, Story) with re-exports:

```typescript
export type {
  Persona,
  Decision,
  ArchitectureDoc,
  Story,
} from '../services/content/types'
```

- [ ] **Step 10: Update all external imports**

Consumers of moved files:

- `src/services/deployment/metadata.ts` already handled above
- `src/webhook/main.ts`: `../services/github` → `../services/deployment/github`
- `src/webhook/deploy.ts`: `../services/github` → `../services/deployment/github`, `../notify/client` → `../services/notifications/client`
- `src/commands/sync-stories.ts`: `../services/github` → `../services/deployment/github`
- `src/homepage/server.tsx`: `../services/deployment-metadata` → `../services/deployment/metadata`
- `src/app/routes/catalog/*.tsx`: `../../../lib/markdown` → `../../../services/content/markdown`
- `src/app/components/deployment-table.tsx`: `../../types/deployment` → `../../services/deployment/types`
- `test/github-deployment.test.ts`: `../src/services/github` → `../src/services/deployment/github`
- `test/deployment-metadata.test.ts`: `../src/services/deployment-metadata` → `../src/services/deployment/metadata`, `../src/types/deployment` → `../src/services/deployment/types`
- `test/deployment-table.test.tsx`: `../src/types/deployment` → `../src/services/deployment/types`
- `test/markdown.test.ts`: `../src/lib/markdown` → `../src/services/content/markdown`
- `test/notify-client.test.ts`: `../src/notify/client` → `../src/services/notifications/client`
- `test/webhook-deploy.test.ts`: `../src/notify/client` → `../src/services/notifications/client`

Use grep to find all sites and update them.

- [ ] **Step 11: Run checks**

```bash
bun run check
```

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "refactor(services): move deployment, content, and notification services

Create src/services/deployment/ with types, github, metadata.
Create src/services/content/ with types, markdown.
Move notification client and types to src/services/notifications/.
Update all import paths.
"
```

---

### Task 7: Create `src/design-system/` — move component library

**Files:**
- Move: `src/app/components/flex-*/` (all directories) → `src/design-system/components/flex-*/`
- Move: `src/app/components/register.ts` → `src/design-system/register.ts`
- Move: `src/app/components/registry.ts` → `src/design-system/registry.ts`
- Move: `src/app/components/types.ts` → `src/design-system/types.ts`
- Move: `src/app/components/conformance-types.ts` → `src/design-system/conformance/types.ts`
- Update: all imports of components

Note: `deployment-table.tsx` and `deployment-table.css` stay behind in `src/app/components/` for now — they move to `entrypoints/dashboard/` in Task 8.

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p src/design-system/components src/design-system/conformance
```

- [ ] **Step 2: Move component directories**

```bash
# Move all flex-* component directories
for dir in src/app/components/flex-*/; do
  name=$(basename "$dir")
  git mv "$dir" "src/design-system/components/$name"
done

# Move top-level component files
git mv src/app/components/register.ts src/design-system/register.ts
git mv src/app/components/registry.ts src/design-system/registry.ts
git mv src/app/components/types.ts src/design-system/types.ts
git mv src/app/components/conformance-types.ts src/design-system/conformance/types.ts
```

- [ ] **Step 3: Update internal imports within design-system**

- `src/design-system/registry.ts`: update import of `./types` (should still work since both moved)
- `src/design-system/components/flex-layout/index.tsx`: update `from '../../../lib/session'` → `from '../../../services/auth/session'` (for `SessionUser` type import)
- Conformance test files that import from `test-helpers`: update paths from `../../../../lib/test-helpers` → `../../../../shared/test-helpers`

Check all `flex-*/conformance.test.ts` files for `test-helpers` imports and update them.

- [ ] **Step 4: Update all external imports of components**

Every route, test, and the homepage server that imports components needs updating. The pattern changes from `src/app/components/flex-*` to `src/design-system/components/flex-*`.

Main consumers:
- `src/app/server.tsx`: `./components/flex-layout` → `../../design-system/components/flex-layout`
- `src/app/routes/catalog/*.tsx`: `../../components/flex-*` → `../../../../design-system/components/flex-*`
- `src/app/routes/forms/index.tsx`: same pattern
- `src/app/routes/projects/components.tsx`: same pattern
- `src/app/routes/catalog/design-system.tsx`: imports `conformance-types` and `registry` — update to `../../../../design-system/conformance/types` and `../../../../design-system/registry`
- `src/homepage/server.tsx`: `../app/components/flex-layout` → `../design-system/components/flex-layout`
- All test files importing components: update relative paths

Use `grep -rn 'app/components/flex-\|app/components/registry\|app/components/types\|app/components/conformance' src/ test/` to find all sites.

- [ ] **Step 5: Run checks**

```bash
bun run check
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor(design-system): move component library to src/design-system/

Move all flex-* component directories, register.ts, registry.ts, types.ts,
and conformance-types.ts into src/design-system/. Update all import paths
across routes, tests, and the dashboard server.
"
```

---

### Task 8: Create `src/entrypoints/` — move all entry points

**Files:**
- Move: `src/app/main.ts`, `src/app/server.tsx`, `src/app/middleware/`, `src/app/routes/`, `src/app/public/` → `src/entrypoints/app/`
- Move: `src/homepage/` → `src/entrypoints/dashboard/`
- Move: `src/app/components/deployment-table.{tsx,css}` → `src/entrypoints/dashboard/`
- Move: `src/webhook/` → `src/entrypoints/webhook/`
- Move: `src/notify/main.ts`, `src/notify/slack.ts` → `src/entrypoints/notify/`
- Move: `src/cli.ts` → `src/entrypoints/cli/main.ts`
- Move: `src/commands/` → `src/entrypoints/cli/commands/`
- Update: all imports

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p src/entrypoints/app src/entrypoints/dashboard src/entrypoints/webhook src/entrypoints/notify src/entrypoints/cli
```

- [ ] **Step 2: Move app entrypoint**

```bash
git mv src/app/main.ts src/entrypoints/app/main.ts
git mv src/app/server.tsx src/entrypoints/app/server.tsx
git mv src/app/middleware src/entrypoints/app/middleware
git mv src/app/routes src/entrypoints/app/routes
git mv src/app/public src/entrypoints/app/public
```

- [ ] **Step 3: Move dashboard entrypoint**

```bash
git mv src/homepage/main.ts src/entrypoints/dashboard/main.ts
git mv src/homepage/server.tsx src/entrypoints/dashboard/server.tsx
git mv src/app/components/deployment-table.tsx src/entrypoints/dashboard/deployment-table.tsx
git mv src/app/components/deployment-table.css src/entrypoints/dashboard/deployment-table.css
```

- [ ] **Step 4: Move webhook entrypoint**

```bash
git mv src/webhook/main.ts src/entrypoints/webhook/main.ts
git mv src/webhook/handler.ts src/entrypoints/webhook/handler.ts
git mv src/webhook/deploy.ts src/entrypoints/webhook/deploy.ts
```

- [ ] **Step 5: Move notify entrypoint**

```bash
git mv src/notify/main.ts src/entrypoints/notify/main.ts
git mv src/notify/slack.ts src/entrypoints/notify/slack.ts
```

- [ ] **Step 6: Move CLI entrypoint**

```bash
git mv src/cli.ts src/entrypoints/cli/main.ts
git mv src/commands src/entrypoints/cli/commands
```

- [ ] **Step 7: Update all internal imports in moved entrypoint files**

This is the largest import update. Every entrypoint file's imports need adjustment because the relative path depth changed. Key patterns:

**App entrypoint (`src/entrypoints/app/`):**
- `server.tsx`: update all service, shared, and design-system imports. Paths go from `../../services/` → `../../services/` (same depth), `../../shared/` → `../../shared/`, `./components/` → `../../design-system/components/`
- `middleware/auth.ts`: `../../shared/base-path` → `../../../shared/base-path`, `../../services/auth/session` → `../../../services/auth/session`
- `routes/auth/index.ts`: similar depth adjustment
- `routes/catalog/*.tsx`: adjust all imports
- `routes/forms/index.tsx`: adjust all imports
- `routes/projects/*.tsx`: adjust all imports

**Dashboard (`src/entrypoints/dashboard/`):**
- `server.tsx`: update deployment-table import (now `./deployment-table`), design-system import, service imports
- `deployment-table.tsx`: update `../../services/deployment/types` → `../../services/deployment/types` (verify depth)

**Webhook (`src/entrypoints/webhook/`):**
- `main.ts`: update `../services/deployment/github` → `../../services/deployment/github`
- `deploy.ts`: update `../services/deployment/github` → `../../services/deployment/github`, `../services/notifications/client` → `../../services/notifications/client`

**Notify (`src/entrypoints/notify/`):**
- `main.ts`: update `./slack` (stays same), `../services/notifications/types` → `../../services/notifications/types`
- `slack.ts`: update `../services/notifications/types` → `../../services/notifications/types`

**CLI (`src/entrypoints/cli/`):**
- `main.ts`: update `./commands/*` paths to `./commands/*` (stays same since commands moved together)
- `commands/extract.ts`: update `../services/storage` → `../../services/storage`, etc.
- `commands/sync-stories.ts`: update `../services/deployment/github` → `../../services/deployment/github`

- [ ] **Step 8: Update all test file imports**

Every test that imports from `src/app/`, `src/webhook/`, `src/notify/`, `src/cli.ts`, or `src/commands/` needs updating:

- `test/server.test.ts`: `../src/app/server` → `../src/entrypoints/app/server`
- `test/auth-middleware.test.ts`: `../src/app/middleware/auth` → `../src/entrypoints/app/middleware/auth`
- `test/auth-routes.test.ts`: `../src/app/routes/auth` → `../src/entrypoints/app/routes/auth`
- `test/forms/routes.test.ts`: `../../src/app/routes/forms/index` → `../../src/entrypoints/app/routes/forms/index`
- `test/forms/*.test.tsx`: update component imports from `../../src/app/components/flex-*` → `../../src/design-system/components/flex-*`
- `test/catalog-*.test.ts`: update route imports
- `test/projects-routes.test.ts`: update route imports
- `test/cli.test.ts`: `../src/cli` → `../src/entrypoints/cli/main`
- `test/webhook-*.test.ts`: `../src/webhook/*` → `../src/entrypoints/webhook/*`
- `test/notify-*.test.ts`: `../src/notify/*` → `../src/entrypoints/notify/*` or `../src/services/notifications/*`
- `test/deployment-table.test.tsx`: `../src/app/components/deployment-table` → `../src/entrypoints/dashboard/deployment-table`
- `test/flex-diagram.test.tsx`: update component imports
- `test/flex-layout.test.tsx`: update component imports

Use grep to systematically find and update all sites.

- [ ] **Step 9: Run checks**

```bash
bun run check
```

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "refactor(entrypoints): move all entry points into src/entrypoints/

Move app, dashboard, webhook, notify, and CLI into src/entrypoints/.
Dashboard-specific deployment-table moves from components to dashboard.
Update all import paths in source and test files.
"
```

---

### Task 9: Remove `src/types/models.ts` — complete type decomposition

**Files:**
- Delete: `src/types/models.ts`
- Delete: `src/types/deployment.ts`
- Delete: `src/types/` directory (now empty except for the moved .d.ts)
- Update: all remaining consumers to import from service-owned types

- [ ] **Step 1: Find all remaining consumers of `src/types/models.ts`**

```bash
grep -rn 'types/models' src/ test/
```

- [ ] **Step 2: Update each consumer**

For each file still importing from `types/models`, change the import to the appropriate service-owned types file:

- Data collection types (`DataCollectionSpec`, `RequirementGroup`, etc.) → `from '...services/data-collection/types'`
- Form types (`FormSpec`, `FormPage`, `FormSession`, etc.) → `from '...services/forms/types'`
- Ingestion types (`StoredProject`, `FieldConfidence`, etc.) → `from '...services/ingestion/types'`
- Content types (`Persona`, `Decision`, etc.) → `from '...services/content/types'`

Split imports that pull types from multiple domains into separate import statements.

- [ ] **Step 3: Find all remaining consumers of `src/types/deployment.ts`**

```bash
grep -rn 'types/deployment' src/ test/
```

Update any remaining imports to `services/deployment/types`.

- [ ] **Step 4: Delete the old type files**

```bash
git rm src/types/models.ts
git rm src/types/deployment.ts
rmdir src/types 2>/dev/null || true
```

If `src/types/` still contains the `.d.ts` file, it was already moved in Task 1 — verify and clean up:

```bash
ls src/types/ 2>/dev/null && echo "Directory not empty — check contents" || echo "Clean"
```

- [ ] **Step 5: Run checks**

```bash
bun run check
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor(types): complete type decomposition into service-owned files

Remove src/types/models.ts and src/types/deployment.ts. All consumers now
import directly from service-owned types files in src/services/*/types.ts.
"
```

---

### Task 10: Clean up empty directories and remove `src/lib/`

**Files:**
- Delete: `src/lib/` (should be empty after Tasks 1, 5, 6)
- Delete: `src/app/components/` (should be empty after Tasks 7, 8)
- Delete: `src/app/` (should be empty after Task 8)
- Delete: `src/homepage/` (should be empty after Task 8)
- Delete: `src/webhook/` (should be empty after Task 8)
- Delete: `src/notify/` (should be empty after Task 8)
- Delete: `src/commands/` (should be empty after Task 8)

- [ ] **Step 1: Verify directories are empty and remove**

```bash
# Check for stragglers
find src/lib src/app src/homepage src/webhook src/notify src/commands src/types 2>/dev/null -type f

# Remove empty directories
rmdir src/lib 2>/dev/null
rm -rf src/app/components 2>/dev/null
rmdir src/app 2>/dev/null
rmdir src/homepage 2>/dev/null
rmdir src/webhook 2>/dev/null
rmdir src/notify 2>/dev/null
rmdir src/commands 2>/dev/null
rmdir src/types 2>/dev/null
```

If any files remain, investigate — they were missed by a prior task.

- [ ] **Step 2: Run checks**

```bash
bun run check
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor: remove empty legacy directories

Clean up src/lib/, src/app/, src/homepage/, src/webhook/, src/notify/,
src/commands/, and src/types/ after all files moved to new locations.
"
```

---

### Task 11: Update infrastructure references

**Files:**
- Modify: `package.json` — update script paths
- Modify: `infrastructure/nixos/modules/app.nix` — update ExecStart
- Modify: `infrastructure/nixos/modules/homepage.nix` — update ExecStart
- Modify: `infrastructure/nixos/modules/webhook.nix` — update path
- Modify: `infrastructure/nixos/modules/notify.nix` — update path
- Modify: `scripts/build-css.ts` — update CSS source path
- Modify: `scripts/build-components.ts` — update register.ts path
- Modify: `tsconfig.json` — verify include patterns still work
- Modify: `CLAUDE.md` — update Project Structure section
- Modify: `biome.json` — check for path references
- Modify: `.stylelintrc.json` or equivalent — check for path patterns

- [ ] **Step 1: Update `package.json` scripts**

```json
{
  "dev": "bun run --watch src/entrypoints/app/main.ts",
  "start": "bun run src/entrypoints/app/main.ts",
  "webhook": "bun run src/entrypoints/webhook/main.ts",
  "cli": "bun run src/entrypoints/cli/main.ts",
  "lint:css": "bunx stylelint 'src/**/*.css'"
}
```

The `lint:css` glob already covers the new paths since it uses `src/**/*.css`.

- [ ] **Step 2: Update NixOS modules**

`infrastructure/nixos/modules/app.nix` line 16:
```nix
ExecStart = "${pkgs.bun}/bin/bun run src/entrypoints/app/main.ts";
```

`infrastructure/nixos/modules/homepage.nix` line 22:
```nix
ExecStart = "${pkgs.bun}/bin/bun run src/entrypoints/dashboard/main.ts";
```

`infrastructure/nixos/modules/webhook.nix` line 29:
```nix
exec ${pkgs.bun}/bin/bun run /srv/forms-lab/main/src/entrypoints/webhook/main.ts
```

`infrastructure/nixos/modules/notify.nix` line 23:
```nix
exec ${pkgs.bun}/bin/bun run /srv/forms-lab/main/src/entrypoints/notify/main.ts
```

- [ ] **Step 3: Update build scripts**

Check `scripts/build-css.ts` and `scripts/build-components.ts` for hardcoded paths and update them:

- `build-css.ts`: update any reference to `src/app/public/styles.css` → `src/entrypoints/app/public/styles.css`
- `build-components.ts`: update any reference to `src/app/components/register.ts` → `src/design-system/register.ts`

- [ ] **Step 4: Verify tsconfig.json**

The current `include` is `["src/**/*", "test/**/*"]` — this still covers all new paths. No change needed.

- [ ] **Step 5: Check for other path references**

```bash
grep -rn 'src/app/\|src/lib/\|src/webhook/\|src/homepage/\|src/notify/\|src/commands/\|src/cli\.ts\|src/types/' \
  package.json biome.json tsconfig.json scripts/ infrastructure/ .github/ CLAUDE.md \
  --include='*.json' --include='*.ts' --include='*.nix' --include='*.md' --include='*.yaml' --include='*.yml'
```

Fix any remaining stale references found.

- [ ] **Step 6: Update CLAUDE.md Project Structure section**

Replace the Project Structure section with:

```markdown
## Project Structure

- `src/entrypoints/app/` — Forms platform web application (server, routes, middleware, public assets)
- `src/entrypoints/dashboard/` — Deployment dashboard (homepage service)
- `src/entrypoints/webhook/` — GitHub webhook listener service
- `src/entrypoints/notify/` — Notification delivery server
- `src/entrypoints/cli/` — CLI commands (sync-stories, infra, nixos, webhook, deploy)
- `src/services/data-collection/` — Core domain model: what data to collect
- `src/services/forms/` — Form resolution, delivery, sessions, submission
- `src/services/ingestion/` — PDF → structured spec pipeline
- `src/services/auth/` — Authentication and sessions (GitHub OAuth)
- `src/services/deployment/` — Deploy orchestration and metadata
- `src/services/notifications/` — Notification types and client
- `src/services/content/` — Content rendering (markdown, catalog types)
- `src/services/storage.ts` — Persistence layer (SQLite)
- `src/design-system/` — UI components (flex-* component library, conformance, registry)
- `src/shared/` — Pure utilities (base-path, format-html, test-helpers, visual-descriptor)
- `infrastructure/pulumi/` — EC2 provisioning (Pulumi TypeScript)
- `infrastructure/nixos/` — Server configuration (NixOS flake)
- `catalog/` — Catalog content (personas, stories, decisions, architecture, experiments)
- `projects/` — Form project directories (specs + assets)
- `test/` — Test files
- `scripts/` — Build scripts
- `notes/` — Session logs and exploration notes
- `dist/` — Built assets (gitignored)
```

- [ ] **Step 7: Run checks**

```bash
bun run check
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "infra(paths): update all infrastructure references for new src/ layout

Update package.json scripts, NixOS module ExecStart paths, build script
paths, and CLAUDE.md project structure documentation to reflect the
screaming architecture reorganization.
"
```

---

### Task 12: Final verification and design doc status update

- [ ] **Step 1: Run the full check suite**

```bash
bun run check
```

- [ ] **Step 2: Verify the directory structure matches the design**

```bash
ls src/
# Expected: design-system  entrypoints  services  shared

ls src/entrypoints/
# Expected: app  cli  dashboard  notify  webhook

ls src/services/
# Expected: auth  content  data-collection  deployment  forms  ingestion  notifications  storage.ts

ls src/design-system/
# Expected: components  conformance  register.ts  registry.ts  types.ts

ls src/shared/
# Expected: base-path.ts  format-html.ts  test-helpers  types  visual-descriptor
```

- [ ] **Step 3: Verify no old directories remain**

```bash
# These should all fail (directory not found)
ls src/app/ 2>&1
ls src/lib/ 2>&1
ls src/types/ 2>&1
ls src/homepage/ 2>&1
ls src/webhook/ 2>&1
ls src/notify/ 2>&1
ls src/commands/ 2>&1
```

- [ ] **Step 4: Verify the dependency rule**

```bash
# shared/ should not import from services/, design-system/, or entrypoints/
grep -rn "from '.*services/\|from '.*design-system/\|from '.*entrypoints/" src/shared/ && echo "VIOLATION" || echo "OK: shared/ has no internal deps"

# design-system/ should not import from services/ or entrypoints/
grep -rn "from '.*services/\|from '.*entrypoints/" src/design-system/ && echo "VIOLATION" || echo "OK: design-system/ has no service/entrypoint deps"

# services/ should not import from entrypoints/ or design-system/
grep -rn "from '.*entrypoints/\|from '.*design-system/" src/services/ && echo "VIOLATION" || echo "OK: services/ has no entrypoint/design-system deps"
```

Note: `design-system/components/flex-layout/index.tsx` imports `SessionUser` from `services/auth/session.ts` — this is a known dependency rule violation inherited from the current code. The design doc accepts this (flex-layout needs user info for the header). Flag it but do not block on it; it can be addressed in a follow-up by passing `SessionUser` as a prop type defined in the design-system.

- [ ] **Step 5: Update design doc status**

In `notes/2026-04-11-screaming-architecture/design.md`, change:

```markdown
**Status:** draft
```

to:

```markdown
**Status:** working
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "docs(arch): mark screaming architecture design as working

Final verification complete. Directory structure matches design,
dependency rule verified, all checks pass.
"
```
