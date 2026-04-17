# Layout System + Editor Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the nav bar full-width on all pages, add a `contentWidth` prop to Layout for full-width pages, and rebuild the form editor as a three-panel layout with collapsible structure, centered preview, and a closable AI assistant sidebar.

**Architecture:** The Layout component is refactored to render Banner/Header/Footer outside the content constraint. A new `contentWidth="full"` mode skips the max-width wrapper. The editor shell uses CSS grid with three columns: fixed structure panel, flexible centered preview, and fixed assistant panel. The existing `flex-command-proposal` is replaced by `flex-assistant` (reusable chat chrome). The `flex-form-structure` gains collapsible behavior. The `flex-form-editor` coordinator manages panel open/closed state.

**Tech Stack:** Hono JSX (server), custom elements (client), CSS grid, existing design token system.

---

## File Structure

### New files

```
src/design-system/components/flex-assistant/
  client.ts              — Reusable chat chrome: message list, input, close toggle
  styles.css             — Chat layout: scrollable messages, pinned input

src/entrypoints/app/routes/owner/edit/
  editor-layout.css      — Three-panel grid layout for the editor page
```

### Modified files

```
src/design-system/components/flex-layout/index.tsx    — Add contentWidth prop, restructure HTML
src/design-system/components/flex-layout/styles.css   — Adjust footer for full-width nav model
src/entrypoints/app/public/page-layouts.css           — Add l-page-content--full class
src/entrypoints/app/routes/owner/edit/index.tsx       — Pass contentWidth="full" to Layout
src/entrypoints/app/routes/owner/edit/components.tsx  — Rewrite EditorPage with three-panel shell
src/design-system/components/flex-form-editor/client.ts — Manage panel state, wire assistant events
src/design-system/components/flex-form-editor/protocol.ts — Add assistant events
src/design-system/components/flex-form-editor/styles.css — Replace with three-panel grid
src/design-system/components/flex-form-structure/client.ts — Add collapsible behavior
src/design-system/components/flex-form-structure/styles.css — Collapsible styles
src/design-system/register.ts                         — Register flex-assistant, remove flex-command-proposal
src/entrypoints/app/public/styles.css                 — Swap CSS imports
```

### Deleted files

```
src/design-system/components/flex-command-proposal/    — Replaced by flex-assistant
```

---

## Task 1: Layout system — add contentWidth prop and restructure HTML

Refactor the Layout component so Banner, Header, and Footer render outside the content constraint. Add a `contentWidth` prop that controls whether children get `l-page-content` (centered, default) or `l-page-content--full` (full-width).

**Files:**
- Modify: `src/design-system/components/flex-layout/index.tsx`
- Modify: `src/entrypoints/app/public/page-layouts.css`

- [ ] **Step 1: Add l-page-content--full CSS class**

In `src/entrypoints/app/public/page-layouts.css`, add after the `.l-page-content` block (after line 65):

```css
/* Full-width content — no max-width constraint.
   Horizontal padding matches the header's internal padding. */
.l-page-content--full {
  padding-inline: var(--flex-space-md);
  padding-block: var(--flex-space-lg);
}
```

- [ ] **Step 2: Refactor Layout component**

