---
title: "Live Demo"
order: 8
rubric: [demo-presentation]
timing: "2 min"
audience: [evaluator, general]
---

# See It In Action

Forms Lab is a working application. Here are the key paths to explore:

## Upload and Extract

1. [Sign in](/auth/signin) with GitHub
2. Navigate to [Projects](/projects)
3. Upload a PDF form
4. Watch the LLM extract a structured DataCollectionSpec
5. Review the extracted fields, types, groups, and conditions

## Shape a Form

From a project overview page, click **Edit**. Two paths into the same staged buffer:

**Direct manipulation:**

1. Click a field label in the preview to rename it
2. Click the "required" chip to toggle
3. Use the page tabs to switch between pages; use the arrow buttons to reorder
4. Pick a delivery mode from the dropdown on a page
5. Each click stages a command in the buffer; the breadcrumb shows **Save (N)**

**LLM assistance:**

1. Type an intent into the assistant panel: *"Combine pages 2 and 3"* or *"Split personal information by dependent status"*
2. See a batch of commands proposed as plain-English lines
3. Accept, reject, or refine ("…but keep the employment page separate")
4. Accept stages the batch into the same shared buffer

**Commit:**

1. Click **Save** — one git commit writes the whole buffer; `parentSha` guard catches stale parents
2. Toggle **Preview as applicant** to validate the result in the applicant-facing view
3. Click **Discard** at any point to drop the pending buffer

## Fill a Form

1. Visit the [Forms](/forms) index
2. Select an available form
3. Walk through the multi-page form experience
4. See conditional fields appear based on your answers
5. Review your submission on the summary page

## Explore the Catalog

The [Catalog](/catalog) is the project's self-documenting system:

- [Personas](/catalog/personas) — Who the system serves
- [Architecture](/catalog/architecture) — How it's built
- [Decisions](/catalog/decisions) — Why we made each choice
- [Experiments](/catalog/experiments) — What we tested and learned
- [Design System](/catalog/design-system) — Visual language and components

## Deployment Dashboard

The [Homepage](/) shows all active deployments with health status, branch names, and commit hashes.
