---
kind: pdf-field-extraction
implementation: tool-use-sonnet
status: current
course-topics: [evaluation, constrained-generation, tool-use]
---

# PDF Field Extraction: Claude Sonnet 4 (Tool-Use)

> Selectable in **Settings → Variants → Extraction**.

## Approach

Replaces the free-form JSON extraction prompt (Step 1) with AI SDK tool-use. The model calls domain tools incrementally:

| Tool | Purpose |
|---|---|
| `createSpec` | Initialize form ID, title, description |
| `addGroup` | Start a new requirement group |
| `addField` | Add a field to the current group |
| `flagLowConfidence` | Flag uncertain fields |

Each tool has an `execute` handler that returns an acknowledgment, allowing multi-step extraction via `stopWhen: stepCountIs(20)`. The model builds the spec iteratively across multiple rounds rather than producing one large JSON blob.

Steps 2 (FormSpec generation) and 3 (AcroForm field mapping) remain free-JSON — only the error-prone Step 1 uses tool-use.

## Metrics (LLM Judge, Opus scorer)

| Metric | Tool-Use | Baseline Sonnet | Delta |
|---|---|---|---|
| Field Recall | 34.6% | 62.1% | -27.5pp |
| Field Precision | 96.3% | 78.9% | **+17.4pp** |
| Type Accuracy | 97.4% | 97.0% | +0.4pp |
| Group Accuracy | 36.2% | 31.4% | **+4.8pp** |
| Sensitivity Accuracy | 78.6% | 27.3% | **+51.3pp** |

## Findings

**Constrained output eliminates false positives.** Precision (96.3%) is the highest of any variant. When the model calls `addField`, it commits to a valid field structure — no malformed JSON, no hallucinated schema violations.

**Sensitivity classification dramatically improved.** The tool schema forces explicit `sensitivity` enum selection. The model can't accidentally omit sensitivity (as it does with free JSON); it must choose from `low|medium|high|pii`. This structural constraint produces 78.6% sensitivity accuracy vs 27.3% for baseline — a 51pp improvement.

**Recall limited by step count.** At `stepCountIs(20)`, the model gets ~18 usable rounds after the initial PDF processing step. Complex forms (pardon application: 140+ fields) cannot be fully extracted in 20 rounds. The W-9 (8 fields) extracts completely; the I-9 (moderate) partially; the pardon application barely starts.

**Production path:** Increasing `stepCountIs` to 50-100 would likely recover recall at the cost of latency and token spend. This is a tuning knob, not a fundamental limitation of the approach.

## Course Connection

Assignment 10 showed that the `llama-tool-force` instruction ("You must ONLY respond by calling tools") was the single most effective intervention across architectures — achieving 100% on Llama 4, DeepSeek, Qwen, and Nova models that scored 50-58% with baseline prompts. The tool-use extraction variant applies the same principle at a deeper level: the model literally cannot produce non-tool output, ensuring every emission is schema-valid.

The homework also documented a universal 15-field ceiling for non-Claude models on structured extraction. Tool-use on Claude doesn't hit that ceiling (Sonnet can handle arbitrary complexity) but introduces its own ceiling via the step limit — a different constraint with a simpler fix (increase the step budget).

## Cost

Same model (Sonnet), but multi-step extraction uses more tokens due to accumulated conversation history. Each round adds the full tool call + result to context.

| Form Complexity | Steps Used | Est. Cost | vs Baseline |
|---|---|---|---|
| Simple (W-9, 8 fields) | 3-5 | ~$0.15 | ~1x |
| Moderate (I-9, 30 fields) | 10-15 | ~$0.50 | ~2x |
| Complex (Pardon, 140+ fields) | 20 (limit) | ~$0.80 | ~3x |

The cost scales with form complexity because each step accumulates prior context. For production use on complex forms, the step limit should be raised but cost-monitored.