Rewrite `src/design-system/components/flex-layout/index.tsx`. The key changes:
- Add `contentWidth?: 'centered' | 'full'` to `LayoutProps`
- Move Banner, Header, Footer outside the content wrapper
- Use `l-page-content--full` when `contentWidth="full"`
- Keep sidebar variant unchanged (it's always centered)

Replace the body rendering (from `<body>` to `</body>`) with:

```tsx
      <body>
        <Banner
          ariaLabel="A digital services project by Flexion"
          headerText="A digital services project by Flexion"
          headerImage={undefined}
          buttonText="About this project"
          guidance={[
            {
              icon: {
                src: `${resolveUrl('/static/sprite.svg')}#account_balance`,
                alt: 'Flexion',
                color: 'var(--flex-color-accent)',
              },
              heading: 'About Flexion',
              text: (
                <>
                  We build digital services for federal, state, and local
                  government agencies.{' '}
                  <a href="https://flexion.us">Learn more</a>.
                </>
              ),
            },
            {
              icon: {
                src: `${resolveUrl('/static/sprite.svg')}#github`,
                alt: 'GitHub',
                color: '#24292f',
              },
              heading: 'Open source',
              text: (
                <>
                  This project is developed in the open. View the source code on{' '}
                  <a href="https://github.com/flexion/forms-lab">GitHub</a>.
                </>
              ),
            },
          ]}
        />
        <Header
          logoHref={resolveUrl('/')}
          user={props.user ?? undefined}
          signoutAction={resolveUrl('/auth/signout')}
        >
          <HeaderNavItem
            href={resolveUrl('/')}
            label="Home"
            current={props.currentPath === '/'}
          />
          {props.user ? (
            <>
              <HeaderNavItem
                href={resolveUrl(`/${props.user.login}`)}
                label="Projects"
                current={props.currentPath === `/${props.user.login}`}
              />
              <HeaderNavItem
                href={resolveUrl('/catalog')}
                label="Catalog"
                current={props.currentPath?.startsWith('/catalog') ?? false}
              />
            </>
          ) : (
            <>
              <HeaderNavItem
                href={resolveUrl('/catalog')}
                label="Catalog"
                current={props.currentPath?.startsWith('/catalog') ?? false}
              />
              <HeaderNavItem
                href={resolveUrl('/auth/signin')}
                label="Sign in"
              />
            </>
          )}
        </Header>
        {props.sidebar ? (
          <div class="l-page-sidebar-start">
            <aside class="l-page-sidebar catalog-sidebar">
              <details class="catalog-nav-toggle" open>
                <summary>In this section</summary>
                {props.sidebar}
              </details>
              <script
                dangerouslySetInnerHTML={{
                  __html: `(function(){var d=document.querySelector(".catalog-nav-toggle");function u(){if(innerWidth<=768)d.removeAttribute("open");else d.setAttribute("open","")}u();addEventListener("resize",u)}())`,
                }}
              />
            </aside>
            <main class="l-page-main">
              <div class="l-stack">{props.children}</div>
            </main>
          </div>
        ) : (
          <main
            class={
              props.contentWidth === 'full'
                ? 'l-page-content--full'
                : 'l-page-content'
            }
          >
            <div class="l-stack">{props.children}</div>
          </main>
        )}
        <Footer variant="slim">
          {/* ... footer content stays exactly the same ... */}
        </Footer>
        <script
          type="module"
          src={resolveUrl('/static/components.js')}
        ></script>
      </body>
```

The only structural change vs. the current code is: Banner, Header, and Footer were already direct children of `<body>` (not wrapped in a centering container), so this is actually a no-op for the HTML structure. The current Layout already renders them outside `l-page-content`. The real change is adding the `contentWidth` conditional on the `<main>` class.

**Important:** Read the actual current file carefully before editing. The Banner and Header are already outside the content wrapper in the current code. You only need to:
1. Add `contentWidth` to the LayoutProps interface
2. Change the `<main class="l-page-content">` to be conditional on `props.contentWidth`

- [ ] **Step 3: Verify no visual regression**

Run: `bun run check`
Expected: PASS

Visually verify (optional): start dev server, check that the home page, catalog, and project pages look identical to before.

- [ ] **Step 4: Commit**

```bash
git add src/design-system/components/flex-layout/index.tsx src/entrypoints/app/public/page-layouts.css
git commit -m "feat(layout): add contentWidth prop for full-width pages"
```

---

## Task 2: Create flex-assistant component

A reusable chat-chrome custom element. It renders a scrollable message list, an input pinned to the bottom, and a close/open toggle. It does NOT know about commands, proposals, or form shaping — it's a pure conversation shell.

**Files:**
- Create: `src/design-system/components/flex-assistant/client.ts`
- Create: `src/design-system/components/flex-assistant/styles.css`

- [ ] **Step 1: Create the custom element**

Create `src/design-system/components/flex-assistant/client.ts`:

```typescript
class FlexAssistant extends HTMLElement {
  private messages: Array<{ role: 'user' | 'assistant' | 'system'; html: string }> = []
  private isOpen = true

