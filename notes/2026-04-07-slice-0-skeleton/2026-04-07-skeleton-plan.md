# Forms Lab Skeleton Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Initialize forms-lab repository with Hono app, catalog shell, personas, data model types, basic routing, and CI/CD.

**Architecture:** Single Hono application on Bun runtime. TypeScript throughout. Server-rendered JSX for pages. File-based catalog (read markdown files from `/catalog`). Data model types as TypeScript interfaces. GitHub Actions for CI.

**Tech Stack:** Bun 1.x, Hono 4.x, TypeScript 5.x, JSX

**Target Repository:** `/home/daniel/src/forms-lab`

---

## File Structure

**Core Application:**
- `src/server.ts` - Hono app entry point
- `src/types/models.ts` - Data model interfaces (DataCollectionSpec, FormSpec, Submission)
- `src/routes/catalog.tsx` - Catalog routes
- `src/lib/markdown.ts` - Markdown file reader utility
- `src/components/Layout.tsx` - Base HTML layout component
**Catalog Content:**
- `catalog/personas/maya.md` - Maya persona
- `catalog/personas/carlos.md` - Carlos persona
- `catalog/personas/priya.md` - Priya persona
- `catalog/personas/developer.md` - Developer persona
- `catalog/personas/evaluator.md` - Evaluator persona

**Configuration:**
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `biome.json` - Biome linter/formatter configuration
- `.gitignore` - Git ignore rules
- `.github/workflows/ci.yml` - GitHub Actions CI
- `CLAUDE.md` - Claude Code project instructions

**Tests:**
- `test/server.test.ts` - Server health check test
- `test/catalog.test.ts` - Catalog routes tests

**Documentation:**
- `README.md` - Setup and usage instructions

---

### Task 1: Initialize Repository Structure

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`
- Create: `src/`, `catalog/personas/`, `catalog/stories/`, `catalog/architecture/`, `test/`, `.github/workflows/`, `projects/` directories

- [ ] **Step 1: Create directory structure**

```bash
cd /home/daniel/src/forms-lab
mkdir -p src/{routes,services,components,types,lib}
mkdir -p catalog/{personas,stories,architecture,experiments,decisions}
mkdir -p projects test .github/workflows infrastructure
```

Expected: Directories created

- [ ] **Step 2: Initialize package.json**

```bash
cd /home/daniel/src/forms-lab
cat > package.json << 'EOF'
{
  "name": "forms-lab",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "bun run --watch src/server.ts",
    "start": "bun run src/server.ts",
    "test": "bun test",
    "test:watch": "bun test --watch"
  },
  "dependencies": {
    "hono": "^4.0.0"
  },
  "devDependencies": {
    "@biomejs/biome": "latest",
    "@types/bun": "latest",
    "typescript": "^5.3.0"
  }
}
EOF
```

Expected: package.json created

- [ ] **Step 3: Install dependencies**

```bash
cd /home/daniel/src/forms-lab
bun install
```

Expected: node_modules created, bun.lockb generated

- [ ] **Step 4: Create tsconfig.json**

```bash
cd /home/daniel/src/forms-lab
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "jsx": "react-jsx",
    "jsxImportSource": "hono/jsx",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "allowJs": true,
    "noEmit": true,
    "strict": true,
    "skipLibCheck": true,
    "types": ["bun-types"]
  },
  "include": ["src/**/*", "test/**/*"],
  "exclude": ["node_modules"]
}
EOF
```

Expected: tsconfig.json created

- [ ] **Step 5: Create .gitignore**

```bash
cd /home/daniel/src/forms-lab
cat > .gitignore << 'EOF'
# Dependencies
node_modules/

# Build outputs
dist/

# Environment
.env
.env.local

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo

# Logs
logs/
*.log
EOF
```

Expected: .gitignore created

- [ ] **Step 6: Create biome.json**

```bash
cd /home/daniel/src/forms-lab
cat > biome.json << 'EOF'
{
  "$schema": "https://biomejs.dev/schemas/1.9.0/schema.json",
  "organizeImports": { "enabled": true },
  "linter": {
    "enabled": true,
    "rules": { "recommended": true }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "semicolons": "asNeeded"
    }
  }
}
EOF
```

Expected: biome.json created

- [ ] **Step 7: Create CLAUDE.md**

```bash
cd /home/daniel/src/forms-lab
cat > CLAUDE.md << 'EOF'
# Forms Lab

LLM-Assisted Forms Platform for government forms.

## Quick Reference

```bash
bun test               # Run tests
bun run dev            # Dev server with watch
bun run --no-warnings tsc --noEmit  # Type check
bunx @biomejs/biome check .         # Lint + format check
bunx @biomejs/biome check --write . # Lint + format fix
```

## Conventions

- **Code is canonical** — when in doubt, follow existing patterns
- **Tests required** — new functionality needs tests in `test/`
- **Server-rendered JSX** — Hono JSX components return HTML strings, no client runtime
- **TDD** — write failing test first, then implementation
- **Vertical slicing** — each story delivers complete user value through all layers

