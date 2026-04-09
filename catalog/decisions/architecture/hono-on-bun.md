---
status: stable
tags: [architecture, runtime, framework]
decided: 2026-04-07
---

# Hono on Bun with Server-Rendered JSX

Use Hono web framework on Bun runtime with server-rendered JSX as the full web layer, with no client-side JavaScript framework.

## Context

The project needed a lightweight, TypeScript-native web framework that could support server-rendered HTML without the overhead of a client-side framework. The two-week delivery timeline required fast iteration, and prior art in the class repository already demonstrated Hono-on-Bun as a viable pattern. A heavier framework would have cost setup time we couldn't afford.

## Decision

We chose Hono on Bun with server-rendered JSX. Hono's JSX support lets us write HTML templates in TypeScript with familiar syntax, while Bun's native speed eliminates toolchain overhead. Hono's `serveStatic` handles static asset delivery. No client-side JavaScript framework is included — pages are HTML-first, served directly from Hono routes.

## Alternatives considered

- **Express on Node.js** — Mature ecosystem but heavier startup, no native JSX support, and requires more configuration for TypeScript. Doesn't match the class repo patterns.
- **Next.js or Remix** — Full-featured frameworks with file-based routing, data loading, and client hydration. Far more complexity than a catalog and form delivery app needs in two weeks.
- **Fastify** — Fast and TypeScript-friendly but more ceremony around JSX rendering; less ergonomic than Hono for server-rendered HTML responses.

## Consequences

- Fast development iteration — Bun starts quickly and Hono's routing is minimal boilerplate
- No client-side interactivity without implementing an "islands" pattern manually
- Smaller ecosystem than Express, though Hono's API is stable and well-documented
- Static assets served via `serveStatic`, keeping the stack simple

## Sources

- [Design spec](https://github.com/flexion/llm-class-2026-winter-cohort/blob/main/notes/final-project/2026-04-07-design.md)
