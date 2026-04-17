---
status: stable
tags: [architecture, llm, security, shaping]
decided: 2026-04-15
---

# LLM tool-use as the validation boundary

The shaping service uses AI SDK tool-use mode to constrain Claude's output to a fixed set of typed tools. Each tool is backed by a Zod schema. The server re-validates every command with the same schema before the executor runs.

## Context

Story 4's first-round implementation asked Claude to return a revised `FormSpec` as free-form JSON. That approach mixed three responsibilities into one parse step: structural well-formedness, schema conformance, and semantic validity. Malformed output was ambiguous — was this an attack, a generation failure, or an off-by-one in the prompt? — and ad-hoc JSON recovery logic grew quickly.

The command-based design (see [Command-based form shaping](command-based-shaping.md)) gave us a clean discriminated union of edit operations. The question became: how should the LLM express a command sequence?

## Decision

**Each command kind is exposed to the LLM as a tool.** `src/services/forms/shaping/tools.ts` registers one AI SDK tool per command variant, with its `input` parameter schema matching the Zod schema for that command.

**The Zod schema is the single source of truth.** The same schemas defined alongside the command vocabulary in `src/services/forms/shaping/commands.ts` are what the AI SDK uses to describe tools to Claude and what the server uses to validate each command before execution. There is no separate "LLM request schema".

**The server re-validates, even though Claude is constrained.** After Bedrock returns a tool-call sequence, the shaper parses each call with `commandSchema.parse()` before handing the batch to the executor. This guards against:

- SDK version skew (Claude's tool-call shape changing underneath us)
- Partial tool calls (truncated output, timeouts)
- Any future path that might ingest commands from another source

**The executor performs semantic validation.** A well-formed command ("`removeGroup(id: x)`") may still fail because `x` doesn't exist, or because removing it would leave orphaned fields with no destination. The executor runs state-dependent checks and can reject a command, which triggers batch rollback.

## Consequences

Three layers of defense protect `FormSpec`/`DataCollectionSpec` integrity from LLM output:

1. **Tool grammar** (provider-enforced). Claude cannot emit a call whose arguments don't match the declared schema.
2. **Zod re-validation** (server-enforced). The server doesn't trust the SDK to have done step 1 correctly.
3. **Executor semantic validation** (state-aware). Structural validity is not semantic validity. The executor enforces the latter.

Adding a new command is a two-file change: extend the union in `commands.ts` (which adds a Zod schema) and register a matching tool in `tools.ts`. Both the LLM grammar and server validation update together.

The [threat model](../../architecture/threat-model.md) entry for form shaping cites Zod schema enforcement as the primary integrity boundary between Claude's output and the filesystem.

## Sources

- Design note: [`notes/2026-04-15-command-based-shaping-design.md`](../../../notes/2026-04-15-command-based-shaping-design.md) (in-repo)
- Code: `src/services/forms/shaping/tools.ts`, `commands.ts`, `bedrock-shaper.ts`
- Related: [Command-based form shaping](command-based-shaping.md)
