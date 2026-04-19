---
status: working
story: 75
---

# Story #75: Live Shaping Model Evaluation — Design

## Problem

Story #59 shipped the `shaping-commands` eval kind plus six scripted intents
with expected `Command[]` outputs, and registered three shaping variants
(`bedrock-haiku`, `bedrock-sonnet`, `bedrock-opus`). The scoring logic is
unit-tested. What is missing is the runner that actually calls each model
with the scripted intents and records the results, and the catalog pages
currently carry placeholder dashes instead of real metrics.

## Goal

A single CLI command that takes a shaping variant id, runs the six scripted
intents against it, scores the results with the `shaping-commands` kind, and
writes:

- `catalog/experiments/shaping-model-comparison/<variant-id>.json` — raw
  `RunResult` matching `evaluationRunSchema`, suitable for regenerating the
  markdown or for future catalog rendering.
- Updated `catalog/experiments/shaping-model-comparison/<short-id>.md` — the
  summary table replaced with real numbers, findings populated.

Run it three times (haiku, sonnet, opus) and populate the three catalog
pages with live metrics.

## Non-goals

- No new eval kind. `shapingCommandsKind` already computes the three metrics
  we need.
- No new intents. #59 shipped six and that is the suite.
- No refactor of `runEvaluation`. That harness is hard-typed to
  `PdfExtractor`; generalising it would be a multi-file change with its own
  test surface. The shape+score loop for shaping is six lines and fits
  cleanly inline in the CLI subcommand. If a second non-extraction eval
  kind appears later, that is the moment to generalise the harness.
- No changes to the shaping variants themselves — the three Bedrock shapers
  from #59 are what we are measuring.

## Key design decisions

### Parallel CLI subcommand, not a replacement

The existing `evaluate run <strategy-id>` subcommand is extraction-specific:
it loads PDF fixtures, passes them to a `PdfExtractor`, expects a
`DataCollectionSpec` as ground truth, and runs the `pdfFieldExtractionKind`.
Trying to generalise it to also handle shaping would force polymorphism on
all five arguments (fixtures, input type, extractor type, kind, output dir)
and break the existing `--scorer llm-judge` flag.

Instead, add a sibling subcommand:

```
bun run cli evaluate shaping <variant-id>
```

It shares no code paths with `evaluate run`, has its own output directory
(`catalog/experiments/shaping-model-comparison/`), and loads its own
fixtures (`shapingIntentFixtures`). The dispatch in `evaluate.ts` gains one
more `case 'shaping':` branch.

### Inline shape+score loop, not a generic shaping harness

```ts
for (const fixture of shapingIntentFixtures) {
  const result = await shaper.shape({
    intent: fixture.intent,
    state: fixtureProjectState,
  })
  const caseMetrics = await shapingCommandsKind.score(
    { commands: result.commands, explanation: result.explanation },
    fixture.groundTruth,
  )
  cases.push({ fixture: fixture.id, metrics: caseMetrics.metrics, details: caseMetrics.details })
}
```

That is the entire loop. Wrapping it in a reusable `runShapingEvaluation()`
helper would be premature abstraction; if a future story needs the same
shape we extract then. The loop lives in the CLI.

### Error handling: commit partial results

If `shape()` throws for one intent (e.g. model returns an invalid command
sequence — the Bedrock shaper validates and throws), the CLI should record
that case as a failure (empty commands, zero metrics) and continue. The
presentation benefits from seeing "opus scored 6/6, sonnet 6/6, haiku 4/6
with failures on intents X and Y" rather than a blown-up run that produces
no catalog entry. The `RunResult` schema does not carry per-case error text,
so we stash the error message in `details.error` and record zero metrics
for that case.

### Frontmatter alignment

The three existing catalog pages use `implementation: haiku` / `sonnet` /
`opus`. The registry ids are `bedrock-haiku` / `bedrock-sonnet` /
`bedrock-opus`. The `RunResult.implementation` field comes from the
variant id we pass in, which should be the registry id so future tooling
(picker, provenance) keeps working. Update the three markdown frontmatters
to `implementation: bedrock-haiku` etc. to match. The file names stay
short (`haiku.md`) to keep the URLs tidy — the markdown frontmatter and
the JSON file name are the source of truth for the variant id.

### No caching

The extraction path runs through `createCachedPdfExtractor` because PDF
extraction costs a few dollars per run and we rerun fixtures often.
Shaping intents are cheap (single tool-calling turn on a short prompt) and
we only expect to run this three times, so caching is not worth the extra
plumbing. If we rerun, we rerun.

## Risks

- **Bedrock rate limits.** Three runs must be serial, not parallel. The
  orchestration doc already flags this; the CLI does not itself attempt to
  parallelise.
- **Non-determinism.** The Bedrock shaper does not pass `temperature=0`, so
  two runs may differ by an intent or an argument. The catalog page records
  the timestamp of the run so anyone looking at the numbers can tell how
  fresh they are.
- **Schema drift.** `evaluationRunSchema` was written for extraction but the
  fields generalize (kind, implementation, summary, cases). We reuse it
  as-is. If a future kind needs a different shape, that is a schema change
  at that point.

See `plan.md` for task-level breakdown.