  connectedCallback() {
    this.render()
  }

  addMessage(role: 'user' | 'assistant' | 'system', html: string) {
    this.messages.push({ role, html })
    this.renderMessages()
    this.scrollToBottom()
  }

  clearMessages() {
    this.messages = []
    this.renderMessages()
  }

  toggle() {
    this.isOpen = !this.isOpen
    this.render()
    this.dispatchEvent(
      new CustomEvent('assistant:toggled', {
        detail: { open: this.isOpen },
        bubbles: true,
        composed: true,
      }),
    )
  }

  get open() {
    return this.isOpen
  }

  private render() {
    if (!this.isOpen) {
      this.innerHTML = ''
      this.setAttribute('data-closed', '')
      return
    }
    this.removeAttribute('data-closed')
    this.innerHTML = `
      <div class="assistant">
        <div class="assistant__header">
          <span class="assistant__title">AI Assistant</span>
          <button type="button" class="assistant__close" aria-label="Close assistant">&times;</button>
        </div>
        <div class="assistant__messages"></div>
        <form class="assistant__input">
          <textarea
            class="flex-textarea assistant__textarea"
            rows="2"
            placeholder="Describe changes..."
            name="intent"
          ></textarea>
          <button type="submit" class="flex-button assistant__send">Send</button>
        </form>
      </div>
    `
    this.bindHandlers()
    this.renderMessages()
    this.scrollToBottom()
  }

  private renderMessages() {
    const container = this.querySelector('.assistant__messages')
    if (!container) return
    container.innerHTML = this.messages
      .map(
        (m) =>
          `<div class="assistant__message assistant__message--${m.role}">${m.html}</div>`,
      )
      .join('')
  }

  private scrollToBottom() {
    const container = this.querySelector('.assistant__messages')
    if (container) {
      container.scrollTop = container.scrollHeight
    }
  }

  private bindHandlers() {
    this.querySelector('.assistant__close')?.addEventListener('click', () => {
      this.toggle()
    })

    const form = this.querySelector<HTMLFormElement>('.assistant__input')
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault()
        const textarea = form.querySelector<HTMLTextAreaElement>('textarea')
        const text = textarea?.value?.trim()
        if (!text) return
        this.dispatchEvent(
          new CustomEvent('assistant:message-submitted', {
            detail: { text },
            bubbles: true,
            composed: true,
          }),
        )
        if (textarea) textarea.value = ''
      })
    }
  }
}

if (!customElements.get('flex-assistant')) {
  customElements.define('flex-assistant', FlexAssistant)
}
```

- [ ] **Step 2: Create styles**

Create `src/design-system/components/flex-assistant/styles.css`:

```css
flex-assistant {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
}

flex-assistant[data-closed] {
  display: none;
}

.assistant {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.assistant__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--flex-space-sm) var(--flex-space-md);
  border-block-end: 1px solid var(--flex-color-border);
  flex-shrink: 0;
}

.assistant__title {
  font-weight: 700;
  font-size: var(--flex-text-sm);
}

.assistant__close {
  background: none;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  color: var(--flex-color-text-muted);
  padding: var(--flex-space-xs);
  line-height: 1;
}

.assistant__close:hover {
  color: var(--flex-color-text);
}

.assistant__messages {
  flex: 1;
  overflow-y: auto;
  padding: var(--flex-space-md);
  display: flex;
  flex-direction: column;
  gap: var(--flex-space-sm);
}

.assistant__message {
  padding: var(--flex-space-sm) var(--flex-space-md);
  border-radius: var(--flex-radius-md, 0.5rem);
  font-size: var(--flex-text-sm);
  max-width: 90%;
}

.assistant__message--user {
  background: var(--flex-color-bg-subtle);
  align-self: flex-end;
}

