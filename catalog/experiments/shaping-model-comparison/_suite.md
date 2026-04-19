---
kind: shaping-commands
status: working
---

# LLM-Assisted Form Shaping: Model Comparison

Quantitative comparison of Claude models on the form shaping task. Each variant uses the same command-based shaping architecture (tool-use with 25 domain commands); only the model differs.

## Metrics

| Metric | Description |
|---|---|
| Command-Kind Recall | Fraction of expected command kinds that appear in the model's output |
| Command-Kind Precision | Fraction of output command kinds that match expected commands |
| Argument Accuracy | For matched commands, fraction of arguments that match expected values |

## Test Suite

Six scripted intents from the [shaping architecture experiment](/catalog/experiments/shaping-architecture), now evaluated quantitatively:

1. "Swap pages 2 and 3"
2. "Combine the two employment pages into one"
3. "Make the middle-name field optional"
4. "Move 'military service' to page 4"
5. "Rename 'personal info' to 'applicant information'"
6. "Suggest delivery modes for each section based on complexity"

Each intent runs against a shared 5-page Benefits Application fixture with personal information, employment (current/previous), military service, and review sections.

## Scoring Method

Deterministic. The `shaping-commands` evaluation kind compares the model's `Command[]` output against scripted expected commands. No LLM judge is used — scoring is purely structural (kind matching + argument comparison).

## Available via the picker

Each variant is user-selectable at [/settings/variants?task=shaping](/settings/variants?task=shaping). The selected variant runs on every shaping request; provenance is recorded in the project's shaping log.

## Course Topics

- Evaluation and benchmarking (Chapter 3)
- Model selection (Chapter 6)
- Tool-use architectures for structured output

## Evaluation Status

The `shaping-commands` evaluation kind is implemented and tested with synthetic data (19 unit tests validate scoring logic). Live model evaluation requires a CLI runner that calls each model with the scripted intents — this is planned follow-up work. The scoring kind itself is validated: precision/recall/argument-accuracy metrics compute correctly and the summarizer averages correctly across cases.

## Course Connection

Assignment 10 showed that model selection is the largest lever for tool-calling tasks — Haiku 4.5 achieves 100% with a 4-line baseline prompt while no amount of optimization makes Llama 3.1 use tools correctly. The same principle applies to shaping: Sonnet likely handles most intents well, while complex multi-step requests (intent #6: "suggest delivery modes based on complexity") may require Opus-level reasoning.

The homework's cost-performance frontier ($0.003/interview for Llama 4 Scout vs $0.112 for Sonnet) suggests that even Haiku may handle simple structural edits (swap, rename) at significantly lower cost. The scripted intent suite is designed to test exactly this boundary — simple edits that any model should handle vs. ambiguous requests that test reasoning depth.

The shaping task differs from the homework's interview agent in one key way: shaping is single-turn (one intent → one command sequence), while the interview agent was multi-turn. This means the 15-field complexity ceiling found in the homework (where small models degrade on long conversations) may not apply — shaping outputs are short regardless of form complexity.
