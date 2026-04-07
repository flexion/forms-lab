# Forms Lab

LLM-Assisted Forms Platform for government forms. Upload a PDF, extract structured specs, deliver form experiences (static or conversational), and generate completed PDFs.

## Quick Start

**Prerequisites:**
- [Bun](https://bun.sh/) 1.x or later

**Install dependencies:**
```bash
bun install
```

**Run development server:**
```bash
bun run dev
```

Server starts at http://localhost:3000

**Run tests:**
```bash
bun test
```

**Run type checking:**
```bash
bun run --no-warnings tsc --noEmit
```

## Project Structure

```
/
├── src/
│   ├── routes/          # Hono routes (catalog, forms, auth, compare)
│   ├── services/        # LLM services, git adapter, auth
│   ├── components/      # JSX components (server-rendered + islands)
│   ├── types/           # TypeScript types
│   ├── lib/             # Utilities
│   └── server.ts        # Hono app entry point
│
├── catalog/             # Catalog content (versioned with code)
│   ├── personas/        # Persona markdown files
│   ├── stories/         # User stories (synced from GitHub Issues)
│   ├── architecture/    # Architecture docs
│   ├── experiments/     # LLM experiments
│   └── decisions/       # ADRs
│
├── projects/            # Form projects (specs, assets)
├── test/                # Tests (Bun test suite)
├── infrastructure/      # Deployment scripts
└── .github/workflows/   # CI/CD
```

## Tech Stack

- **Runtime:** Bun
- **Framework:** Hono
- **Language:** TypeScript
- **Testing:** Bun test
- **Linting:** Biome
- **CI/CD:** GitHub Actions

## Architecture

- **Data Model:** DataCollectionSpec (what to collect), FormSpec (how to present), Submission (collected data)
- **Persistence:** Git-based (specs and assets in `projects/`)
- **Catalog:** Self-documenting system (personas, stories, architecture, experiments)
- **LLM Integration:** Strategy pattern with feature flags for experimentation

## Development Workflow

1. Pick a user story from [GitHub Issues](../../issues) (labeled `user-story`)
2. Create branch: `story/<issue-number>-<slug>` or `experiment/<name>`
3. Implement with TDD
4. Run tests and type checking
5. Commit frequently with descriptive messages
6. Open PR and review on deployed branch
7. Merge when approved
8. Run `bun run sync:stories` to update local story copies

## Deployment

Branch-per-deployment model: every branch gets its own deployment URL.

**Infrastructure:** Server-per-branch (container or EC2), Bun + Hono, reverse proxy routes `<branch>.domain.com` to appropriate process.

**CI/CD:** GitHub Actions runs tests on every push. Deployment triggered on push to branch.

See `infrastructure/` directory for deployment scripts and configuration.

## Contributing

This is a class project for LLM Class 2026 Winter Cohort. Development follows the vertical slicing approach: each user story delivers a complete, demoable capability.

## License

MIT
