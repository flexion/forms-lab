---
status: working
story: 75
---

# Story #75: Live Shaping Model Evaluation — Implementation Plan

## Goal

Add `bun run cli evaluate shaping <variant-id>`, run it against all three
shaping variants (`bedrock-haiku`, `bedrock-sonnet`, `bedrock-opus`), and
update the three catalog pages with real metrics.

## Tasks

### 1. Docs commit

Commit `notes/story-75-shaping-eval/{design.md,plan.md}`.

### 2. Failing test for the CLI subcommand (TDD)

File: `test/evaluate-shaping-cli.test.ts`

The subcommand has non-trivial orchestration: parse variant id, load the
shaping registry, build the shaper, loop over six intents, invoke `shape()`,
score each, aggregate, validate against the `evaluationRunSchema`, write
JSON, write markdown. Tests cover:

- Rejects unknown variant id (returns exit code 1).
- Happy path: mock the shaping registry so `shape()` returns predictable
  commands, invoke the subcommand, verify:
  - JSON file is written to
    `catalog/experiments/shaping-model-comparison/<variant-id>.json`.
  - The JSON validates against `evaluationRunSchema`.
  - The JSON has six cases, one per scripted intent.
  - Markdown file is written to
    `catalog/experiments/shaping-model-comparison/<short-id>.md`.
  - Markdown contains "Summary" section and a metrics table.
- Failure path: one fixture throws; the CLI records it as a zero-metric
  case with `details.error` populated, and the run completes.

Use `bun:test` mock for the registry. Write results to a temp directory
via an env var or argument (see §3 for the signature). The tests should
not touch the real `catalog/` tree.

### 3. CLI subcommand implementation

File: `src/entrypoints/cli/commands/evaluate.ts`

Add a `shaping` case to the switch. Accept:

- `args[1]` — variant id (required).
- `--out-dir <path>` — output directory override (defaults to
  `catalog/experiments/shaping-model-comparison`). Tests use this to write
  to a tempdir.

Signature:

```ts
case 'shaping': {
  const variantId = args[1]
  if (!variantId) { /* usage */ return 1 }
  const outDirIdx = args.indexOf('--out-dir')
  const outDir = outDirIdx !== -1 && args[outDirIdx + 1]
    ? args[outDirIdx + 1]
    : join('catalog', 'experiments', 'shaping-model-comparison')
  // ... build shaper, loop, score, write
  return 0
}
```

Implementation sketch:

1. `const registry = createShapingRegistry()`; look up `variantId`;
   early-exit on unknown.
2. `const shaper = registry.get(variantId)`.
3. For each `fixture` in `shapingIntentFixtures`:
   - `try { const result = await shaper.shape({ intent: fixture.intent, state: fixtureProjectState }) }`
     `catch (err) { record zero-metric case with details.error }`
   - On success, call `shapingCommandsKind.score()` and record the case
     (and override the `fixture` field with `fixture.id` — the kind leaves
     it empty, intentionally).
4. `const summary = shapingCommandsKind.summarize(cases)`.
5. Build `RunResult`:
   - `kind: 'shaping-commands'`
   - `implementation: variantId` (the registry id — `bedrock-haiku` etc.)
   - `specVersion: '2026-04-19'` (the date the scripted intent suite was
     frozen — this is the suite version, not a PDF spec version).
   - `status: 'current'`
   - `timestamp: new Date().toISOString()`
   - `model: strategyMeta.metadata.name`
   - `summary: summary.metrics`
   - `cases`
6. Validate with `evaluationRunSchema.parse(result)`.
7. Write JSON to `<outDir>/<variantId>.json`.
8. Write markdown to `<outDir>/<shortId>.md` where
   `shortId = variantId.replace(/^bedrock-/, '')` — keeps the existing
   `haiku.md` / `sonnet.md` / `opus.md` filenames.
9. Log summary to stdout in the same format as `evaluate run` uses:
   `${key}: ${(value * 100).toFixed(1)}%` per metric.

Update `printUsage()` to document the subcommand.

### 4. Markdown generator

Either a new helper `generateShapingMarkdown()` in the same file, or inline.
The existing `generateRunMarkdown()` is extraction-specific (Missed/Extra
fields). For shaping we want a different per-case shape: matched kinds,
missing kinds, extra kinds.

Structure:

