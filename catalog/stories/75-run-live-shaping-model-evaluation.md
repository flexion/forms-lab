---
issue: 75
title: Run live shaping model evaluation
milestone: ""
labels: [user-story, llm-integration]
state: closed
synced_at: 2026-04-20T15:40:03.186Z
---

## User Story

As **Maya**, in order to **see quantitative benchmarks for the shaping model variants**, I want **a CLI runner that evaluates all three shaping models against the scripted intent suite**.

## Context

Story #59 shipped the `shaping-commands` evaluation kind and 6 scripted intents with expected outputs. The scoring logic is tested. What's missing is a CLI command to actually call each model with the intents and record results.

## Acceptance Criteria

- [ ] CLI command: `bun run cli evaluate shaping run <variant-id>`
- [ ] Runs all 6 scripted intents against the selected shaping variant
- [ ] Writes results to `catalog/experiments/shaping-model-comparison/{variant}.json`
- [ ] Generates markdown catalog page with metrics
- [ ] All three variants evaluated: bedrock-haiku, bedrock-sonnet, bedrock-opus
- [ ] Catalog pages updated with real metrics

## Definition of Done

- [ ] Tests pass
- [ ] All three variants evaluated
- [ ] Catalog pages populated