## Architecture

- **Runtime:** Bun
- **Framework:** Hono (server-rendered JSX)
- **Data Model:** DataCollectionSpec (what to collect) → FormSpec (how to present) → Submission (collected data)
- **Persistence:** Git-based — specs and catalog content are markdown/JSON files in the repo
- **Catalog:** Self-documenting system at `/catalog` — personas, stories, architecture, experiments

## Project Structure

- `src/` — Application code (routes, services, components, types, lib)
- `catalog/` — Catalog content (personas, stories synced from GitHub issues, architecture, decisions)
- `projects/` — Form project directories (specs + assets)
- `test/` — Test files

## Related

- Design spec: `/home/daniel/src/llm-class-2026-winter-cohort/notes/final-project/2026-04-07-design.md`
- Skeleton plan: `/home/daniel/src/llm-class-2026-winter-cohort/notes/final-project/2026-04-07-skeleton-plan.md`
EOF
```

Expected: CLAUDE.md created

- [ ] **Step 8: Commit initialization**

```bash
cd /home/daniel/src/forms-lab
git add -A
git commit -m "chore: initialize repository structure

- Add package.json with Hono, TypeScript, Biome
- Configure TypeScript for Bun with JSX support
- Configure Biome for linting and formatting
- Create directory structure per design spec
- Add CLAUDE.md with project conventions
- Add .gitignore for common artifacts"
```

Expected: Files committed to git

---

### Task 2: Define Core Data Model Types

**Files:**
- Create: `src/types/models.ts`

- [ ] **Step 1: Create data model type definitions**

```bash
cd /home/daniel/src/forms-lab
cat > src/types/models.ts << 'EOF'
/**
 * Core data model types for the Forms Lab platform
 * 
 * Based on design spec: notes/final-project/2026-04-07-design.md
 */

/**
 * DataCollectionSpec - Business domain model
 * 
 * Describes what data to collect: fields, types, constraints, conditions,
 * sensitivity, help text. Semantic, not presentational. Portable across
 * delivery modes.
 */
export interface DataCollectionSpec {
  id: string
  title: string
  description: string
  groups: RequirementGroup[]
  version?: string
}

export interface RequirementGroup {
  id: string
  title: string
  description?: string
  requirements: DataRequirement[]
}

export interface DataRequirement {
  id: string
  fieldName: string
  label: string
  fieldType: FieldType
  required: boolean
  helpText?: string
  validation?: ValidationRule[]
  condition?: Condition
  sensitivity?: SensitivityLevel
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

export interface Condition {
  field: string
  operator: 'equals' | 'notEquals' | 'contains'
  value: string | number | boolean
}

export type SensitivityLevel = 'low' | 'medium' | 'high' | 'pii'

/**
 * FormSpec - UX/delivery layer
 * 
 * Describes how to present a DataCollectionSpec as a form experience:
 * page flow, section ordering, progressive disclosure, delivery mode per
 * section, layout hints, help text strategy.
 */
export interface FormSpec {
  id: string
  specId: string  // References DataCollectionSpec
  title: string
  pages: FormPage[]
  createdAt: string
  updatedAt: string
}

export interface FormPage {
  id: string
  title: string
  description?: string
  groups: string[]  // References RequirementGroup ids
  deliveryMode: DeliveryMode
}

export type DeliveryMode = 'static' | 'conversational' | 'hybrid'

/**
 * Submission - Immutable collected data
 * 
 * Validated data collected against a specific DataCollectionSpec version
 * (identified by git SHA). Lives outside spec repo. Links back to exact
 * spec state at collection time.
 */
export interface Submission {
  id: string
  specId: string
  specVersion: string  // git SHA
  data: Record<string, unknown>
  submittedAt: string
  status: SubmissionStatus
}

export type SubmissionStatus = 'draft' | 'submitted' | 'processed'

/**
 * FormProject - Directory in git containing specs and assets
 * 
 * The unit of collaboration. Contains DataCollectionSpec, FormSpecs,
 * and associated assets (source PDF, policy docs, delivery config).
 */
export interface FormProject {
  id: string
  name: string
  description: string
  spec: DataCollectionSpec
  formSpecs: FormSpec[]
  createdAt: string
  updatedAt: string
}

/**
 * Persona - User persona for catalog
 * 
 * Represents a stakeholder who interacts with the system.
 */
export interface Persona {
  id: string
  name: string
  role: string
  description: string
  needs: string[]
  content: string  // Full markdown content
}
EOF
```

Expected: src/types/models.ts created with type definitions

- [ ] **Step 2: Verify TypeScript compilation**

```bash
cd /home/daniel/src/forms-lab
bun run --no-warnings tsc --noEmit
```

Expected: No TypeScript errors

- [ ] **Step 3: Commit data model types**

```bash
cd /home/daniel/src/forms-lab
git add src/types/models.ts
git commit -m "feat: define core data model types

Add TypeScript interfaces for:
- DataCollectionSpec (business domain model)
- FormSpec (UX/delivery layer)
- Submission (collected data)
- FormProject (git persistence unit)
- Persona (catalog stakeholder)

Based on design spec section: Data Model"
```

Expected: Committed

---

### Task 3: Create Basic Hono Server

**Files:**
- Create: `src/server.ts`
- Create: `test/server.test.ts`

- [ ] **Step 1: Write failing health check test**

```bash
cd /home/daniel/src/forms-lab
cat > test/server.test.ts << 'EOF'
import { describe, it, expect } from 'bun:test'
import app from '../src/server'

describe('Server', () => {
  it('responds to health check', async () => {
    const res = await app.request('/health')
    expect(res.status).toBe(200)
    
    const data = await res.json()
    expect(data).toHaveProperty('status', 'ok')
    expect(data).toHaveProperty('timestamp')
  })
  
  it('responds to root path', async () => {
    const res = await app.request('/')
    expect(res.status).toBe(200)
    
    const body = await res.text()
    expect(body).toContain('Forms Lab')
  })
})
EOF
```

Expected: test/server.test.ts created

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/daniel/src/forms-lab
bun test test/server.test.ts
```

Expected: FAIL - "Cannot find module '../src/server'"

- [ ] **Step 3: Create minimal Hono server**

```bash
cd /home/daniel/src/forms-lab
cat > src/server.ts << 'EOF'
import { Hono } from 'hono'

const app = new Hono()

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  })
})

// Root page
app.get('/', (c) => {
  return c.html(
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Forms Lab</title>
</head>
<body>
  <h1>Forms Lab</h1>
  <p>LLM-Assisted Forms Platform</p>
  <nav>
    <a href="/catalog/personas">Personas</a>
  </nav>
</body>
</html>`
  )
})

