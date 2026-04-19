import type { CustomContract } from '../../contract/types'

export const spec: CustomContract = {
  kind: 'custom',
  component: 'flex-spec-browser',
  variants: [
    {
      name: 'Default',
      description:
        'Two-pane browser showing pages and groups from a minimal spec, all panels expanded, no confidence data.',
    },
    {
      name: 'WithConfidence',
      description:
        'Browser with per-field confidence badges overlaid: high confidence shows nothing, medium shows "Review", low shows "Low confidence".',
    },
  ],
  behavior: [
    {
      description:
        'Sidebar nav links scroll the content pane to the corresponding page or group section',
      tested: false,
    },
    {
      description:
        'Details panels open/close on click; defaultExpanded prop controls initial state',
      tested: false,
    },
    {
      description:
        'blobBasePath turns section headings into external links to the source files',
      tested: false,
    },
  ],
  accessibilityFixtureHtml: `<main>
    <h1>Spec Browser Test</h1>
    <flex-spec-browser class="flex-spec-browser">
      <aside class="flex-spec-browser__sidebar">
        <nav class="flex-spec-browser__nav" aria-label="On this form">
          <h2 class="flex-spec-browser__nav-heading">On this form</h2>
          <ul class="flex-spec-browser__nav-list">
            <li class="flex-spec-browser__nav-item">
              <a class="flex-spec-browser__nav-link" href="#page-page-1">1. Your Information</a>
              <ul class="flex-spec-browser__nav-sublist">
                <li class="flex-spec-browser__nav-item">
                  <a class="flex-spec-browser__nav-link flex-spec-browser__nav-link--sub" href="#group-group-personal">Personal Information</a>
                </li>
              </ul>
            </li>
          </ul>
        </nav>
      </aside>
      <div class="flex-spec-browser__content">
        <section class="flex-spec-browser__section" aria-labelledby="spec-pages">
          <h2 id="spec-pages" class="flex-spec-browser__section-heading">Pages</h2>
          <div class="flex-spec-browser__panels">
            <details id="page-page-1" class="flex-spec-browser__panel" open>
              <summary class="flex-spec-browser__panel-summary">
                <span class="flex-spec-browser__panel-number">1.</span>
                <span class="flex-spec-browser__panel-title">Your Information</span>
              </summary>
              <div class="flex-spec-browser__panel-body">
                <p class="text-muted">No groups assigned to this page.</p>
              </div>
            </details>
          </div>
        </section>
      </div>
    </flex-spec-browser>
  </main>`,
}
