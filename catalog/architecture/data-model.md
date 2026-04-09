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

## Type Definitions

All types are defined in `src/types/models.ts`.

## Sources

- [Design spec: Data Model](https://github.com/flexion/llm-class-2026-winter-cohort/blob/main/notes/final-project/2026-04-07-design.md)
