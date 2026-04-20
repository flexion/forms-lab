# Presentation Slide Deck Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a server-rendered slide deck at `/presentation` with keyboard navigation and dark theme, containing 9 slides that tell the Forms Lab narrative arc.

**Architecture:** A single Hono route renders an HTML page with all slides as `<section>` elements. A tiny inline script handles keyboard navigation. The page renders its own HTML shell (not the shared Layout component) since it needs full-screen dark theme with no chrome.

**Tech Stack:** Hono JSX, inline CSS (no external stylesheet dependency), inline JS (~30 lines)

---

### Task 1: Route Shell and Navigation Script

**Files:**
- Create: `src/entrypoints/app/routes/presentation/index.tsx`

- [ ] **Step 1: Create the route file with shell and navigation**

The presentation route renders a complete HTML document with:
- Dark-themed inline styles
- All slides as `<section data-slide="N">` elements (only `.active` is visible)
- Inline script for keyboard navigation

```tsx
// src/entrypoints/app/routes/presentation/index.tsx
import { Hono } from 'hono'
import { resolveUrl } from '../../../../shared/base-path'

const presentation = new Hono()

const slides: { id: string; render: () => string }[] = []

function PresentationShell({ children }: { children: any }) {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Forms Lab — Presentation</title>
        <style dangerouslySetInnerHTML={{ __html: presentationCSS }} />
      </head>
      <body>
        <div class="deck">{children}</div>
        <div class="slide-counter"></div>
        <script dangerouslySetInnerHTML={{ __html: navigationScript }} />
      </body>
    </html>
  )
}

const presentationCSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { height: 100%; overflow: hidden; }
body {
  background: #0d1117;
  color: #e6edf3;
  font-family: system-ui, -apple-system, sans-serif;
}
.deck { height: 100vh; width: 100vw; position: relative; }
section[data-slide] {
  position: absolute;
  inset: 0;
  display: none;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 4rem 8rem;
  text-align: center;
}
section[data-slide].active { display: flex; }
body.blanked section[data-slide].active { display: none; }
h1 { font-size: 4rem; font-weight: 700; margin-bottom: 1rem; line-height: 1.1; }
h2 { font-size: 2.8rem; font-weight: 600; margin-bottom: 1.5rem; line-height: 1.2; }
h3 { font-size: 1.8rem; font-weight: 500; margin-bottom: 1rem; color: #8b949e; }
p { font-size: 1.6rem; line-height: 1.5; color: #8b949e; max-width: 48ch; }
ul { list-style: none; text-align: left; font-size: 1.5rem; line-height: 2; }
ul li::before { content: "—"; margin-right: 0.75rem; color: #58a6ff; }
code { font-family: "JetBrains Mono", monospace; background: #161b22; padding: 0.1em 0.4em; border-radius: 4px; font-size: 0.9em; }
.accent { color: #58a6ff; }
.muted { color: #8b949e; }
.slide-counter {
  position: fixed;
  bottom: 1.5rem;
  right: 2rem;
  font-size: 0.9rem;
  color: #484f58;
  font-variant-numeric: tabular-nums;
}
body.blanked .slide-counter { display: none; }

.diagram {
  display: flex;
  gap: 2rem;
  align-items: center;
  margin-top: 2rem;
}
.diagram-box {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 8px;
  padding: 1.2rem 2rem;
  font-size: 1.3rem;
}
.diagram-arrow { font-size: 2rem; color: #58a6ff; }

.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  text-align: left;
  margin-top: 2rem;
  width: 100%;
  max-width: 64rem;
}
.grid-2 > div {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 8px;
  padding: 2rem;
}
.grid-2 h4 {
  font-size: 1.3rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
  color: #58a6ff;
}
.grid-2 p, .grid-2 li {
  font-size: 1.2rem;
  color: #8b949e;
}

.results-table {
  margin-top: 2rem;
  border-collapse: collapse;
  font-size: 1.2rem;
}
.results-table th, .results-table td {
  padding: 0.6rem 1.5rem;
  border-bottom: 1px solid #21262d;
  text-align: left;
}
.results-table th { color: #58a6ff; font-weight: 500; }
.results-table tr:last-child td { border-bottom: none; }
.results-table .highlight { color: #3fb950; font-weight: 600; }
`

