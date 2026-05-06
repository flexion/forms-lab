# Forms Lab

**Forms shouldn't be this hard.**

Forms Lab is an experiment in making high-quality digital forms achievable for
any public sector organization. It combines practical experience from federal
forms work with LLM capabilities to collapse the cost of turning paper forms
into accessible, modern experiences.

## The problem

Public sector organizations struggle to deliver good digital form experiences —
not because they lack ambition, but because of structural barriers.
Procurement timelines stretch months. Authority-to-operate processes add
overhead. Custom development requires specialized talent that's hard to hire
and expensive to retain. The result: forms stay locked in PDF, and the public
bears the burden.

## The approach

**Configuration over code.** Forms are defined as structured JSON specs — what
data to collect, how to present it, how fields map back to source documents.
The specs are readable and editable by non-technical domain experts through a
no-code UI, and equally accessible to LLM agents that can generate and refine
them programmatically.

**LLM assistance across the lifecycle.** Rather than bolting AI onto one step,
Forms Lab introduces LLM capabilities at multiple stages — extracting fields
from source PDFs, shaping raw extractions into usable form definitions,
powering conversational form-filling, and generating accessible forms from
regulatory source material. Each LLM-powered step is a pluggable _variant_:
swappable at runtime, comparable in evaluation harnesses, improvable
independently.

**Git-native collaboration.** Every project is a git repository. Branches
represent draft edits; merging publishes. This gives teams version history,
diff-based review, and rollback — the same workflow developers already trust,
extended to form content that non-developers manage through the UI.

**Modern CSS with conformance testing.** The design system uses USWDS 3.x
design tokens exclusively, enforced by automated stylelint rules. Cascade
layers (`@layer`) provide predictable specificity. Conformance tests verify
that our modern CSS implementation looks and behaves like USWDS — maintaining
its well-tested patterns and accessibility guarantees even as the underlying
approach evolves.

**Evaluation-driven development.** LLM outputs are non-deterministic, so the
platform includes structured evaluation harnesses that score extraction and
shaping quality across fixture sets. This replaces "does it look right?" with
measurable, reproducible comparisons between strategies.

Experiment results and methodology:
[PDF extraction](catalog/experiments/pdf-field-extraction/_suite.md) ·
[Shaping](catalog/experiments/shaping-model-comparison/_suite.md) ·
[Authoring pipeline](catalog/experiments/authoring-pipeline/_suite.md)

## Try it

- **Live application** —
  [https://forms.labs.flexion.us/main/](https://forms.labs.flexion.us/main/)
- **Catalog** —
  [https://forms.labs.flexion.us/main/catalog](https://forms.labs.flexion.us/main/catalog)
  (architecture, decisions, experiments, design system)
- **Presentation** —
  [https://forms.labs.flexion.us/main/presentation](https://forms.labs.flexion.us/main/presentation)

### Local development

**Prerequisites:** [Bun](https://bun.sh/) 1.x or later.

```bash
bun install
bun run dev          # dev server at http://localhost:3000
bun test             # tests
bun run check        # lint + type check + tests (run before push)
```

See [CLAUDE.md](CLAUDE.md) for the full command reference, session workflow,
and contribution conventions.

## Project layout

```
src/
├── entrypoints/         # Hono servers and CLI
│   ├── app/             # Forms platform web app
│   ├── dashboard/       # Deployment dashboard
│   ├── webhook/         # GitHub webhook listener
│   └── cli/             # CLI commands
├── services/            # Domain services (one public entry per service)
│   ├── data-collection/ # Core model: what to collect
│   ├── forms/           # Resolution, delivery, sessions, shaping, filling
│   ├── form-documents/  # PDF extraction, field mapping, filling
│   ├── extraction/      # Extraction variant registry
│   ├── evaluation/      # Evaluation harness
│   ├── projects/        # Project service and git repo
│   └── auth/            # GitHub OAuth, sessions
├── design-system/       # flex-* components (server-rendered JSX)
└── shared/              # Pure utilities

catalog/                 # Versioned catalog (architecture, decisions, experiments)
infrastructure/          # Pulumi (EC2) + NixOS (server config)
```

Dependencies flow one way: `shared → services/design-system → entrypoints`.
See the [architecture principles](catalog/decisions/architecture/architecture-principles.md).

## Origins

This work began as a final project for Flexion's
[LLMs In Production class](https://github.com/flexion/llm-class-2026-winter-cohort)
(class outcome preserved on the
[`final-project`](https://github.com/flexion/forms-lab/tree/final-project)
branch). Development continues on `main`, building toward a scalable platform
for public sector forms.

Forms Lab builds on experience from the
[10x Form Platform](https://github.com/gsa-tts/forms)
([Flexion fork](https://github.com/flexion/forms)) — a GSA-funded initiative
exploring reusable approaches to government forms digitization.

## Tech stack

- **Runtime:** Bun
- **Framework:** Hono (server-rendered JSX, no client runtime)
- **Language:** TypeScript
- **LLMs:** Claude (Opus/Sonnet/Haiku) via Anthropic SDK and AWS Bedrock
- **Persistence:** Git-based — specs and catalog content live in the repo
- **Deployment:** Pulumi + NixOS on EC2, branch-per-deployment via GitHub webhook

## Contributing

Development follows vertical slicing: each user story delivers a complete,
demoable capability through all layers. Tests are required for new
functionality. `bun run check` must pass before push.

See [CLAUDE.md](CLAUDE.md) for commit conventions, the stacked branch workflow,
and deployment details.

## License

[Apache License 2.0](LICENSE)
