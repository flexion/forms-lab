---
status: working
story: 59
---

# Story #59: Shaping Model Comparison — Implementation Plan

## Goal

Register shaping variants for Haiku, Sonnet (promoted baseline), and Opus so Maya can select which model drives form shaping. Create a new evaluation kind `shaping-commands` that scores variants against scripted intents with expected Command[] outputs. Build a new catalog suite.

## Architecture

The shaping pipeline: `src/services/forms/shaping/bedrock-shaper.ts` creates a `FormShaper` that calls Bedrock with tool-use. The `createBedrockFormShaper(options?)` factory accepts an optional `model` parameter (defaults to Sonnet). The shaping registry at `src/services/forms/shaping/registry.ts` currently has only `bedrock-sonnet`.

The shaping architecture suite at `catalog/experiments/shaping-architecture/` documents the qualitative command-based vs full-rewrite comparison. The NEW suite `catalog/experiments/shaping-model-comparison/` will be quantitative: precision/recall on command-kind + args across models.

Model IDs from `src/services/extraction/models.ts`:
- `OPUS_MODEL_ID = 'us.anthropic.claude-opus-4-6-v1'`
- `SONNET_MODEL_ID = 'us.anthropic.claude-sonnet-4-20250514-v1:0'`
- `HAIKU_MODEL_ID = 'us.anthropic.claude-haiku-4-5-20251001-v1:0'`

The settings UI at `src/entrypoints/app/routes/settings/components.tsx` already renders shaping variants from the registry. Adding variants to the registry is sufficient for them to appear in the UI.

The `TASK_META.shaping.benchmarksPath` currently points to `/catalog/experiments/shaping-architecture`. This should be updated to point to `/catalog/experiments/shaping-model-comparison` since the new suite is the quantitative benchmark.

## Tasks

### 1. Register Haiku and Opus shaping variants

In `src/services/forms/shaping/registry.ts`:

```typescript
import { HAIKU_MODEL_ID, OPUS_MODEL_ID, SONNET_MODEL_ID } from '../../extraction/models'

// Update existing bedrock-sonnet to use the shared constant and add richer metadata:
registry.register({
  id: 'bedrock-sonnet',
  metadata: {
    name: 'Claude Sonnet 4',
    description: 'Balanced quality and speed. Current default for interactive shaping.',
    status: 'baseline',
    courseTopics: ['llm-integration', 'form-authoring', 'model-selection'],
    catalogPath: '/catalog/experiments/shaping-model-comparison/sonnet',
    modelId: SONNET_MODEL_ID,
  },
  create: () => createBedrockFormShaper({ model: SONNET_MODEL_ID }),
})

registry.register({
  id: 'bedrock-haiku',
  metadata: {
    name: 'Claude Haiku 4.5',
    description: 'Fast and cheap. May miss nuance in complex shaping requests.',
    status: 'experimental',
    courseTopics: ['llm-integration', 'form-authoring', 'model-selection'],
    catalogPath: '/catalog/experiments/shaping-model-comparison/haiku',
    modelId: HAIKU_MODEL_ID,
  },
  create: () => createBedrockFormShaper({ model: HAIKU_MODEL_ID }),
})

registry.register({
  id: 'bedrock-opus',
  metadata: {
    name: 'Claude Opus 4.6',
    description: 'Frontier model. Highest quality for complex multi-step shaping.',
    status: 'experimental',
    courseTopics: ['llm-integration', 'form-authoring', 'model-selection'],
    catalogPath: '/catalog/experiments/shaping-model-comparison/opus',
    modelId: OPUS_MODEL_ID,
  },
  create: () => createBedrockFormShaper({ model: OPUS_MODEL_ID }),
})

registry.setDefault('bedrock-sonnet')
```

### 2. Create shaping-commands evaluation kind

Create `src/services/evaluation/kinds/shaping-commands.ts`:

This evaluation kind scores a shaping variant against scripted intents. Each test case provides:
- An input `ShapingRequest` (intent string + ProjectState)
- An expected `Command[]` output

Scoring per case:
- **Command-kind recall**: fraction of expected command kinds that appear in output
- **Command-kind precision**: fraction of output command kinds that appear in expected
- **Argument accuracy**: for matched commands, fraction of arguments that match expected values

The kind implements `EvaluationKind<ShapingOutput, ShapingGroundTruth>` where:
```typescript
interface ShapingOutput {
  commands: Command[]
  explanation: string
}
interface ShapingGroundTruth {
  intent: string
  expectedCommands: Command[]
}
```

### 3. Create scripted intent fixtures

Create `src/services/evaluation/fixtures/shaping-intents.ts` with ~6 intents reused from the shaping-architecture suite:

1. "Swap pages 2 and 3" → `[{ kind: 'swapPages', a: 'page-2', b: 'page-3' }]`
2. "Combine the two employment pages into one" → `[{ kind: 'mergePages', ... }]`
3. "Make the middle-name field optional" → `[{ kind: 'setRequired', id: '...', required: false }]`
4. "Move 'military service' to page 4" → `[{ kind: 'moveGroup', ... }]`
5. "Rename 'personal info' to 'applicant information'" → `[{ kind: 'renamePage', ... }]`
6. "Suggest delivery modes for each section based on complexity" → `[{ kind: 'setDeliveryMode', ... }, ...]`

Each fixture needs a realistic `ProjectState` (FormSpec + DataCollectionSpec). Use a minimal but plausible state with 4-5 pages, 6-8 groups, and enough fields to make the intents meaningful. Define this state once as a shared fixture.

### 4. Update settings UI benchmarks path

In `src/entrypoints/app/routes/settings/components.tsx`, update `TASK_META.shaping.benchmarksPath` from `'/catalog/experiments/shaping-architecture'` to `'/catalog/experiments/shaping-model-comparison'`.

### 5. Write tests

Update `test/forms/shaping/registry.test.ts`:
- Test all three variants are registered
- Test each has correct modelId in metadata
- Test default is bedrock-sonnet
- Test each returns a FormShaper with a `shape` function

Create `test/evaluation/shaping-commands.test.ts`:
- Test scoring logic: given known commands and expected commands, verify precision/recall/argument accuracy
- Test edge cases: empty commands, extra commands, partial matches
- Test summarize: averages metrics across cases

### 6. Create catalog suite

Create `catalog/experiments/shaping-model-comparison/_suite.md`:
```markdown
---
kind: shaping-commands
status: working
---

# LLM-Assisted Form Shaping: Model Comparison

Quantitative comparison of Claude models on the form shaping task...
```

Create `catalog/experiments/shaping-model-comparison/haiku.md`, `sonnet.md`, `opus.md` — each with frontmatter and placeholder metrics (to be filled by evaluation run).

### 7. Update roadmap and orchestration doc

In `catalog/experiments/_roadmap.md`, update #59 row to `pr-open`.
In `notes/experiment-orchestration.md`, update #59 row to `pr-open`.

## Verification

Run `bun run check` — must be green. Do NOT run shaping evaluation (gated).

## Non-goals

- Do not implement a CLI `evaluate` subcommand for shaping (that can come later)
- Do not modify the extraction pipeline
- Do not add VariantBadge to shaping views (it may already be there; if not, it's a follow-up)
- Keep the shaping-architecture suite intact — this is a new parallel suite