const navigationScript = `
(function() {
  const sections = document.querySelectorAll('section[data-slide]');
  const counter = document.querySelector('.slide-counter');
  const total = sections.length;
  let current = parseInt(location.hash.slice(1)) || 0;
  if (current < 0 || current >= total) current = 0;

  function show(n) {
    sections.forEach(s => s.classList.remove('active'));
    sections[n].classList.add('active');
    counter.textContent = (n + 1) + ' / ' + total;
    history.replaceState(null, '', '#' + n);
    current = n;
  }
  show(current);

  document.addEventListener('keydown', function(e) {
    if (e.key === 'ArrowRight' || e.key === ' ') {
      e.preventDefault();
      if (current < total - 1) show(current + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (current > 0) show(current - 1);
    } else if (e.key === '.') {
      document.body.classList.toggle('blanked');
    } else if (e.key === 'Home') {
      e.preventDefault();
      show(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      show(total - 1);
    }
  });
})();
`

presentation.get('/', (c) => {
  return c.html(
    <PresentationShell>
      {/* Slide 0: Title */}
      <section data-slide="0">
        <h1>Forms Lab</h1>
        <h3>LLM-Assisted Forms Platform</h3>
        <p class="muted">Daniel Naab</p>
      </section>

      {/* Slide 1: The Problem */}
      <section data-slide="1">
        <h2>The Problem</h2>
        <ul>
          <li>Government forms: hundreds of fields, conditional logic, sensitivity rules</li>
          <li>Manual digitization is expensive and error-prone</li>
          <li>PDF is the source of truth — but it encodes layout, not structure</li>
        </ul>
      </section>

      {/* Slide 2: The Thesis */}
      <section data-slide="2">
        <h2>The Thesis</h2>
        <p>Separate <span class="accent">what to collect</span> from <span class="accent">how to present it</span></p>
        <div class="diagram">
          <div class="diagram-box">DataCollectionSpec</div>
          <div class="diagram-arrow">→</div>
          <div class="diagram-box">FormSpec</div>
          <div class="diagram-arrow">→</div>
          <div class="diagram-box">Submission</div>
        </div>
        <p class="muted" style="margin-top: 2rem;">Let LLMs handle the hard parts — behind well-defined interfaces</p>
      </section>

      {/* Slide 3: Architecture */}
      <section data-slide="3">
        <h2>Architecture</h2>
        <div class="grid-2">
          <div>
            <h4>Service Layer</h4>
            <ul>
              <li>One-way dependency flow</li>
              <li>Each service owns its types</li>
              <li>Strategy pattern for variants</li>
            </ul>
          </div>
          <div>
            <h4>Deployment</h4>
            <ul>
              <li>Hono on Bun (server-rendered JSX)</li>
              <li>NixOS on EC2, auto-deploy via webhook</li>
              <li>Every branch gets its own app</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Slide 4: Development Process */}
      <section data-slide="4">
        <h2>Development Process</h2>
        <p>Claude Code as collaborator, not autocomplete</p>
        <ul>
          <li>Catalog as shared context: personas, stories, architecture, decisions</li>
          <li>Session lifecycle: start-story → finish-story</li>
          <li>Time invested in structure made LLM integrations plug in cleanly</li>
        </ul>
      </section>

      {/* Slide 5: LLM Integration Points */}
      <section data-slide="5">
        <h2>LLM Integration Points</h2>
        <div class="grid-2">
          <div>
            <h4>Extraction</h4>
            <p>PDF → structured fields<br/>10 variants, tool-use + RAG</p>
          </div>
          <div>
            <h4>Shaping</h4>
            <p>Natural language → form edit commands<br/>Constrained via tool-use</p>
          </div>
          <div>
            <h4>Filling</h4>
            <p>Conversational form completion<br/>Agent with collect/explain/skip tools</p>
          </div>
          <div>
            <h4>Evaluation</h4>
            <p>LLM-as-judge scoring<br/>Deterministic + semantic metrics</p>
          </div>
        </div>
      </section>

      {/* Slide 6: Experimentation Framework */}
      <section data-slide="6">
        <h2>Experimentation Framework</h2>
        <ul>
          <li>Strategy registry: plug in a variant, get evaluation for free</li>
          <li>Runtime variant picker: toggle implementations without restart</li>
          <li>Evaluation harness: recall, precision, type accuracy, sensitivity</li>
          <li>Ground truth from Opus; judge handles semantic equivalence</li>
        </ul>
      </section>

      {/* Slide 7: Key Findings */}
      <section data-slide="7">
        <h2>Key Findings</h2>
        <table class="results-table">
          <thead>
            <tr><th>Variant</th><th>Recall</th><th>Precision</th><th>Sensitivity</th></tr>
          </thead>
          <tbody>
            <tr><td>Sonnet (baseline)</td><td>55%</td><td>87%</td><td>45%</td></tr>
            <tr><td>Few-shot</td><td>55%</td><td>87%</td><td>51%</td></tr>
            <tr><td>Tool-use</td><td>44%</td><td>96%</td><td>96%</td></tr>
            <tr class="highlight"><td>Hybrid v1</td><td class="highlight">73%</td><td class="highlight">99%</td><td class="highlight">96%</td></tr>
            <tr><td>RAG-grounded</td><td>55%</td><td>87%</td><td class="highlight">70%</td></tr>
          </tbody>
        </table>
        <p class="muted" style="margin-top: 1.5rem;">Prompt shape matters more than few-shot examples</p>
      </section>

      {/* Slide 8: What's Next */}
      <section data-slide="8">
        <h2>What's Next</h2>
        <ul>
          <li>RAG authoring pipeline: forms generated from policy corpus</li>
          <li>Conversational filling maturity</li>
          <li>Cost optimization: flagship → smaller → local models</li>
          <li>The framework makes each step an experiment, not a rewrite</li>
        </ul>
      </section>
    </PresentationShell>,
  )
})