// Start server when run directly
if (import.meta.main) {
  Bun.serve({
    port: process.env.PORT || 3000,
    fetch: app.fetch,
  })
  console.log(`Server running on http://localhost:${process.env.PORT || 3000}`)
}

export default app
EOF
```

Expected: src/server.ts created

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /home/daniel/src/forms-lab
bun test test/server.test.ts
```

Expected: PASS - 2 tests pass

- [ ] **Step 5: Start server manually to verify**

```bash
cd /home/daniel/src/forms-lab
bun run src/server.ts &
SERVER_PID=$!
sleep 1
curl http://localhost:3000/health
kill $SERVER_PID
```

Expected: {"status":"ok","timestamp":"..."}

- [ ] **Step 6: Commit server implementation**

```bash
cd /home/daniel/src/forms-lab
git add src/server.ts test/server.test.ts
git commit -m "feat: create basic Hono server with health check

- Add health check endpoint at /health
- Add root page with navigation
- Add test suite for server endpoints
- Export app for testing and main for running server"
```

Expected: Committed

---

### Task 4: Create Persona Files

**Files:**
- Create: `catalog/personas/maya.md`
- Create: `catalog/personas/carlos.md`
- Create: `catalog/personas/priya.md`
- Create: `catalog/personas/developer.md`
- Create: `catalog/personas/evaluator.md`

- [ ] **Step 1: Create Maya persona**

```bash
cd /home/daniel/src/forms-lab
cat > catalog/personas/maya.md << 'EOF'
---
id: maya
name: Maya
role: Form Creator (Program Officer)
---

# Maya — Form Creator

**Role:** Program Officer at a federal agency

## Background

Works at a federal agency and needs to get paper forms online. Has PDF forms and policy documents but no technical skills. Responsible for ensuring forms collect the right data and comply with accessibility and plain language requirements.

## Goals

- Get forms online quickly without waiting months for IT
- Ensure digital forms collect exactly what paper forms do
- Maintain compliance with accessibility standards
- Use plain language to make forms understandable

## Needs

- Upload a PDF and see what data the system understands
- Shape the form experience (page flow, sections, delivery modes)
- Review form quality for accessibility and completeness
- Ground help text in policy documents
- Refine form definitions with natural language

## How LLMs Help

- **PDF Extraction**: Analyzes PDF structure and produces structured specs
- **Form Suggestions**: Recommends delivery modes based on complexity
- **Quality Review**: Checks for accessibility issues and missing fields
- **Plain Language**: Transforms government jargon into clear text
- **Spec Refinement**: Modifies forms via natural language requests

## Pain Points

- Lacks technical skills to build forms from scratch
- Can't wait months for IT to implement changes
- Struggles with complex conditional logic
- Needs to ensure accuracy and compliance
EOF
```

Expected: catalog/personas/maya.md created

- [ ] **Step 2: Create Carlos persona**

