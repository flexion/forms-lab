---
kind: pdf-field-extraction
implementation: nova-pro
status: working
course-topics: [evaluation, model-selection, cost-optimization]
---

# PDF Field Extraction: Amazon Nova Pro

> Selectable in **Settings → Variants → Extraction**.

## Approach

Uses the same free-JSON extraction prompt as baseline Sonnet, but with Amazon's Nova Pro multimodal model via AWS Bedrock. Nova Pro supports native PDF input (unlike Mistral/Llama which require text pre-processing) and costs roughly 1/4 the price of Sonnet.

## Cost Comparison

| Model | Input $/1K | Output $/1K | Relative Cost | PDF Support |
|---|---|---|---|---|
| **Nova Pro** | $0.0008 | $0.0032 | **1x** | Native |
| Haiku 4.5 | $0.0008 | $0.004 | ~1.2x | Native |
| Sonnet 4 | $0.003 | $0.015 | ~4x | Native |
| Opus 4.6 | $0.015 | $0.075 | ~20x | Native |
| Mistral 8B | $0.0003 | $0.0003 | ~0.4x | No (text only) |

Nova Pro is price-competitive with Haiku on input tokens and cheaper on output. The question is whether it can match Haiku's extraction quality on government forms.

## Why Nova Pro (not Mistral)

The homework tested Mistral 8B extensively and it performed well on text-based tool-calling tasks. However, our extraction pipeline sends PDFs directly to the model as multimodal input. Mistral doesn't support document input on Bedrock — only Claude and Amazon Nova models do. Nova Pro is the cheapest non-Claude model that can process our pipeline without architectural changes.

## Course Connection

Assignment 10 tested Amazon Nova Pro on the interview agent task:
- **97% baseline** on the housing benefits spec (10 fields) with no prompt tuning
- **100% with hybrid-v2** prompt — the same short-instruction strategy that worked across architectures
- Cost: $0.010/interview — same as DeepSeek V3.2, cheaper than Haiku ($0.012)

Nova Pro was one of only 3 non-Claude models to achieve 100% on tool-calling tasks (alongside Llama 4 Scout and DeepSeek V3.2), suggesting strong instruction-following capability.

The 15-field ceiling documented in the homework applies to all non-Claude models: they plateau at 82-92% on specs with 15+ fields. Our pardon application fixture (140+ fields) will likely expose this limitation.

## Expected Behavior

| Fixture | Fields | Expected Performance |
|---|---|---|
| W-9 | ~8 | Strong (within simple-spec range) |
| I-9 | ~30 | Moderate (above 15-field ceiling) |
| Pardon Application | ~140 | Weak (well above ceiling) |

## Metrics

_Pending evaluation run._

## Findings

_To be populated after evaluation._
