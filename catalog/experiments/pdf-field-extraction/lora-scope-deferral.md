---
kind: pdf-field-extraction
implementation: lora-v1
status: scope-deferred
course-topics: [fine-tuning, lora, model-training]
---

# PDF Field Extraction: LoRA Fine-Tune (Scope Deferred)

## Why Deferred

Story #65 proposed fine-tuning a small model (Llama 3.2 1B or Mistral 3B) on extraction examples to produce a domain-specialist extractor. This was deferred for the April 20 presentation because:

1. **ROI is low for this task.** Assignment 10 showed that prompt engineering alone achieves 99-100% on simple specs with Mistral 8B. The remaining gap (15+ field ceiling) is a context-window limitation that LoRA on a 1-3B model cannot fix. Additionally, the Nova Pro evaluation demonstrated that even capable multimodal models fail at field-level PDF extraction — this is a capability boundary, not a knowledge boundary that fine-tuning addresses.

2. **Infrastructure cost.** Requires GPU training time ($2-10 depending on epochs), SageMaker or local inference endpoint, and a synthetic training dataset generated from our 3 fixtures.

3. **The homework already demonstrated the technique.** Assignments 4-5 fine-tuned Llama 3.2 1B on financial sentiment (Assignment 4) and multi-task reasoning (Assignment 5) using Unsloth + trl. The technique is proven; applying it here adds execution cost without new learning.

4. **PDF multimodal constraint.** LoRA fine-tuning of a text-only model (Llama, Mistral) would require a separate OCR/text-extraction pre-processing step since these models can't read PDFs directly. This adds pipeline complexity for uncertain benefit.

## What We'd Build (If Revisited)

1. **Training data:** Use Opus extractions of the 3 fixtures + 5-10 synthetic PDFs as teacher labels. Format as instruction-tuning pairs: (PDF text content → DataCollectionSpec JSON).
2. **Pre-processing:** pdf-to-text extraction layer (pdf-lib text extraction or Tesseract OCR for scanned forms).
3. **Model:** Llama 3.2 1B via Unsloth (4-bit QLoRA, rank 16, alpha 32).
4. **Training:** 3 epochs on ~50 examples, ~10 minutes on A10G.
5. **Inference:** SageMaker endpoint or llama-cpp-python local server.
6. **Expected result:** Strong on forms similar to training distribution; brittle on novel form structures. Likely worse than prompt-engineered Sonnet for general extraction given the multimodal capability gap.

## Course Connection

- **Assignment 4:** Financial sentiment fine-tuning pipeline (Unsloth + trl, Llama 3.2 1B) — demonstrated end-to-end LoRA training and inference
- **Assignment 5:** Multi-task reasoning fine-tuning (GSM8K, CommonsenseQA, TriviaQA, HellaSwag) — demonstrated training on diverse datasets
- **Assignment 6:** Synthetic data strategy (knowledge distillation from larger model) — the approach we'd use to generate extraction training data from Opus
- **Assignment 10:** Cost-performance frontier showed that for tasks within model capability, prompt engineering matches or beats fine-tuning at zero marginal cost

The key takeaway: LoRA is most valuable when you need consistent behavior on a narrow, well-defined task where prompting alone is insufficient. For extraction, Claude-class prompting IS sufficient (62-72% recall), and the gap is in document understanding capability that LoRA on a text-only model cannot bridge.