```bash
cd /home/daniel/src/forms-lab
cat > catalog/personas/carlos.md << 'EOF'
---
id: carlos
name: Carlos
role: Form Filler (Citizen/Applicant)
---

# Carlos — Form Filler

**Role:** Citizen applying for government benefits

## Background

Applying for a government benefit. May have limited English proficiency, low digital literacy, or accessibility needs. Navigates complex government processes while managing work and family responsibilities.

## Goals

- Understand what information is needed and why
- Complete forms correctly the first time
- Get help with confusing questions or jargon
- Know that sensitive information is handled appropriately

## Needs

- Clear, plain language explanations
- Guidance through complex conditional logic
- Contextual help for confusing terms
- Confidence that the form is filled correctly
- Adaptive experience for complex sections

## How LLMs Help

- **Conversational Filling**: Agent explains questions and adapts the flow
- **Plain Language**: Help text written in understandable terms
- **Contextual Assistance**: On-demand explanations for specific fields
- **Adaptive Interview**: Skips irrelevant sections based on answers

## Pain Points

- Government forms use confusing jargon
- Complex conditional logic is hard to follow
- Uncertainty about whether forms are correct
- Accessibility barriers with traditional forms
EOF
```

Expected: catalog/personas/carlos.md created

- [ ] **Step 3: Create Priya persona**

```bash
cd /home/daniel/src/forms-lab
cat > catalog/personas/priya.md << 'EOF'
---
id: priya
name: Priya
role: IT Operations (Agency Technical Staff)
---

# Priya — IT Operations

**Role:** Agency technical staff maintaining form infrastructure

## Background

Maintains the infrastructure where forms are hosted. Responsible for deployments, integrations with backend systems, and operational visibility. Doesn't author forms but needs to understand the system's architecture.

## Goals

- Ensure reliable deployments
- Configure submission routing and data export
- Monitor system health and troubleshoot issues
- Understand system architecture and integration points

## Needs

- Clear documentation of system architecture
- Deployment configuration and status visibility
- Integration points with backend systems
- Operational monitoring and debugging tools
- Understanding of how forms are stored and versioned

## How the Catalog Helps

- **Operational Documentation**: Architecture, deployment, monitoring
- **Deployment Dashboard**: Status of all branch deployments
- **Integration Guides**: How to configure submission routing
- **System Overview**: Data flow, persistence, and boundaries

## Pain Points

- Needs to support a system without being involved in authoring
- Must configure integrations without breaking form workflows
- Requires operational visibility for troubleshooting
- Needs to understand git-based persistence model
EOF
```

Expected: catalog/personas/priya.md created

- [ ] **Step 4: Create Developer persona**

```bash
cd /home/daniel/src/forms-lab
cat > catalog/personas/developer.md << 'EOF'
---
id: developer
name: Developer
role: Platform Engineer
---

# Developer — Platform Engineer

**Role:** Engineer building and maintaining the Forms Lab platform

## Background

Builds and maintains the system. Uses the catalog as the primary reference for architecture, conventions, component APIs, and design decisions. Works with Claude Code to implement user stories.

## Goals

- Understand system architecture and design patterns
- Follow established conventions and patterns
- Implement features that integrate cleanly
- Document decisions and maintain architectural coherence

## Needs

- Architecture documentation (layers, data flow, boundaries)
- Coding conventions (file organization, patterns, testing)
- Component APIs and usage examples
- Design decisions (ADRs) with rationale
- Implementation patterns and templates

## How the Catalog Helps

- **Architecture Docs**: System overview, data model, integration points
- **Conventions**: File organization, service patterns, testing strategy
- **Patterns**: Templates for common tasks (add LLM service, delivery adapter)
- **Decisions**: ADRs for significant choices
- **Component Docs**: Live examples rendered from actual components

## Pain Points

- Needs to maintain consistency across stories
- Must understand architectural patterns to integrate features
- Requires clear conventions to avoid ad-hoc decisions
- Needs visibility into design rationale for informed changes
EOF
```

Expected: catalog/personas/developer.md created

- [ ] **Step 5: Create Evaluator persona**

```bash
cd /home/daniel/src/forms-lab
cat > catalog/personas/evaluator.md << 'EOF'
---
id: evaluator
name: Evaluator
role: Instructor/Stakeholder
---

# Evaluator — Instructor/Stakeholder

**Role:** Assessing project scope, technical depth, and polish

## Background

Reviews the project for course completion. Needs to understand what was built, what LLM techniques were applied, and how the pieces fit together. Evaluates both the product and the engineering approach.

## Goals

- Understand project scope and capabilities
- Assess technical depth beyond basic API usage
- Evaluate systematic approach to LLM experimentation
- See evidence of course material application

## Needs

- High-level overview of what was built
- Architecture and design decisions
- LLM integration points and experimentation
- Evidence of systematic evaluation (metrics, trade-offs)
- Live demos of key capabilities
- Clear presentation of completed user stories

## How the Catalog Helps

- **Project Overview**: Personas, user stories, status
- **Architecture**: System design, data model, decisions
- **LLM Integration**: Baseline + experiments with metrics
- **Experiments**: Comparative evaluations with trade-off analysis
- **Live Demos**: Interactive examples and form previews
- **Story Progress**: Completed vs. planned capabilities

## Pain Points

- Limited time to understand the full system
- Needs to assess technical depth, not just surface features
- Must evaluate engineering approach and decision-making
- Requires clear narrative from problem to solution
EOF
```

