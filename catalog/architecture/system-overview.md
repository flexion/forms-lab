---
status: working
tags: [architecture, overview]
---

# System Overview

Forms Lab is a PDF-in, form-experience, PDF-out platform for government forms. Upload a government PDF form, the system extracts structured specs, delivers a form-filling experience (web form or conversational agent), and produces a completed PDF.

## Components

### Catalog

The system's self-documentation layer. Serves as the entry point for all stakeholders — developers browse architecture docs, evaluators review project progress, form creators understand capabilities.

Content types: personas, decisions, architecture docs, user stories, experiments. Each is stored as markdown with YAML frontmatter in the `catalog/` directory and rendered as HTML by dedicated Hono routes.

The catalog is a **computed view** over structured content — it reads from the filesystem and renders, never storing separate state. Git is the system of record.

### Data Model

Three-tier separation:
- **DataCollectionSpec** — what data to collect (fields, types, constraints, conditions, sensitivity)
- **FormSpec** — how to present it (pages, sections, delivery modes)
- **Submission** — collected data linked to exact spec version

See [Data Model](data-model.md) for details.

### Form Projects

A `projects/` directory contains form project directories, each with specs, form definitions, and source assets (PDFs, policy docs). Each project is a unit of collaboration.

### CLI

Operational commands via `bun run cli <command>`. Currently: `sync-stories` to pull GitHub Issues into local markdown files.

### Infrastructure

Single EC2 instance with Caddy reverse proxy. Branch-per-subpath deployment: each branch gets a unique URL path. GitHub webhook triggers deploys. See infrastructure decisions for details.

## Data Flow

1. Maya uploads PDF → LLM extracts DataCollectionSpec + default FormSpec
2. Maya shapes FormSpec via LLM-assisted command-based editor; each accepted batch executes atomically, produces a git commit, and is recorded in a structured shaping log
3. Maya reviews changes via semantic diff, approves to publish
4. Carlos fills published form → Submission captured against spec version
5. Maya downloads completed PDF with submission data mapped to template

## Technology

- **Runtime:** Bun
- **Framework:** Hono with server-rendered JSX
- **Persistence:** Git (file-based)
- **Styling:** Two-tier CSS tokens, cascade layers, USWDS visual contract testing
- **CI:** GitHub Actions (tests, type check, lint)
- **Deploy:** Pulumi (EC2), Caddy, Nix-built processes, GitHub webhook

## Sources

- [Design spec](https://github.com/flexion/llm-class-2026-winter-cohort/blob/main/notes/final-project/2026-04-07-design.md)
- [Hono on Bun decision](../decisions/architecture/hono-on-bun.md)
- [Git as persistence decision](../decisions/architecture/git-as-persistence.md)
