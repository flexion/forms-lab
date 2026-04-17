---
status: stable
tags: [architecture, design-system, client-side, shaping]
decided: 2026-04-16
---

# Coordinator custom elements for interactive UI

The form editor's client-side behavior is composed of native custom elements. A root `flex-form-editor` coordinator owns ephemeral state and mediates between children via typed `CustomEvent`s. No client framework (React/Vue/Svelte/etc.) is introduced.

## Context

The form editor is the most interactive surface in Forms Lab: three panels (structure, preview, assistant), two-way synchronization between them (click a page in structure → scroll preview, type an intent → stream proposed commands), and a chat transcript that accumulates across accept/reject/refine cycles. All prior interactive UI in the project (catalog browsing, form filling) was either stateless or driven by page navigation, so the question had never been forced.

A conventional approach would adopt React or Vue for the editor. That would conflict with three project properties:

- **P2 dependency rule.** `design-system/` depends only on `shared/`. Introducing a framework means either threading its runtime through `design-system/` or carving out an exception for this one surface.
- **P4 presentation is stateless.** Design-system components receive props; they don't own state. The editor genuinely *does* own state (open panels, pending commands, chat history) — but that state is ephemeral UI state, not domain state.
- **Server-rendered posture.** Pages are Hono JSX; no client runtime exists. Adding one means a bundler pipeline, hydration story, and SSR compatibility concerns for one feature.

## Decision

**Custom elements are the unit of client interactivity.** Each interactive piece is a `HTMLElement` subclass registered via `customElements.define`. `src/design-system/components/flex-form-editor/client.ts` is the coordinator; sibling directories (`flex-assistant/`, `flex-form-structure/`) define the child elements.

**One coordinator owns editor-scoped state.** Ephemeral state (current spec, pending command batch, chat transcript, panel open/closed) lives on the `flex-form-editor` root element. Children read from the coordinator via DOM traversal; they mutate by dispatching events.

**Events are typed.** `src/design-system/components/flex-form-editor/protocol.ts` defines the event names and payload shapes. Every `CustomEvent` dispatched inside the editor conforms to that protocol. The coordinator's event listeners are the single place where "what should happen when the user does X" is decided.

**Children do not talk to each other directly.** Every cross-panel interaction (structure click → preview update; assistant accept → spec mutation → structure refresh) flows through the coordinator. This keeps the communication graph a star, not a mesh.

**No framework.** No React, Vue, Svelte, Alpine, HTMX, or similar is introduced. The server renders initial markup; custom elements attach behavior; the spec is passed as a JSON bootstrap in a `<script type="application/json">` element (escaped against `</script>` break-out; see the threat model).

## Consequences

- Each child element is independently unit-testable — instantiate the element, assert its rendered DOM, dispatch events against it.
- The event protocol is a typed contract. Adding an interaction is "extend the protocol type, add the listener in the coordinator, dispatch from the child".
- The design system stays framework-free. Any future editor-style surface can reuse the same pattern without pulling in a runtime.
- Trade-offs: no component-tree time-travel debugging; client logic is spread across per-element files rather than a single component tree; there is no reconciler for keyed list updates (the editor avoids this by re-rendering containers wholesale on spec changes, which is fast enough at current list sizes).

## Sources

- Design notes: [`notes/2026-04-16-layout-overhaul-design.md`](../../../notes/2026-04-16-layout-overhaul-design.md), [`notes/2026-04-16-direct-edit-ui-design.md`](../../../notes/2026-04-16-direct-edit-ui-design.md) (in-repo)
- Code: `src/design-system/components/flex-form-editor/client.ts`, `protocol.ts`; `flex-assistant/`, `flex-form-structure/`, `flex-editable-page/`, `flex-editable-group/`, `flex-editable-field/`, `flex-staged-changes/`
- Related: [Command-based form shaping](command-based-shaping.md)