Expected: catalog/personas/evaluator.md created

- [ ] **Step 6: Commit persona files**

```bash
cd /home/daniel/src/forms-lab
git add catalog/personas/
git commit -m "docs: add five personas to catalog

- Maya: Form Creator (Program Officer)
- Carlos: Form Filler (Citizen/Applicant)
- Priya: IT Operations (Agency Technical Staff)
- Developer: Platform Engineer
- Evaluator: Instructor/Stakeholder

Each persona includes: role, background, goals, needs, pain points,
and how the system/LLMs help them."
```

Expected: Committed

---

### Task 5: Create Markdown Reader Utility

**Files:**
- Create: `src/lib/markdown.ts`

- [ ] **Step 1: Create markdown file reader utility**

```bash
cd /home/daniel/src/forms-lab
cat > src/lib/markdown.ts << 'EOF'
import { readdir, readFile } from 'fs/promises'
import { join } from 'path'

/**
 * Parse frontmatter and content from a markdown file
 */
export interface MarkdownFile {
  frontmatter: Record<string, string>
  content: string
}

/**
 * Parse markdown file with YAML frontmatter
 * 
 * @param filePath - Absolute path to markdown file
 * @returns Parsed frontmatter and content
 */
export async function parseMarkdown(filePath: string): Promise<MarkdownFile> {
  const raw = await readFile(filePath, 'utf-8')
  
  // Check for frontmatter
  if (!raw.startsWith('---\n')) {
    return {
      frontmatter: {},
      content: raw,
    }
  }
  
  // Find end of frontmatter
  const endIndex = raw.indexOf('\n---\n', 4)
  if (endIndex === -1) {
    return {
      frontmatter: {},
      content: raw,
    }
  }
  
  // Parse frontmatter as simple key: value pairs
  const frontmatterText = raw.slice(4, endIndex)
  const frontmatter: Record<string, string> = {}
  
  for (const line of frontmatterText.split('\n')) {
    const colonIndex = line.indexOf(':')
    if (colonIndex === -1) continue
    
    const key = line.slice(0, colonIndex).trim()
    let value = line.slice(colonIndex + 1).trim()
    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    frontmatter[key] = value
  }
  
  // Content is everything after frontmatter
  const content = raw.slice(endIndex + 5).trim()
  
  return { frontmatter, content }
}

/**
 * Read all markdown files from a directory
 * 
 * @param dirPath - Absolute path to directory
 * @returns Array of parsed markdown files with filename
 */
export async function readMarkdownDir(
  dirPath: string
): Promise<Array<MarkdownFile & { filename: string }>> {
  const entries = await readdir(dirPath, { withFileTypes: true })
  const files = entries.filter((e) => e.isFile() && e.name.endsWith('.md'))
  
  const results = await Promise.all(
    files.map(async (file) => {
      const filePath = join(dirPath, file.name)
      const parsed = await parseMarkdown(filePath)
      return {
        ...parsed,
        filename: file.name.replace('.md', ''),
      }
    })
  )
  
  return results
}
EOF
```

Expected: src/lib/markdown.ts created

- [ ] **Step 2: Commit markdown utility**

```bash
cd /home/daniel/src/forms-lab
git add src/lib/markdown.ts
git commit -m "feat: add markdown file reader utility

- Parse markdown files with YAML frontmatter
- Read all markdown files from directory
- Extract frontmatter as key-value pairs
- Return content separately"
```

Expected: Committed

---

### Task 6: Create Layout Component

**Files:**
- Create: `src/components/Layout.tsx`

- [ ] **Step 1: Create base layout component**

