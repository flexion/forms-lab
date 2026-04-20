---
kind: pdf-field-extraction
implementation: llama-3-2-vision
status: current
course-topics: [evaluation, model-selection, cost-optimization, capability-boundaries]
---

# PDF Field Extraction: Meta Llama 3.2 90B Vision

> Selectable in **Settings → Variants → Extraction**.

## Approach

Routes the same free-JSON extraction prompt used by the baseline Sonnet variant through Meta's Llama 3.2 90B Instruct (Vision) on Bedrock. The Bedrock AI SDK adapter handles multimodal input the same way it does for Nova Pro and Nova Lite — the variant differs only in model id and output-token cap.

This was registered to give the extraction-variant list at least one **non-Anthropic, non-Amazon** multimodal option, so the "capability boundary" finding in the presentation isn't just about Amazon's Nova family.

## Result: Access Denied

On 2026-04-20, smoke-eval against the W-9 fixture returned:

```
ResourceNotFoundException: Access denied. This Model is marked by provider as
Legacy and you have not been actively using the model in the last 30 days.
Please upgrade to an active model on Amazon Bedrock.
```

Bedrock reports the model as **Legacy** and gates runtime access on recent usage. The FlexionLLM account used for this experiment had no recent Llama 3.2 90B Vision invocations, so the runtime refuses new requests. The only remediation paths are:

1. Open a Bedrock support ticket to re-enable the legacy model (not worth doing for a one-day breadth experiment).
2. Switch to a newer Meta Bedrock model (e.g., Llama 4 Scout — text-only, so it would need a different extraction path since the fallback image-rendering pipeline isn't wired up here).
3. Self-host Llama 3.2 Vision on a GPU instance (explicitly out-of-scope per the experiment brief — no self-hosted models today).

## What We Learn Anyway

Even a failed run is a legitimate data point:

- **Bedrock access is not free breadth.** "Listed in the model catalog" does not mean "invokable from my account". Legacy-model gating is a real operational constraint on multi-vendor LLM infrastructure, not just a capability question.
- **The variant registration still has value.** The extractor registry entry, the model id in `models.ts`, and the `capability-boundaries` course topic all document that Llama 3.2 Vision **was** the intended third non-Anthropic probe. Future work (or a re-enabled account) can run the smoke eval by flipping one flag and running `bun run scripts/eval-variant-w9.ts llama-3-2-vision`.
- **Consistent with the Nova Pro finding.** Nova Pro scored 0.6% field recall across the full suite — documenting that number required a working invocation path. Llama 3.2 Vision would have been a fourth point on that curve; instead, it's a caveat.

## Cost Comparison (published Bedrock pricing)

| Model | Input $/1K | Output $/1K | Status |
|---|---|---|---|
| Nova Lite | $0.00006 | $0.00024 | Active — 56% W-9 recall (smoke) |
| Nova Pro | $0.0008 | $0.0032 | Active — 0.6% suite recall |
| **Llama 3.2 90B Vision** | **$0.002** | **$0.002** | **Legacy — access denied** |
| Sonnet 4 | $0.003 | $0.015 | Active — 62% suite recall |

Pricing listed for reference; no Bedrock invocations were billed to the FlexionLLM account for this variant since every call was rejected before compute started.

## Course Connection

Maps to the same **Chapter 6: model selection** thread as Nova Pro and Nova Lite. The interesting twist is the infrastructure angle: choosing a non-Anthropic model isn't only a capability bet, it's an access-lifecycle bet. Bedrock's "legacy after 30 days of no use" policy quietly narrows the model shelf even when the catalog lists dozens of options.

For the presentation, this variant sits on slide 6 / slide 7 footer as part of the "Capability boundary: non-Anthropic small multimodal models fail at field-level PDF extraction" line — with an honest footnote that Llama 3.2 Vision was gated out before it could fail or succeed.

## Limitations

- No extraction was ever performed — every invocation returned `ResourceNotFoundException`.
- Pricing column is from published Bedrock rates, not observed cost.
- Variant is kept registered so a future run (after Bedrock access is restored) produces comparable numbers.
