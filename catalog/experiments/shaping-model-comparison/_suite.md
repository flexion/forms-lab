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
