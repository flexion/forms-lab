# Story 87 Session Log

## 2026-04-19/20 — Implementation + UI iteration

### Completed
- Full service layer: types, criteria, prompts, pipeline, evaluator, stage detection
- SNAP corpus (13 sections), fixture (85 fields), demo PDF
- Route handlers with commitFile, corpus-only project creation
- Pipeline panel: tabbed sidebar (Pipeline|Assistant), references in left sidebar
- Reference click → full text in center area
- Single "Build Form" button with progress log
- Fixes: Bedrock schema wrapping, Bun idleTimeout, owner param, criteria body parsing, caching

### Open question from user (end of session)
User wants criteria to be:
1. Persisted as part of the form definition (visible in UI after approval)
2. Viewable alongside the form at any time
3. Editable later (add new criteria, modify existing ones)

This implies criteria should be a first-class UI concept — not just a pipeline artifact hidden in criteria.json. 
Possible approaches:
- Show criteria in the left sidebar alongside references (always visible)
- Make criteria editable inline (add/remove/edit)
- Criteria become part of the project's visible state, not just the pipeline's internal state
