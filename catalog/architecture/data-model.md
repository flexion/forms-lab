---
status: working
tags: [architecture, data-model]
---

# Data Model

The data model separates **what to collect** from **how to present it** from **what was collected**.

## DataCollectionSpec

The business domain model. Describes data requirements independent of any UI or delivery mechanism.

- **RequirementGroups** organize related fields (e.g., "Personal Information", "Employment History")
- **DataRequirements** define individual fields: type, validation, conditions, sensitivity level
- **Field types:** text, email, phone, url, number, currency, date, boolean, choice, longText
- **Conditions** make fields appear/hide based on other field values
- **Sensitivity levels** (low, medium, high, pii) inform how data is handled and displayed

A DataCollectionSpec is portable — the same spec can drive a static web form, a conversational agent, or a PDF mapping.

## FormSpec

The UX/delivery layer. Describes how to present a DataCollectionSpec as a form experience.

- **Pages** group requirement groups into a multi-step flow
- **Delivery modes** per page: static (traditional form), conversational (chat agent), hybrid (mix)
- References the DataCollectionSpec by ID — one spec can have multiple FormSpecs for different experiences

Maya shapes the FormSpec through the authoring UI. The LLM suggests delivery modes based on section complexity.

## Submission

Immutable collected data. Links to the exact DataCollectionSpec version (git SHA) used at collection time, ensuring data interpretation is unambiguous even if the spec evolves.

- **Status:** draft → submitted → processed
- **Data:** key-value pairs where keys are DataRequirement field names

## FormProject

A directory in git containing a DataCollectionSpec, one or more FormSpecs, and associated assets (source PDF, policy docs). The unit of collaboration.

Located in `projects/<project-slug>/`:
- `spec.json` — DataCollectionSpec
- `form.json` — Default FormSpec
- `source.pdf` — Original uploaded PDF
- Additional FormSpecs and assets as needed

## Shaping Commands

Edits to a `DataCollectionSpec` or `FormSpec` are expressed as a sequence of **commands** — a discriminated union of domain operations. Commands are the canonical representation of "what changed", produced both by LLM-assisted editing (tool-use mode) and by manual editor actions.

- **Page operations** — reorder, swap, move, add, remove, rename, split, merge, set delivery mode
- **Group operations** — move, rename, add, remove, split, merge
- **Field operations** — move, reorder, relabel, set required, set help text, set control, set condition, add, remove

A batch of commands executes atomically: validation happens per-command, and any failure rolls the whole batch back. Each accepted batch produces one git commit plus an entry in `forms/<slug>/shaping-log.json` capturing the originating intent, the command sequence, and the resulting commit SHA.

See the [command-based shaping decision](../decisions/architecture/command-based-shaping.md) for rationale.

## Type Definitions

Each service owns its domain types (architecture principle P3):

- `DataCollectionSpec`, `DataRequirement`, and field/validation types → [`src/services/data-collection/types.ts`](https://github.com/flexion/forms-lab/tree/main/src/services/data-collection/types.ts)
- `FormSpec`, `FormPage`, `ResolvedForm`, `FormSession` → [`src/services/forms/types.ts`](https://github.com/flexion/forms-lab/tree/main/src/services/forms/types.ts)
- Shaping commands (discriminated union + Zod schemas) → [`src/services/forms/shaping/commands.ts`](https://github.com/flexion/forms-lab/tree/main/src/services/forms/shaping/commands.ts)
- Form-document extraction types → [`src/services/form-documents/types.ts`](https://github.com/flexion/forms-lab/tree/main/src/services/form-documents/types.ts)

## Sources

- [Design spec: Data Model](https://github.com/flexion/llm-class-2026-winter-cohort/blob/main/notes/final-project/2026-04-07-design.md)
- [Command-based form shaping](../decisions/architecture/command-based-shaping.md)