export default presentation
```

- [ ] **Step 2: Mount the route in server.tsx**

Add the import and mount the route before the owner routes (which are catch-all):

In `src/entrypoints/app/server.tsx`, add after the catalog import:
```tsx
import presentation from './routes/presentation/index'
```

And after `app.route('/catalog', catalog)`:
```tsx
app.route('/presentation', presentation)
```

- [ ] **Step 3: Create the route directory**

```bash
mkdir -p src/entrypoints/app/routes/presentation
```

- [ ] **Step 4: Verify it renders**

```bash
cd /home/daniel/src/forms-lab/.worktrees/story-87-presentation
bun run dev &
sleep 2
curl -s http://localhost:3000/presentation | head -20
kill %1
```

Expected: HTML response with `<section data-slide="0">` containing "Forms Lab".

- [ ] **Step 5: Run type check**

```bash
cd /home/daniel/src/forms-lab/.worktrees/story-87-presentation
bun run --no-warnings tsc --noEmit
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/entrypoints/app/routes/presentation/index.tsx src/entrypoints/app/server.tsx
git commit -m "feat(presentation): add server-rendered slide deck at /presentation

9-slide narrative arc: problem, thesis, architecture, dev process,
LLM integration points, experimentation, key findings, what's next.
Dark theme, keyboard navigation, projector-optimized."
```

---

### Task 2: Verify Full Check Passes

**Files:**
- None modified (validation only)

- [ ] **Step 1: Run full check**

```bash
cd /home/daniel/src/forms-lab/.worktrees/story-87-presentation
bun run check
```

Expected: All lint, type checks, and tests pass.

- [ ] **Step 2: Fix any issues**

If biome formatting issues arise, run:
```bash
bunx @biomejs/biome check --write .
```

Then re-commit.

---

### Task 3: Manual Browser Verification

- [ ] **Step 1: Start dev server and open in browser**

```bash
cd /home/daniel/src/forms-lab/.worktrees/story-87-presentation
bun run dev
```

Open http://localhost:3000/presentation in browser.

- [ ] **Step 2: Verify keyboard navigation**

- Right arrow advances slides (0 → 1 → 2 ... → 8)
- Left arrow goes back
- Period key blanks/unblanks screen
- Home goes to first slide
- End goes to last slide
- URL hash updates (e.g., `#3`)
- Counter shows "1 / 9" through "9 / 9"

- [ ] **Step 3: Verify visual quality**

- Dark background fills viewport
- Text is large and readable
- Diagram boxes render on slide 2 (thesis)
- Grid layouts render on slides 3, 5
- Results table renders on slide 7
- No scrollbars on any slide
- Content is vertically/horizontally centered
