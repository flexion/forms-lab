---
title: Navigating the codebase
status: working
---

# Navigating the codebase

Forms Lab is organized so that reading `src/services/` tells you what the
system does, not how it's built.

## The three layers

- **`src/shared/`** — pure utilities with no domain content.
- **`src/services/`** — the domain. One folder per intent; each folder is a service.
- **`src/entrypoints/`** and **`src/design-system/`** — composition root and presentation.

Dependencies flow one way: `shared → services/design-system → entrypoints`.
See [software-architecture](software-architecture.md) for the full picture.

## Service public interface

Every service exposes its public API through `src/services/<name>/index.ts`.
External callers import from `'services/<name>'` only — never a deeper path:

```ts
// OK
import { createShapingRegistry } from '../../services/forms'
// NOT OK — deep import bypasses the public interface
import { createShapingRegistry } from '../../services/forms/shaping/registry'
```

This rule is enforced by `test/architecture/dependency-rule.test.ts`.
Type-only imports are included — the public interface is about intent
visibility, not just runtime coupling. Inside a service, files may
import from each other freely.

Tests that exercise a service's public API go through `services/<name>`
like any other caller. Tests that unit-test a private internal helper
may deep-import; the convention covers production code only.

## Finding things

- **"Where does X live?"** — open `src/services/`. Folder names are intents.
- **"What can service Y do?"** — open `src/services/<Y>/index.ts`. The re-export list is the service's API.
- **"Find every X in the system"** — check the catalog. Example: [LLM integrations](llm-integrations.md).

## When to add a new service

Add a new service when a chunk of code has a distinct domain boundary —
a noun in the product, not just a technical layer. See the
[architecture principles](../decisions/architecture/architecture-principles.md)
for the full test.
