# Layout System + Editor Overhaul Design

## Context

The current layout constrains everything — nav bar, content, and sidebar — to
the same `--flex-content-max-width`. This works for reading-oriented pages but
makes the form editor feel cramped. The editor currently stacks intent form,
structure list, and preview into a two-column grid within that constrained
width, wasting the horizontal space available on wide viewports.

GitHub's model is the reference: full-width nav bar, then content width varies
by page type (centered for most pages, full-width for diffs and editors). We
adopt this model and rebuild the editor layout to use the full viewport width
with three distinct panels.

## Decisions

- **Full-width nav, variable content width.** The Banner and Header always
  span the full viewport. Content width is controlled per-page via a
  `contentWidth` prop on Layout: `"centered"` (default, current behavior) or
  `"full"` (edge-to-edge with padding).
- **Three-panel editor layout.** Structure (left, fixed), preview (center,
  centered at `--flex-content-max-width`), AI conversation (right, fixed).
- **Preview matches the real form width.** The center preview panel constrains
  its content to `--flex-content-max-width` and centers it, so Maya sees the
  form at the same width Carlos would experience.
- **Collapsible structure panel.** A toggle shrinks the structure panel to a
  narrow strip (page numbers only), giving the preview more room.
- **Closable conversation panel.** A toggle hides the AI chat panel entirely.
  Reopenable via a button in the breadcrumb bar.
- **Persistent conversation history.** The chat panel shows the full
  conversation (intents, command proposals, accept/reject), not just the
  latest exchange. Maya can scroll back.
- **Reusable conversation component.** The chat chrome (message list, input,
  close/open) is extracted as a generic `flex-assistant` component. The
  editor's coordinator renders command proposals inside assistant messages;
  other pages could render different content.

## Layout System Change

### Layout component (`flex-layout`)

Current structure:

```
<html>
  <body>
    <div class="l-page-content">  ← max-width constraint
      <Banner />
      <Header />
      {children}
      <Footer />
    </div>
  </body>
</html>
```

Proposed structure:

```
<html>
  <body>
    <Banner />                    ← full-width, outside constraint
    <Header />                    ← full-width, outside constraint
    <div class="l-page-content">  ← max-width constraint (when centered)
      {children}
    </div>
    <Footer />                    ← full-width, outside constraint
  </body>
</html>
```

When `contentWidth="full"`:

```
<div class="l-page-content--full">  ← no max-width, just horizontal padding
  {children}
</div>
```

The sidebar variant (`l-page-sidebar-start`) continues to work inside the
centered content wrapper, unchanged.

### New prop

```typescript
interface LayoutProps {
  title?: string
  sidebar?: unknown
  currentPath?: string
  user?: SessionUser
  contentWidth?: 'centered' | 'full'  // default: 'centered'
}
```

### CSS changes

```css
/* Nav elements are now outside the content wrapper */
.flex-banner,
.flex-header,
.flex-footer {
  /* Already full-width block elements; just need to not be
     inside a max-width container anymore */
}

/* Centered content (default, backward-compatible) */
.l-page-content {
  max-inline-size: var(--flex-content-max-width);
  margin-inline: auto;
  padding-inline: var(--flex-space-3);
  padding-block: var(--flex-space-3);
}

/* Full-width content */
.l-page-content--full {
  padding-inline: var(--flex-space-3);
  padding-block: var(--flex-space-3);
}
```

Existing pages pass no `contentWidth` prop and get the current behavior.

## Editor Three-Panel Layout

### Structure

```
<div class="editor-layout">
  <aside class="editor-structure">    ← left, ~240px fixed
    Page list
  </aside>
  <main class="editor-preview">      ← center, flexible
    <div class="editor-preview__inner"> ← max-width centered
      FormPageView
    </div>
  </main>
  <aside class="editor-chat">        ← right, ~320px fixed
    flex-assistant
  </aside>
</div>
```

### Structure panel (left)

- Fixed width ~240px
- Compact page list: selected page highlighted with a left-border accent
- Each page shows: number, title, group count, delivery mode badge
- Click a page to select it (updates preview)
- Collapsible: a toggle button at the top shrinks the panel to ~48px showing
  just page numbers. Click a number to select + expand.
- Manual controls (up/down reorder, delivery mode select) appear on the
  selected page card

### Preview panel (center)

- Takes all remaining width between structure and chat
- Content is constrained to `--flex-content-max-width` and centered within
  the available space
- Renders `FormPageView` with actual design system form components
- Shows the currently selected page
- Form submission is disabled (preview-only)
- Updates when state changes (page selection, command accept, manual edit)

### Conversation panel (right)

- Fixed width ~320px
- Chat-style layout: scrollable message history, input pinned at bottom
- Message types:
  - **User messages:** Maya's intents, displayed as chat bubbles
  - **Assistant messages:** Command proposals, rendered by the editor
    coordinator as humanized command lists with accept/reject/refine controls
  - **System messages:** Errors, confirmations ("Changes applied")
- Closable: toggle hides the panel, preview gets the freed space
- Reopenable via a button in the breadcrumb bar

### Responsive behavior

At narrow viewports (< 64em), the three-panel layout stacks vertically:
structure on top (collapsed by default), then preview, then chat at the
bottom.

## Reusable Conversation Component

### `flex-assistant`

A generic custom element that renders conversation chrome.

**Responsibilities:**
- Scrollable message list
- Input area pinned to bottom (textarea + send button)
- Close/open toggle
- Dispatches `assistant:message-submitted` event with `{ text }` on send
- Accepts messages via a `addMessage(role, content)` method called by the
  page coordinator

**Not responsible for:**
- Knowing what commands are
- Rendering accept/reject buttons
- Making network requests

The page coordinator (flex-form-editor for the editor page) listens for
`assistant:message-submitted`, calls the server, and then calls
`chat.addMessage('assistant', renderedHtml)` to display the response. The
coordinator controls what goes inside assistant messages — for the editor,
that's humanized command lists with action buttons.

This means another page (e.g., conversational form delivery) could reuse
`flex-assistant` and render completely different assistant message content.

### Message rendering

Messages are rendered as HTML strings passed to `addMessage`. The chat
component inserts them into the scrollable list. The component does not
parse or interpret message content — it is a pure rendering shell.

User messages get a simple text bubble. Assistant messages get whatever HTML
the coordinator provides. This keeps the component generic.

## Scope

### Part 1: Layout system (small)

- Modify `flex-layout/index.tsx` to accept `contentWidth` prop
- Move Banner, Header, Footer outside the content wrapper
- Add `l-page-content--full` CSS class
- Verify existing pages render identically (no visual regression)

### Part 2: Editor layout (medium)

- Rewrite `EditorPage` shell with three-panel grid
- Rewrite `flex-form-editor` coordinator to manage panel state
  (collapsed/expanded structure, open/closed chat)
- Extract `flex-assistant` from current `flex-command-proposal`
- Create `flex-editor-structure` (replaces current `flex-form-structure`
  with collapsible behavior)
- Update preview panel to center content at `--flex-content-max-width`
- CSS for the three-panel layout with responsive stacking

### What stays the same

- All routes, server-side logic, executor, commands, ProjectService
- The event protocol between coordinator and children
- The preview rendering (FormPageView)
