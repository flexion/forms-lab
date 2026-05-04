# Forms Lab

LLM-assisted forms platform for government forms. Upload a PDF, extract a
structured spec, deliver a form experience (static or conversational), and
generate a filled PDF back out.

The core idea: **separate _what to collect_ from _how to present it_.** A
`DataCollectionSpec` describes the fields and their semantics; a `FormSpec`
describes how they are presented. Swap the presentation (static page,
conversational chat, review layout) without touching the extraction pipeline,
and swap the extraction strategy without touching delivery. Every LLM-powered
step is a pluggable _variant_ that can be selected per user at runtime.

## Live demo

- **Dashboard** — [https://forms.labs.flexion.us/](https://forms.labs.flexion.us/) (deployment overview, branch list)
- **Application** — [https://forms.labs.flexion.us/main/](https://forms.labs.flexion.us/main/) (main branch)
- **Catalog** — [https://forms.labs.flexion.us/main/catalog](https://forms.labs.flexion.us/main/catalog)
  (architecture, decisions, experiments, personas, stories, design system)
- **Slide deck** — [https://forms.labs.flexion.us/main/presentation](https://forms.labs.flexion.us/main/presentation)

Each active branch is deployed at `/<branch>/` alongside main.

## Key findings

Full write-ups live in the catalog. Headlines:

1. **Hybrid-v1 Pareto-dominates prompt-only extraction.**
   [`sonnet-hybrid-v1`](catalog/experiments/pdf-field-extraction/sonnet-hybrid-v1.md)
   (one short instruction, one inline exemplar, temperature=0) wins four of
   five metrics outright — precision 99.2%, recall 72.6%, sensitivity 51.1% —
   and ties on type accuracy, at the same cost as baseline Sonnet. It is now
   the production default. The prompt shape that topped the Assignment 10
   tool-calling leaderboard on Mistral 8B reproduces on Claude Sonnet 4 for a
   completely different task.

2. **Tool-use is the structural precision/sensitivity lever.**
   [`tool-use-sonnet`](catalog/experiments/pdf-field-extraction/tool-use-sonnet.md)
   forces typed tool calls instead of free JSON: sensitivity accuracy jumps
   27% → 79% (+51pp) and precision reaches 96.3%. Recall is step-limited at
   20 rounds, so it shines on short-to-moderate forms.

3. **Nova Pro marks the non-Claude capability boundary for extraction.**
   [`nova-pro`](catalog/experiments/pdf-field-extraction/nova-pro.md) scored
   97% on the homework's 10-field tool-calling task but extracts at 0.6%
   recall here — it summarizes sections instead of enumerating fields. Prompt
   engineering does not recover this. Model selection dominates prompt
   engineering once the task is outside the model's capability range.

4. **Model size is not the dominant lever for shaping.**
   [Shaping model comparison](catalog/experiments/shaping-model-comparison/_suite.md):
   Opus/Sonnet/Haiku all cluster around 67-73% command-kind precision.
   Three intents are at ceiling across all three models; two fail across all
   three. Prompt disambiguation (e.g. `renamePage` vs `renameGroup`) is the
   bottleneck, not parameter count.

Suite indexes:
[PDF extraction](catalog/experiments/pdf-field-extraction/_suite.md) ·
[Shaping](catalog/experiments/shaping-model-comparison/_suite.md) ·
[Authoring pipeline](catalog/experiments/authoring-pipeline/_suite.md) ·
[Roadmap](catalog/experiments/_roadmap.md)

## Quick start

**Prerequisites:** [Bun](https://bun.sh/) 1.x or later.

```bash
bun install
bun run dev                # dev server at http://localhost:3000
bun test                   # tests
bun run check              # lint + type check + tests (run before push)
```

See [CLAUDE.md](CLAUDE.md) for the full command reference, session workflow,
deployment architecture, and contribution conventions.

## Project layout

```
src/
├── entrypoints/           # Hono servers and CLI
│   ├── app/               # Forms platform web app (routes, middleware, public)
│   ├── dashboard/         # Deployment dashboard (homepage service)
│   ├── webhook/           # GitHub webhook listener
│   ├── notify/            # Notification delivery
│   └── cli/               # CLI commands
├── services/              # Domain services (one public entry per service)
│   ├── data-collection/   # Core model: what to collect
│   ├── forms/             # Resolution, delivery, sessions, shaping, filling
│   ├── form-documents/    # PDF extraction, field mapping, filling
│   ├── extraction/        # Extraction variant registry
│   ├── evaluation/        # Evaluation harness and LLM-as-judge kinds
│   ├── projects/          # Project service and form-project git repo
│   ├── auth/              # GitHub OAuth, sessions
│   ├── deployment/        # Deploy orchestration
│   └── ...
├── design-system/         # flex-* components (server-rendered JSX)
└── shared/                # Pure utilities

catalog/                   # Versioned catalog content (markdown/JSON)
├── personas/              # Who the system serves
├── stories/               # GitHub Issue copies (user stories)
├── architecture/          # System docs
├── decisions/             # ADRs
└── experiments/           # LLM experiment suites + runs

projects/                  # Form project directories (specs, assets)
infrastructure/            # Pulumi (EC2) + NixOS (server config)
test/                      # Bun test suite
```

Dependencies flow one way: `shared → services/design-system → entrypoints`.
Each service exposes its public API through `src/services/<name>/index.ts`
and is enforced by `test/architecture/dependency-rule.test.ts`. See the
[architecture principles](catalog/decisions/architecture/architecture-principles.md).

## Tech stack

- **Runtime:** Bun
- **Framework:** Hono (server-rendered JSX, no client runtime)
- **Language:** TypeScript
- **Testing:** Bun test
- **Linting:** Biome + Stylelint (design-token enforcement)
- **Persistence:** Git-based — specs and catalog content live in the repo
- **LLMs:** Claude (Opus/Sonnet/Haiku) via Anthropic SDK and AWS Bedrock;
  Amazon Nova Pro for cross-provider comparison
- **Deployment:** Pulumi + NixOS on EC2, branch-per-deployment via GitHub
  webhook

## Workflow

Session commands (installed in `.claude/commands/`):

```bash
/create-story                # New user story (GitHub issue + notes dir)
/start-story <description>   # Initialize a session (worktree, context)
/finish-story                # Run checks, code review, open PR
/review-story <PR>           # Review another session's PR
```

Infrastructure changes branch from main as `infra/YYYY-MM-DD-description`;
feature work branches as `story-N/name` or `docs/<description>`. See
[CLAUDE.md](CLAUDE.md) for commit conventions, the stacked branch workflow,
and deployment details.

## Contributing

Class project for [LLM Class 2026 Winter Cohort](https://github.com/flexion/llm-class-2026-winter-cohort).
Development follows vertical slicing: each user story delivers a complete,
demoable capability through all layers. Tests are required for new
functionality; `bun run check` must pass before push.

## License

[Apache License 2.0](LICENSE)