```bash
cd /home/daniel/src/forms-lab
cat > src/components/Layout.tsx << 'EOF'
import type { FC, PropsWithChildren } from 'hono/jsx'

interface LayoutProps {
  title?: string
}

export const Layout: FC<PropsWithChildren<LayoutProps>> = (props) => {
  const title = props.title ? `${props.title} | Forms Lab` : 'Forms Lab'
  
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title}</title>
        <style>{`
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: system-ui, -apple-system, sans-serif;
            line-height: 1.5;
            color: #1f2937;
            background: #f9fafb;
            padding: 1rem;
          }
          
          .container {
            max-width: 1200px;
            margin: 0 auto;
          }
          
          header {
            background: white;
            padding: 1.5rem;
            margin-bottom: 2rem;
            border-radius: 0.5rem;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          
          header h1 {
            font-size: 1.875rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
          }
          
          header p {
            color: #6b7280;
          }
          
          nav {
            margin-top: 1rem;
            display: flex;
            gap: 1rem;
          }
          
          nav a {
            color: #2563eb;
            text-decoration: none;
            font-weight: 500;
          }
          
          nav a:hover {
            text-decoration: underline;
          }
          
          main {
            background: white;
            padding: 2rem;
            border-radius: 0.5rem;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          
          h1, h2, h3 {
            margin-top: 1.5rem;
            margin-bottom: 0.75rem;
          }
          
          h1 { font-size: 1.875rem; }
          h2 { font-size: 1.5rem; }
          h3 { font-size: 1.25rem; }
          
          p {
            margin-bottom: 1rem;
          }
          
          ul {
            margin-left: 1.5rem;
            margin-bottom: 1rem;
          }
          
          code {
            background: #f3f4f6;
            padding: 0.125rem 0.375rem;
            border-radius: 0.25rem;
            font-family: 'Courier New', monospace;
            font-size: 0.875rem;
          }
        `}</style>
      </head>
      <body>
        <div class="container">
          <header>
            <h1>Forms Lab</h1>
            <p>LLM-Assisted Forms Platform</p>
            <nav>
              <a href="/">Home</a>
              <a href="/catalog/personas">Personas</a>
            </nav>
          </header>
          <main>{props.children}</main>
        </div>
      </body>
    </html>
  )
}
EOF
```

Expected: src/components/Layout.tsx created

- [ ] **Step 2: Commit layout component**

```bash
cd /home/daniel/src/forms-lab
git add src/components/Layout.tsx
git commit -m "feat: add base layout component

- Add Layout component with header and navigation
- Include basic CSS styling
- Support title prop for page titles"
```

Expected: Committed

---

### Task 7: Implement Catalog Persona Routes

**Files:**
- Create: `src/routes/catalog.tsx`
- Create: `test/catalog.test.ts`

- [ ] **Step 1: Write failing tests for catalog routes**

```bash
cd /home/daniel/src/forms-lab
cat > test/catalog.test.ts << 'EOF'
import { describe, it, expect } from 'bun:test'
import app from '../src/server'

describe('Catalog Routes', () => {
  describe('GET /catalog/personas', () => {
    it('returns 200 and lists all personas', async () => {
      const res = await app.request('/catalog/personas')
      expect(res.status).toBe(200)
      
      const body = await res.text()
      expect(body).toContain('Personas')
      expect(body).toContain('Maya')
      expect(body).toContain('Carlos')
      expect(body).toContain('Priya')
      expect(body).toContain('Developer')
      expect(body).toContain('Evaluator')
    })
  })
  
  describe('GET /catalog/personas/:id', () => {
    it('returns 200 and displays Maya persona', async () => {
      const res = await app.request('/catalog/personas/maya')
      expect(res.status).toBe(200)
      
      const body = await res.text()
      expect(body).toContain('Maya')
      expect(body).toContain('Form Creator')
      expect(body).toContain('Program Officer')
    })
    
    it('returns 404 for unknown persona', async () => {
      const res = await app.request('/catalog/personas/unknown')
      expect(res.status).toBe(404)
    })
  })
})
EOF
```

Expected: test/catalog.test.ts created

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /home/daniel/src/forms-lab
bun test test/catalog.test.ts
```

Expected: FAIL - Routes not found (404)

- [ ] **Step 3: Create catalog routes**

```bash
cd /home/daniel/src/forms-lab
cat > src/routes/catalog.tsx << 'EOF'
import { Hono } from 'hono'
import { join } from 'path'
import { Layout } from '../components/Layout'
import { readMarkdownDir, parseMarkdown } from '../lib/markdown'
import type { Persona } from '../types/models'

const catalog = new Hono()

// List all personas
catalog.get('/personas', async (c) => {
  const personasDir = join(process.cwd(), 'catalog', 'personas')
  const files = await readMarkdownDir(personasDir)
  
  const personas: Persona[] = files.map((file) => ({
    id: file.frontmatter.id || file.filename,
    name: file.frontmatter.name || file.filename,
    role: file.frontmatter.role || '',
    description: file.content.split('\n\n')[0],
    needs: [],
    content: file.content,
  }))
  
  return c.html(
    <Layout title="Personas">
      <h1>Personas</h1>
      <p>
        Five personas span the full lifecycle of the Forms Lab platform:
        create → fill → operate → build → evaluate.
      </p>
      <div>
        {personas.map((persona) => (
          <div key={persona.id} style="margin: 2rem 0; padding: 1.5rem; border: 1px solid #e5e7eb; border-radius: 0.5rem;">
            <h2>
              <a href={`/catalog/personas/${persona.id}`}>{persona.name}</a>
            </h2>
            <p style="color: #6b7280; margin: 0.5rem 0;">{persona.role}</p>
          </div>
        ))}
      </div>
    </Layout>
  )
})

// Individual persona page
catalog.get('/personas/:id', async (c) => {
  const id = c.req.param('id')
  const personasDir = join(process.cwd(), 'catalog', 'personas')
  const filePath = join(personasDir, `${id}.md`)
  
  try {
    const file = await parseMarkdown(filePath)
    
    const persona: Persona = {
      id: file.frontmatter.id || id,
      name: file.frontmatter.name || id,
      role: file.frontmatter.role || '',
      description: '',
      needs: [],
      content: file.content,
    }
    
    // Simple markdown-to-HTML: just replace headers and preserve line breaks
    const htmlContent = persona.content
      .split('\n')
      .map((line) => {
        if (line.startsWith('### ')) {
          return `<h3>${line.slice(4)}</h3>`
        }
        if (line.startsWith('## ')) {
          return `<h2>${line.slice(3)}</h2>`
        }
        if (line.startsWith('# ')) {
          return `<h1>${line.slice(2)}</h1>`
        }
        if (line.startsWith('**') && line.endsWith('**')) {
          return `<p><strong>${line.slice(2, -2)}</strong></p>`
        }
        if (line.startsWith('- ')) {
          return `<li>${line.slice(2)}</li>`
        }
        if (line.trim() === '') {
          return '<br />'
        }
        return `<p>${line}</p>`
      })
      .join('\n')
    
    return c.html(
      <Layout title={persona.name}>
        <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
        <p style="margin-top: 2rem;">
          <a href="/catalog/personas">← Back to Personas</a>
        </p>
      </Layout>
    )
  } catch (err) {
    return c.html(
      <Layout title="Not Found">
        <h1>Persona Not Found</h1>
        <p>The persona "{id}" does not exist.</p>
        <p>
          <a href="/catalog/personas">← Back to Personas</a>
        </p>
      </Layout>,
      404
    )
  }
})

export default catalog
EOF
```

Expected: src/routes/catalog.tsx created

- [ ] **Step 4: Mount catalog routes in server**

```bash
cd /home/daniel/src/forms-lab
cat > src/server.ts << 'EOF'
import { Hono } from 'hono'
import catalog from './routes/catalog'

const app = new Hono()

// Mount catalog routes
app.route('/catalog', catalog)

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  })
})