.assistant__message--assistant {
  background: var(--flex-color-accent-subtle, #e8e0f8);
  align-self: flex-start;
}

.assistant__message--system {
  background: var(--flex-color-bg);
  border: 1px solid var(--flex-color-border);
  align-self: center;
  font-size: var(--flex-text-xs);
  color: var(--flex-color-text-muted);
}

.assistant__input {
  padding: var(--flex-space-sm) var(--flex-space-md);
  border-block-start: 1px solid var(--flex-color-border);
  flex-shrink: 0;
}

.assistant__textarea {
  width: 100%;
  resize: none;
  margin-block-end: var(--flex-space-xs);
}

.assistant__send {
  float: inline-end;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/design-system/components/flex-assistant/
git commit -m "feat(assistant): add reusable flex-assistant chat chrome component"
```

---

## Task 3: Rewrite EditorPage shell with three-panel layout

Replace the current two-column editor with a three-panel grid: structure (left), preview (center, centered at max-width), assistant (right).

**Files:**
- Modify: `src/entrypoints/app/routes/owner/edit/components.tsx`
- Modify: `src/entrypoints/app/routes/owner/edit/index.tsx`
- Create: `src/entrypoints/app/routes/owner/edit/editor-layout.css`

- [ ] **Step 1: Create editor layout CSS**

Create `src/entrypoints/app/routes/owner/edit/editor-layout.css`:

```css
.editor-layout {
  display: grid;
  grid-template-columns: 240px 1fr 320px;
  grid-template-rows: auto 1fr;
  height: calc(100vh - 160px);
  min-height: 400px;
}

.editor-breadcrumb {
  grid-column: 1 / -1;
  padding: var(--flex-space-sm) var(--flex-space-md);
  border-block-end: 1px solid var(--flex-color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.editor-breadcrumb h1 {
  font-size: var(--flex-text-base);
  font-weight: 400;
  margin: 0;
}

.editor-breadcrumb h1 strong {
  font-weight: 700;
}

.editor-structure {
  grid-row: 2;
  border-inline-end: 1px solid var(--flex-color-border);
  overflow-y: auto;
}

.editor-structure[data-collapsed] {
  width: 48px;
  min-width: 48px;
}

.editor-layout:has(.editor-structure[data-collapsed]) {
  grid-template-columns: 48px 1fr 320px;
}

.editor-preview {
  grid-row: 2;
  overflow-y: auto;
  display: flex;
  justify-content: center;
  padding: var(--flex-space-md);
}

.editor-preview__inner {
  width: 100%;
  max-width: var(--flex-content-max-width);
}

.editor-preview iframe {
  width: 100%;
  min-height: 100%;
  border: none;
}

.editor-assistant {
  grid-row: 2;
  border-inline-start: 1px solid var(--flex-color-border);
  min-height: 0;
}

.editor-layout:has(.editor-assistant flex-assistant[data-closed]) {
  grid-template-columns: 240px 1fr 0;
}

.editor-layout:has(.editor-structure[data-collapsed]):has(.editor-assistant flex-assistant[data-closed]) {
  grid-template-columns: 48px 1fr 0;
}

.editor-breadcrumb__open-assistant {
  display: none;
}

.editor-layout:has(.editor-assistant flex-assistant[data-closed]) .editor-breadcrumb__open-assistant {
  display: inline-block;
}

@media (max-width: 64rem) {
  .editor-layout {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto 1fr auto;
    height: auto;
  }

  .editor-structure {
    grid-row: 2;
    border-inline-end: none;
    border-block-end: 1px solid var(--flex-color-border);
    max-height: 200px;
  }

  .editor-preview {
    grid-row: 3;
    min-height: 50vh;
  }

  .editor-assistant {
    grid-row: 4;
    border-inline-start: none;
    border-block-start: 1px solid var(--flex-color-border);
    max-height: 300px;
  }
}
```

- [ ] **Step 2: Add CSS import to styles.css**

In `src/entrypoints/app/public/styles.css`, add:

```css
@import url('../../routes/owner/edit/editor-layout.css') layer(block);
```

Also remove any existing import for the old editor styles if present (the `flex-form-editor/styles.css` import may still exist and can be kept since that file is being updated).

- [ ] **Step 3: Rewrite EditorPage component**

Replace the `EditorPage` export in `src/entrypoints/app/routes/owner/edit/components.tsx`:

```tsx
export const EditorPage: FC<{
  view: ProjectView
  owner: string
  user: SessionUser
  log: ShapingLogEntry[]
}> = ({ view, owner, user: _user, log }) => {
  const { project, formSpec, spec } = view
  const editBase = `/${owner}/${project.slug}/edit`

  if (!formSpec || !spec) {
    return (
      <div class="l-stack">
        <div class="flex-alert" data-variant="info" role="status">
          <div class="flex-alert__body">
            <p class="flex-alert__text">
              No form specification available. The form must be extracted before
              editing.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <flex-form-editor
      data-owner={owner}
      data-slug={project.slug}
      data-edit-base={resolveUrl(editBase)}
      data-preview-base={resolveUrl(`/${owner}/${project.slug}/preview`)}
    >
      <script
        type="application/json"
        data-initial-state
        dangerouslySetInnerHTML={{
          __html: safeJsonForScript({ formSpec, dataSpec: spec }),
        }}
      />
      <script
        type="application/json"
        data-shaping-log
        dangerouslySetInnerHTML={{ __html: safeJsonForScript(log) }}
      />

      <div class="editor-layout">
        <div class="editor-breadcrumb">
          <h1>
            <a href={resolveUrl(`/${owner}`)}>{owner}</a> /{' '}
            <a href={resolveUrl(`/${owner}/${project.slug}`)}>
              {project.name}
            </a>{' '}
            / <strong>Edit</strong>
          </h1>
          <button
            type="button"
            class="flex-button editor-breadcrumb__open-assistant"
            data-variant="outline"
            data-action="open-assistant"
          >
            AI Assistant
          </button>
        </div>

        <aside class="editor-structure">
          <flex-form-structure />
        </aside>

        <div class="editor-preview">
          <div class="editor-preview__inner">
            <iframe
              class="editor-preview-frame"
              src={resolveUrl(`/${owner}/${project.slug}/preview?page=0`)}
              title="Form preview"
            />
          </div>
        </div>

        <aside class="editor-assistant">
          <flex-assistant />
        </aside>
      </div>
    </flex-form-editor>
  )
}
```

- [ ] **Step 4: Pass contentWidth="full" in the route**

In `src/entrypoints/app/routes/owner/edit/index.tsx`, update the GET handler to pass `contentWidth`:

Change:
```tsx
<Layout user={user} title={`Edit ${view.project.name}`}>
```
To:
```tsx
<Layout user={user} title={`Edit ${view.project.name}`} contentWidth="full">
```

- [ ] **Step 5: Verify type check**

Run: `bun run --no-warnings tsc --noEmit`

There will likely be errors because `flex-form-editor` coordinator still references `flex-command-proposal`. That's fixed in Task 4.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(editor): three-panel layout with structure, preview, and assistant"
```

---

## Task 4: Update coordinator to wire flex-assistant

The `flex-form-editor` coordinator needs to:
1. Listen for `assistant:message-submitted` from `flex-assistant` instead of `formeditor:intent-submitted` from `flex-command-proposal`
2. Call `addMessage()` on the assistant to display user intents, command proposals (as humanized HTML), and errors
3. Handle the "open assistant" button in the breadcrumb bar
4. Manage the preview panel's selected page

**Files:**
- Modify: `src/design-system/components/flex-form-editor/client.ts`
- Modify: `src/design-system/components/flex-form-editor/protocol.ts`

- [ ] **Step 1: Update the protocol**

In `src/design-system/components/flex-form-editor/protocol.ts`, add the assistant events:

```typescript
  | { type: 'assistant:message-submitted'; detail: { text: string } }
  | { type: 'assistant:toggled'; detail: { open: boolean } }
```

- [ ] **Step 2: Rewrite the coordinator**

Replace `src/design-system/components/flex-form-editor/client.ts` with a version that:
- Finds the `flex-assistant` child element
- Listens for `assistant:message-submitted` instead of `formeditor:intent-submitted`
- On intent: adds user message to assistant, calls /intent, then adds assistant response with accept/reject HTML
- On accept/reject: listens for click events bubbling from within assistant messages
- On manual commands from structure: executes and adds system message
- On "open assistant" button click: toggles the assistant

The coordinator should call `assistant.addMessage('user', escapeHtml(text))` for user intents, and for assistant responses, render the humanized commands as an HTML list with accept/reject buttons inside the message.

This is a significant rewrite of client.ts. The key difference from the current version: instead of dispatching events to `flex-command-proposal`, it calls methods directly on the `flex-assistant` element.

Keep the same server interaction pattern (fetch to /intent, /accept, /execute).

- [ ] **Step 3: Remove flex-command-proposal**

```bash
rm -rf src/design-system/components/flex-command-proposal
```

- [ ] **Step 4: Update register.ts**

In `src/design-system/register.ts`, remove the `flex-command-proposal` import and add:
```typescript
import './components/flex-assistant/client'
```

- [ ] **Step 5: Update styles.css**

In `src/entrypoints/app/public/styles.css`, remove the `flex-command-proposal` CSS import and add:
```css
@import url('../../../design-system/components/flex-assistant/styles.css') layer(block);
```

- [ ] **Step 6: Run check**

```bash
bun run check
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(editor): wire flex-assistant into coordinator, remove flex-command-proposal"
```

---

## Task 5: Add collapsible behavior to flex-form-structure

The structure panel should be collapsible to a narrow strip showing just page numbers. A toggle button at the top controls this.

**Files:**
- Modify: `src/design-system/components/flex-form-structure/client.ts`
- Modify: `src/design-system/components/flex-form-structure/styles.css`

- [ ] **Step 1: Update the structure element**

In `src/design-system/components/flex-form-structure/client.ts`, add:
- A `collapsed` boolean state
- A toggle button in the rendered HTML
- When collapsed: render just page numbers (clickable) in a narrow strip
- When expanded: render the full page cards as currently

The toggle should set `data-collapsed` attribute on the closest `.editor-structure` parent element (so the CSS grid can respond).

- [ ] **Step 2: Update structure styles**

In `src/design-system/components/flex-form-structure/styles.css`, add styles for the collapsed state:
- Narrow width, centered page numbers
- Toggle button styling
- Transition for smooth collapse/expand

- [ ] **Step 3: Run check**

```bash
bun run check
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(editor): add collapsible behavior to structure panel"
```

---

## Task 6: Clean up old editor styles and verify end-to-end

Remove the old editor CSS that was in `flex-form-editor/styles.css` (it defined a two-column `.editor-layout` grid that's now replaced by `editor-layout.css`). Verify everything works together.

**Files:**
- Modify: `src/design-system/components/flex-form-editor/styles.css`

- [ ] **Step 1: Replace flex-form-editor styles**

Replace `src/design-system/components/flex-form-editor/styles.css` with just the custom element display rule:

```css
flex-form-editor {
  display: block;
}
```

The three-panel grid is now in `editor-layout.css`. The old `.editor-layout`, `.editor-panel`, `.editor-preview-frame`, `.editor-preview`, `.editor-preview__group` rules are no longer needed.

- [ ] **Step 2: Build CSS**

```bash
bun run build:css
```

- [ ] **Step 3: Run full check**

```bash
bun run check
```

- [ ] **Step 4: Start dev server and verify**

Start the dev server on a free port. Navigate to a project's edit page and verify:
- Three-panel layout renders
- Structure panel shows pages, clicking selects and updates preview
- Preview renders form with actual components, centered at max-width
- Assistant panel shows, can type and send (LLM will respond if Bedrock creds valid)
- Collapsing structure panel works
- Closing assistant panel works and shows "AI Assistant" button in breadcrumb

- [ ] **Step 5: Fix any issues found**

Address layout, styling, or wiring bugs discovered during verification.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "fix(editor): clean up old styles and polish three-panel layout"
```
