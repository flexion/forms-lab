---
status: working
date: 2026-04-20
topic: fix conversational edit failures on multi-step command sequences
---

# Conversational edit: make multi-step sequences work

## Problem

Running a conversational edit like `'add a new "confirmation" page at the end with a checkbox'` surfaces:

> `Error: LLM produced invalid command sequence: Unknown field id: confirmation-group_field_0 (command 3)`

The LLM emits a 4-command sequence (`addPage` → `addGroup` → `addField` → `setFieldControl`) and invents an id for a field it didn't explicitly create, so the sequential validator in `executor.ts:592` rejects the last command.

## Root causes

1. The shaper prompt (`bedrock-shaper.ts:58-62`) doesn't teach the LLM the multi-step id pattern: provide an explicit `id` to creation tools you plan to reference, then reuse that exact id. Tool descriptions hint at it but the prompt itself is vague.
2. The shaper throws on the first validation failure — no retry with error feedback. The `previousAttempt` plumbing already exists on `ShapingRequest` but is only used by the client-side retry UX.
3. The LLM over-commands: `boolean` already renders as a checkbox, so `setFieldControl` is redundant — but nothing tells the LLM that, and `addField` has no `control` / `helpText` shortcut so complex fields require 2+ commands.
4. "Unknown field id" errors don't list the ids that DO exist, so neither the LLM on retry nor a human debugging can self-correct easily.

## Changes

### 1. Prompt hardening — `src/services/forms/shaping/bedrock-shaper.ts`
Expand the Guidance block with:
- An explicit multi-step id rule + a 2-line worked example.
- Defaults awareness: `boolean` → checkbox, `choice` → radio. Skip redundant `setFieldControl`.
- Brief reminder that ids invented for new entities should be short, stable, and reused.

### 2. `addField` one-shot — `commands.ts`, `tools.ts`, `executor.ts`
Add optional params to `addFieldSchema`:
- `control?: 'radio' | 'select' | 'checkbox' | 'toggle'`
- `helpText?: string`

`execAddField` writes them onto the new `Requirement` when present. Tool description gains one sentence teaching the optional shortcuts. No behavior change when unused.

### 3. Validation retry wrapper — new file `src/services/forms/shaping/retry.ts`
```
withValidationRetry(inner: FormShaper, { maxRetries?: number }): FormShaper
```
Wraps any `FormShaper`. On `executeBatch` failure, re-invokes the inner shaper with `previousAttempt` populated (the rejected commands + a human-readable feedback message including the failing command index, the executor error, and the list of known ids at the failure point). Default `maxRetries: 1`.

Refactor: `bedrock-shaper.ts` stops throwing on validation failure — it returns `{ commands, explanation }` unconditionally. The wrapper owns validate + retry. The existing `validateCommands` helper stays exported (tests use it).

Wire the wrapper around every registered shaping variant at the entrypoint where the `shapingRegistry` is built. Bedrock is the only live variant; mock/stub variants used in tests can be wrapped too since validation is deterministic.

### 4. Richer executor errors — `executor.ts`
Every "Unknown field id" / "Unknown groupId" / "Unknown pageId" / "Unknown afterPageId" etc. message appends the known ids of that type at the point of failure, e.g. `Unknown field id: X. Known field ids: [firstName, middleName, ..., certify]`. Same `ExecutorResult` shape, just a better message. Test assertions that use `toContain` on the error keep working; ones that match exactly need adjusting.

### 5. Fixture intents — `src/services/evaluation/fixtures/shaping-intents.ts`
Add three multi-step fixtures to the existing 6:
- `add-confirmation-page` — "Add a confirmation page at the end with a checkbox" — expects `addPage(id='confirmation')` + `addGroup(id='confirmation-group', pageId='confirmation')` + `addField(id='confirmation-acknowledgment', groupId='confirmation-group', fieldType='boolean', required=true)`.
- `add-phone-to-personal` — "Add a phone number field to personal info" — expects single `addField(groupId='personal-info', fieldType='phone')`.
- `add-agreement-page` — "Add an agreements page with two checkboxes: terms and privacy" — `addPage` + `addGroup` + two `addField`s all wiring into the same new group id.

These fixtures are used by the existing `shapingIntentFixtures` harness; they're not executed against Bedrock in `bun test` — that's the eval harness.

### 6. Tests
- `test/forms/shaping/retry.test.ts` — unit-test `withValidationRetry` with a fake inner shaper. Scenarios: success first try, success on retry, failure after max retries, feedback message contains known ids.
- `test/forms/shaping/executor-fields.test.ts` — extend with `addField` accepting `control` and `helpText`.
- `test/forms/shaping/executor-fields.test.ts` and siblings — confirm error messages include known-id list for at least one representative case per type.
- `test/evaluation/shaping-commands.test.ts` — runs the expanded fixture list; existing ground-truth scoring should pass.

## Out of scope
- Running any new Bedrock eval in CI — that's scope C.
- UI changes. Error banners already surface validation errors; they get better messages for free.
- `addPage` / `addGroup` shape changes — only `addField` gains optional params.
- Prompt work beyond the Guidance block (no few-shot, no RAG, no variant-specific prompts).

## Success criteria
- `bun run check` passes (lint + types + tests).
- The original intent `'add a new "confirmation" page at the end with a checkbox'` emits a legal command sequence end-to-end against the fixture project state with the stubbed shaper that generates the expected `addPage + addGroup + addField` sequence.
- The retry wrapper turns a transient invalid-id sequence into a successful one without user intervention.
- No existing test regresses.