// Root page
app.get('/', (c) => {
  return c.html(
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Forms Lab</title>
</head>
<body>
  <h1>Forms Lab</h1>
  <p>LLM-Assisted Forms Platform</p>
  <nav>
    <a href="/catalog/personas">Personas</a>
  </nav>
</body>
</html>`
  )
})

// Start server when run directly
if (import.meta.main) {
  Bun.serve({
    port: process.env.PORT || 3000,
    fetch: app.fetch,
  })
  console.log(`Server running on http://localhost:${process.env.PORT || 3000}`)
}

export default app
EOF
```

Expected: src/server.ts updated

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd /home/daniel/src/forms-lab
bun test test/catalog.test.ts
```

Expected: PASS - All catalog tests pass

- [ ] **Step 6: Manually test persona pages**

```bash
cd /home/daniel/src/forms-lab
bun run src/server.ts &
SERVER_PID=$!
sleep 1
curl -s http://localhost:3000/catalog/personas | grep -q "Maya" && echo "✓ Persona list works"
curl -s http://localhost:3000/catalog/personas/maya | grep -q "Form Creator" && echo "✓ Maya page works"
kill $SERVER_PID
```

Expected: Both checks pass

- [ ] **Step 7: Commit catalog routes**

```bash
cd /home/daniel/src/forms-lab
git add src/routes/catalog.tsx src/server.ts test/catalog.test.ts
git commit -m "feat: implement catalog persona routes

- Add /catalog/personas route listing all personas
- Add /catalog/personas/:id route for individual persona
- Mount catalog routes in main server
- Add tests for catalog routes
- Simple markdown-to-HTML rendering for persona content"
```

Expected: Committed

---

### Task 8: Set Up GitHub Actions CI

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create GitHub Actions workflow**

```bash
cd /home/daniel/src/forms-lab
cat > .github/workflows/ci.yml << 'EOF'
name: CI

on:
  push:
    branches: ['**']
  pull_request:
    branches: [main]

jobs:
  test:
    name: Test
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest
      
      - name: Install dependencies
        run: bun install
      
      - name: Run tests
        run: bun test
      
      - name: Type check
        run: bun run --no-warnings tsc --noEmit

  lint:
    name: Lint
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest
      
      - name: Install dependencies
        run: bun install
      
      - name: Lint and format check
        run: bunx @biomejs/biome check .
EOF
```

Expected: .github/workflows/ci.yml created

- [ ] **Step 2: Commit CI workflow**

```bash
cd /home/daniel/src/forms-lab
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions workflow

- Run tests on all pushes and PRs
- Run TypeScript type checking
- Use Bun for fast test execution
- Placeholder for future formatting checks"
```

Expected: Committed

---

### Task 9: Add README Documentation

**Files:**
- Create: `README.md`

- [ ] **Step 1: Create README**

```bash
cd /home/daniel/src/forms-lab
cat > README.md << 'EOF'
# Forms Lab

LLM-Assisted Forms Platform for government forms. Upload a PDF, extract structured specs, deliver form experiences (static or conversational), and generate completed PDFs.

## Quick Start

**Prerequisites:**
- [Bun](https://bun.sh/) 1.x or later

**Install dependencies:**
```bash
bun install
```

**Run development server:**
```bash
bun run dev
```

Server starts at http://localhost:3000

**Run tests:**
```bash
bun test
```

**Run type checking:**
```bash
bun run --no-warnings tsc --noEmit
```

## Project Structure

```
/
├── src/
│   ├── routes/          # Hono routes (catalog, forms, auth, compare)
│   ├── services/        # LLM services, git adapter, auth
│   ├── components/      # JSX components (server-rendered + islands)
│   ├── types/           # TypeScript types
│   ├── lib/             # Utilities
│   └── server.ts        # Hono app entry point
│
├── catalog/             # Catalog content (versioned with code)
│   ├── personas/        # Persona markdown files
│   ├── stories/         # User stories
│   ├── architecture/    # Architecture docs
│   ├── experiments/     # LLM experiments
│   └── decisions/       # ADRs
│
├── projects/            # Form projects (specs, assets)
├── test/                # Tests (Bun test suite)
├── infrastructure/      # Deployment scripts
└── .github/workflows/   # CI/CD
```

## Tech Stack

- **Runtime:** Bun
- **Framework:** Hono
- **Language:** TypeScript
- **Testing:** Bun test
- **CI/CD:** GitHub Actions

## Architecture

- **Data Model:** DataCollectionSpec (what to collect), FormSpec (how to present), Submission (collected data)
- **Persistence:** Git-based (specs and assets in `projects/`)
- **Catalog:** Self-documenting system (personas, stories, architecture, experiments)
- **LLM Integration:** Strategy pattern with feature flags for experimentation

## Development Workflow

1. Pick a user story from [GitHub Issues](../../issues) (labeled `user-story`)
2. Create branch: `story/<issue-number>-<slug>` or `experiment/<name>`
3. Implement with TDD
4. Run tests and type checking
5. Commit frequently with descriptive messages
6. Open PR and review on deployed branch
7. Merge when approved
8. Run `bun run sync:stories` to update local story copies

## Deployment

Branch-per-deployment model: every branch gets its own deployment URL.

**Infrastructure:** Server-per-branch (container or EC2), Bun + Hono, reverse proxy routes `<branch>.domain.com` to appropriate process.

**CI/CD:** GitHub Actions runs tests on every push. Deployment triggered on push to branch.

See `infrastructure/` directory for deployment scripts and configuration.

## Design Documentation

Full design spec: `notes/final-project/2026-04-07-design.md` (in class repo)

## Contributing

This is a class project for LLM Class 2026 Winter Cohort. Development follows the vertical slicing approach: each user story delivers a complete, demoable capability.

## License

MIT
EOF
```

Expected: README.md created

- [ ] **Step 2: Commit README**

```bash
cd /home/daniel/src/forms-lab
git add README.md
git commit -m "docs: add README with setup and architecture

- Quick start instructions for development
- Project structure overview
- Tech stack and architecture summary
- Development workflow guidelines
- Deployment strategy notes"
```

Expected: Committed

---

## Self-Review

**1. Spec Coverage:**

From design spec Slice 0 requirements:
- ✓ Hono app - Task 3
- ✓ Catalog shell with personas - Tasks 4, 5, 6, 7
- ✓ CI/CD with branch-per-deployment - Task 8 (CI), notes in README for deployment
- ✓ Git persistence adapter - Deferred to future stories (file reading sufficient for skeleton)
- ✓ Data model types - Task 2
- ✓ Basic routing - Task 3, 7
- ✓ Deployment to first environment - README documents strategy, actual deployment is infrastructure setup

All requirements covered appropriately for skeleton scope.

**2. Placeholder Scan:**

No TBD, TODO, "implement later", "add appropriate", "similar to Task N", or missing code blocks.

**3. Type Consistency:**

- `DataCollectionSpec`, `FormSpec`, `Submission`, `FormProject`, `Persona` - consistent across tasks
- `parseMarkdown`, `readMarkdownDir` - consistent usage
- `Layout` component - consistent props
- Route paths - consistent (`/catalog/personas`, `/catalog/personas/:id`)

All types and names are consistent.

**Gaps:** Git persistence adapter is minimal (just file reading) but that's appropriate for skeleton. Full adapter abstraction will come in later stories when needed for write operations.

---

## Execution Handoff

Plan complete and saved to `notes/final-project/2026-04-07-skeleton-plan.md`.

**Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