```
---
kind: shaping-commands
implementation: <variant-id>
status: current
course-topics: [evaluation, model-selection]
---

# Form Shaping: <model name>

> Selectable in **Settings → Variants → Shaping**.

**Status:** <metadata.status>

## Summary

| Metric | Value |
|---|---|
| Command-Kind Recall | 83.3% |
| Command-Kind Precision | 100.0% |
| Argument Accuracy | 95.0% |

## Approach

<hand-authored approach section — preserved from current placeholder>

## Per-intent Results

| Intent | Recall | Precision | Arg Accuracy | Matched | Missing | Extra |
|---|---|---|---|---|---|---|
| swap-pages | 100% | 100% | 100% | swapPages | — | — |
| ...

## Findings

<hand-authored after the first run>

## Cost

Bedrock on-demand pricing at run time. <model-specific line>
```

The "Approach" and "Findings" sections are authored by hand; the generator
overwrites only the generated portions (frontmatter, Summary, Per-intent
Results). Cleanest implementation: regenerate the whole file each run,
with the hand-authored blocks read from a template in the generator. But
that's over-engineered for three files. Simpler: the generator produces a
complete markdown page, we hand-edit the Approach/Findings/Cost sections
once after the live run, and we don't re-run the generator in anger.

**Decision:** CLI writes a fully-generated markdown with stub
Approach/Findings/Cost sections. After the three live runs, edit those
sections by hand on each of the three pages. Document this in the plan so
future runs understand the workflow.

### 5. Run the three live evals

Once the CLI is green and `bun run check` passes, run (serial, in the
worktree):

```bash
AWS_REGION=us-east-1 AWS_BEDROCK_REGION=us-east-1 bun run cli evaluate shaping bedrock-haiku
AWS_REGION=us-east-1 AWS_BEDROCK_REGION=us-east-1 bun run cli evaluate shaping bedrock-sonnet
AWS_REGION=us-east-1 AWS_BEDROCK_REGION=us-east-1 bun run cli evaluate shaping bedrock-opus
```

Each run writes one JSON + one MD. User has pre-authorized these three
runs; no per-run approval gate.

### 6. Hand-author Approach/Findings/Cost on each catalog page

For each of `haiku.md` / `sonnet.md` / `opus.md`:

- Preserve the "Approach" paragraph from the current stub.
- Write a 1-3 bullet Findings section interpreting the numbers.
- Add a Cost section with the Bedrock pricing for the model (copy format
  from `catalog/experiments/pdf-field-extraction/sonnet.md` if it has one,
  otherwise construct it fresh).
- Update frontmatter `implementation` to use the registry id
  (`bedrock-haiku` etc.), aligning with the JSON `implementation` field.

### 7. Roadmap + orchestration updates

- `catalog/experiments/_roadmap.md` — update the #59 row's Catalog column
  to replace "metrics pending first live eval run" with the headline
  numbers. Add a Tier-2 line for #75 if not already present (it is not —
  #75 was filed after the roadmap was last written; append to the picker
  or capability section as a "follow-up: live evaluation shipped").
- `notes/experiment-orchestration.md` — flip #75 row from `planned` to
  `pr-open` in the status table.

### 8. Verify + draft PR

- `bun run check` must be green.
- Push branch `experiment/75-shaping-eval` (already exists per worktree).
- Open draft PR with `--base experiment/73-prompt-optimization` (this story
  is stacked on #76's branch because both modify `evaluate.ts`).
- PR body: context, headline metrics for each variant, link to #75, note
  that it is stacked on #76.

## Commit sequence

1. `docs(story-75): design and plan for live shaping eval` — notes only.
2. `test(cli): add failing test for shaping subcommand` — red test.
3. `feat(cli): add evaluate shaping subcommand` — green test.
4. `docs(catalog): align shaping-model-comparison frontmatter with registry ids`
   — frontmatter migration on the three existing pages.
5. (After live runs) one commit per variant updating the catalog page, or
   a single `docs(catalog): fill shaping-model-comparison metrics` commit
   covering all three + JSON artifacts + roadmap updates.

## Non-goals

- Do not generalise `runEvaluation()` to accept non-PDF inputs — see
  design.md "Inline shape+score loop".
- Do not touch extraction variants — those belong to #73/#64/#74.
- Do not add new scripted intents.
- Do not merge — coordinator session opens a draft PR and reports.
