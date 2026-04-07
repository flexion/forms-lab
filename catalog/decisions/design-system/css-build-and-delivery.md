---
status: stable
tags: [design-system, build, performance]
decided: 2026-04-07
---

# Bun.build() at Build Time, serveStatic for Delivery

Resolve CSS `@import` statements at build time using `bun run build:css`, producing a single `dist/styles.css`, served as a static file via Hono's `serveStatic`.

## Context

The design system CSS is organized across multiple files using `@import` for maintainability, but browsers need a single file for efficient delivery. The build step that resolves imports must be clear, fast, and not require a separate build tool installation. Delivery should be via static file serving rather than per-request processing to keep runtime overhead low.

## Decision

`bun run build:css` resolves all `@import` chains into a single `dist/styles.css` using `Bun.build()`. Hono's `serveStatic` middleware serves the `dist/` directory as static assets. In development mode, the CSS build runs automatically at server startup so the workflow remains `bun run dev` without extra steps. The `dist/` directory is gitignored — it is a build artifact, not source.

## Alternatives considered

- **Per-request Bun.build()** — The class repo uses this pattern, resolving CSS on each request in development. Not idiomatic for production and adds latency; building ahead of time is more straightforward for delivery.
- **Vite** — Full-featured frontend build tool with CSS processing, hot reload, and module bundling. Significant additional tooling for a project with straightforward CSS needs and no client-side JavaScript modules.
- **Hono CSS helper** — Hono has utilities for CSS-in-JS patterns, but these don't suit a standalone CSS file that must be independently versioned, cached, and served.

## Consequences

- CSS is served as a static file — fast delivery with standard HTTP caching
- The build step must be run before the server starts in production environments; the deploy pipeline must include it
- `dist/` is gitignored; CI must build before running any asset-dependent tests
- Dev mode builds on startup, keeping the local workflow simple

## Sources

- [Design spec](https://github.com/flexion/llm-class-2026-winter-cohort/blob/main/notes/final-project/2026-04-07-design.md)
