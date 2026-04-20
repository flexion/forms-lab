import { Hono } from 'hono'
import { html, raw } from 'hono/html'

const presentation = new Hono()

presentation.get('/', (c) => {
  return c.html(
    html`<!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1"
          />
          <title>Forms Lab — Presentation</title>
          <style>
            *,
            *::before,
            *::after {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            html,
            body {
              height: 100%;
              overflow: hidden;
              background: #0d1117;
              color: #e6edf3;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI',
                Helvetica, Arial, sans-serif;
              font-size: 1.6rem;
              line-height: 1.5;
            }
            section[data-slide] {
              display: none;
              position: absolute;
              inset: 0;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              padding: 4rem;
              text-align: center;
            }
            section[data-slide].active {
              display: flex;
            }
            .blanked section[data-slide].active {
              display: none;
            }
            h1 {
              font-size: 4rem;
              font-weight: 700;
              margin-bottom: 0.5rem;
              color: #e6edf3;
            }
            h2 {
              font-size: 2.8rem;
              font-weight: 600;
              margin-bottom: 1rem;
              color: #e6edf3;
            }
            h3 {
              font-size: 2rem;
              font-weight: 600;
              margin-bottom: 0.75rem;
              color: #58a6ff;
            }
            .subtitle {
              font-size: 2rem;
              color: #8b949e;
              margin-bottom: 0.5rem;
            }
            .author {
              font-size: 1.4rem;
              color: #8b949e;
              margin-top: 1rem;
            }
            ul {
              list-style: none;
              text-align: left;
              max-width: 48rem;
            }
            ul li {
              padding: 0.5rem 0;
              padding-left: 1.5rem;
              position: relative;
            }
            ul li::before {
              content: '\u25B8';
              position: absolute;
              left: 0;
              color: #58a6ff;
            }
            .accent {
              color: #58a6ff;
            }
            .muted {
              color: #8b949e;
            }
            .diagram {
              display: flex;
              align-items: center;
              gap: 1.5rem;
              margin: 2rem 0;
              flex-wrap: wrap;
              justify-content: center;
            }
            .diagram .box {
              background: #161b22;
              border: 1px solid #30363d;
              border-radius: 8px;
              padding: 1.2rem 2rem;
              font-size: 1.3rem;
              font-weight: 600;
            }
            .diagram .arrow {
              font-size: 2rem;
              color: #58a6ff;
            }
            .two-col {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 3rem;
              text-align: left;
              max-width: 64rem;
              width: 100%;
            }
            .col {
              background: #161b22;
              border: 1px solid #30363d;
              border-radius: 8px;
              padding: 2rem;
            }
            .grid-2x2 {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 2rem;
              max-width: 64rem;
              width: 100%;
            }
            .grid-2x2 .cell {
              background: #161b22;
              border: 1px solid #30363d;
              border-radius: 8px;
              padding: 1.5rem;
              text-align: left;
            }
            .grid-2x2 .cell h3 {
              margin-bottom: 0.5rem;
            }
            .grid-2x2 .cell p {
              font-size: 1.2rem;
              color: #8b949e;
            }
            table {
              border-collapse: collapse;
              margin: 1.5rem auto;
              font-size: 1.3rem;
            }
            th,
            td {
              padding: 0.75rem 1.5rem;
              border: 1px solid #30363d;
              text-align: center;
            }
            th {
              background: #161b22;
              color: #58a6ff;
              font-weight: 600;
            }
            tr.highlight {
              background: rgba(88, 166, 255, 0.12);
              font-weight: 700;
            }
            .table-footer {
              font-size: 1.1rem;
              color: #8b949e;
              margin-top: 1rem;
              font-style: italic;
            }
            .quote {
              font-size: 1.4rem;
              color: #8b949e;
              font-style: italic;
              margin: 1rem 0;
              max-width: 48rem;
            }
            #slide-counter {
              position: fixed;
              bottom: 1.5rem;
              right: 2rem;
              font-size: 1rem;
              color: #8b949e;
              font-variant-numeric: tabular-nums;
              z-index: 100;
            }
          </style>
        </head>
        <body>
          <section data-slide="0">
            <h1>Forms Lab</h1>
            <p class="subtitle">LLM-Assisted Forms Platform</p>
            <p class="author">Daniel Naab</p>
          </section>

          <section data-slide="1">
            <h2>The Problem</h2>
            <ul>
              <li>
                Good forms require
                <span class="accent">engineering</span>,
                <span class="accent">domain expertise</span>, and
                <span class="accent">UX focus</span>
              </li>
              <li>That combination is expensive and scarce</li>
              <li>
                PDF is the source of truth &mdash; but it encodes
                layout, not structure
              </li>
            </ul>
          </section>

          <section data-slide="2">
            <h2>The Thesis</h2>
            <p>
              Separate <span class="accent">"what to collect"</span> from
              <span class="accent">"how to present it"</span>
            </p>
            <div class="diagram">
              <div class="box">DataCollectionSpec</div>
              <span class="arrow">&rarr;</span>
              <div class="box">FormSpec</div>
              <span class="arrow">&rarr;</span>
              <div class="box">Submission</div>
            </div>
            <p class="quote">
              "Let LLMs handle the hard parts &mdash; behind well-defined
              interfaces"
            </p>
          </section>

          <section data-slide="3">
            <h2>Architecture</h2>
            <div class="two-col">
              <div class="col">
                <h3>Service Layer</h3>
                <ul>
                  <li>One-way dependency flow</li>
                  <li>Services own their types</li>
                  <li>Strategy pattern for variants</li>
                </ul>
              </div>
              <div class="col">
                <h3>Deployment</h3>
                <ul>
                  <li>Hono on Bun</li>
                  <li>NixOS on EC2</li>
                  <li>Every branch gets its own app</li>
                </ul>
              </div>
            </div>
          </section>

          <section data-slide="4">
            <h2>Development Process</h2>
            <p class="quote">
              "Claude Code as collaborator, not autocomplete"
            </p>
            <ul>
              <li>
                Catalog as shared context: personas, stories, architecture,
                decisions
              </li>
              <li>
                Session lifecycle:
                <span class="accent">start-story</span> &rarr;
                <span class="accent">finish-story</span>
              </li>
              <li>
                Time invested in structure made LLM integrations plug in cleanly
              </li>
            </ul>
          </section>

          <section data-slide="5">
            <h2>LLM Integration Points</h2>
            <div class="grid-2x2">
              <div class="cell">
                <h3>Extraction</h3>
                <p>PDF &rarr; structured fields, 10 variants</p>
              </div>
              <div class="cell">
                <h3>Shaping</h3>
                <p>NL &rarr; form edit commands, tool-use</p>
              </div>
              <div class="cell">
                <h3>Filling</h3>
                <p>Conversational completion, agent tools</p>
              </div>
              <div class="cell">
                <h3>Evaluation</h3>
                <p>LLM-as-judge, deterministic + semantic</p>
              </div>
            </div>
          </section>

          <section data-slide="6">
            <h2>Experimentation Framework</h2>
            <ul>
              <li>
                <span class="accent">Strategy registry:</span> plug in a
                variant, get evaluation for free
              </li>
              <li>
                <span class="accent">Runtime variant picker:</span> toggle
                implementations without restart
              </li>
              <li>
                <span class="accent">Evaluation harness:</span> recall,
                precision, type accuracy, sensitivity
              </li>
              <li>
                Ground truth from Opus; judge handles semantic equivalence
              </li>
            </ul>
          </section>

          <section data-slide="7">
            <h2>Key Findings</h2>
            <table>
              <thead>
                <tr>
                  <th>Variant</th>
                  <th>Recall</th>
                  <th>Precision</th>
                  <th>Sensitivity</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Sonnet baseline</td>
                  <td>55%</td>
                  <td>87%</td>
                  <td>45%</td>
                </tr>
                <tr>
                  <td>Few-shot</td>
                  <td>55%</td>
                  <td>87%</td>
                  <td>51%</td>
                </tr>
                <tr>
                  <td>Tool-use</td>
                  <td>44%</td>
                  <td>96%</td>
                  <td>96%</td>
                </tr>
                <tr class="highlight">
                  <td>Hybrid v1</td>
                  <td>73%</td>
                  <td>99%</td>
                  <td>96%</td>
                </tr>
                <tr>
                  <td>RAG-grounded</td>
                  <td>55%</td>
                  <td>87%</td>
                  <td>70%</td>
                </tr>
              </tbody>
            </table>
            <p class="table-footer">
              "Prompt shape matters more than few-shot examples"
            </p>
          </section>

          <section data-slide="8">
            <h2>What's Next</h2>
            <ul>
              <li>
                <span class="accent">RAG authoring pipeline:</span> forms
                generated from policy corpus
              </li>
              <li>Conversational filling maturity</li>
              <li>
                <span class="accent">Cost optimization:</span> flagship &rarr;
                smaller &rarr; local models
              </li>
              <li>
                The framework makes each step an experiment, not a rewrite
              </li>
            </ul>
          </section>

          <div id="slide-counter">1 / 9</div>

          ${raw(`<script>
(function () {
  var slides = document.querySelectorAll('section[data-slide]');
  var total = slides.length;
  var counter = document.getElementById('slide-counter');
  var current = Math.max(0, Math.min(total - 1, parseInt(location.hash.slice(1), 10) || 0));

  function show(n) {
    current = Math.max(0, Math.min(total - 1, n));
    for (var i = 0; i < total; i++) {
      slides[i].classList.toggle('active', i === current);
    }
    counter.textContent = (current + 1) + ' / ' + total;
    location.hash = current;
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); show(current + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); show(current - 1); }
    else if (e.key === '.') { document.body.classList.toggle('blanked'); }
    else if (e.key === 'Home') { e.preventDefault(); show(0); }
    else if (e.key === 'End') { e.preventDefault(); show(total - 1); }
  });

  show(current);
})();
</script>`)}
        </body>
      </html>`,
  )
})

export default presentation
