---
status: stable
tags: [design-system, rendering, security]
decided: 2026-04-07
---

# markdown-it with HTML Disabled by Default

Use `markdown-it` as the markdown renderer with `html: false`, ensuring raw HTML in markdown source is escaped rather than passed through to the browser.

## Context

The catalog renders markdown for all content types — architecture docs, decisions, personas, and user stories synced from GitHub Issues. GitHub Issue bodies in particular can contain arbitrary user-authored content. A renderer that passes through raw HTML by default would require a separate HTML sanitization step to be safe; skipping sanitization would expose the catalog to XSS via crafted issue content.

## Decision

`markdown-it` is configured with `html: false` (its default, made explicit). Raw HTML tags in markdown source are escaped and rendered as visible text rather than interpreted as markup. This makes the renderer safe by default for all content sources, including synced GitHub Issues. GFM-style features (tables, strikethrough, etc.) are available via `markdown-it` plugins when needed.

## Alternatives considered

- **marked** — Popular and fast, but HTML passthrough is enabled by default; safe use requires adding a sanitization library (e.g., `DOMPurify` or `sanitize-html`). An extra dependency and an easy misconfiguration.
- **micromark** — The lower-level parser underlying `remark`. Correct and spec-compliant, but requires assembling extension plugins for most features rather than getting them out of the box.
- **unified/remark** — Powerful AST-based pipeline with broad plugin ecosystem. Appropriate for complex processing pipelines, but more configuration overhead than a catalog renderer requires.

## Consequences

- Safe by default for all content, including untrusted GitHub Issue bodies
- No separate HTML sanitization library is needed, reducing dependency surface
- Authors cannot embed raw HTML in markdown for layout tricks; they must use markdown syntax
- GFM extensions can be added via `markdown-it` plugins as specific formatting needs arise

## Sources

- [Design spec](https://github.com/flexion/llm-class-2026-winter-cohort/blob/main/notes/final-project/2026-04-07-design.md)
