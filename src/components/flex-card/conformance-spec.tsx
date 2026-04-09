/** @jsxImportSource hono/jsx */
import type { ConformanceSpec } from '../conformance-types'

const CARD_TITLE = 'Title'
const CARD_BODY_TEXT = 'Body text'

function cardFixture(
  name: string,
  targetPart: 'container' | 'body' | 'header',
) {
  return {
    name,
    uswds: (
      <div class="usa-card">
        <div
          class="usa-card__container"
          data-testid={targetPart === 'container' ? 'target' : undefined}
        >
          <div
            class="usa-card__header"
            data-testid={targetPart === 'header' ? 'target' : undefined}
          >
            <h2 class="usa-card__heading">{CARD_TITLE}</h2>
          </div>
          <div
            class="usa-card__body"
            data-testid={targetPart === 'body' ? 'target' : undefined}
          >
            <p>{CARD_BODY_TEXT}</p>
          </div>
        </div>
      </div>
    ).toString(),
    flex: (
      <div class="flex-card">
        <div
          class="flex-card__container"
          data-testid={targetPart === 'container' ? 'target' : undefined}
        >
          <div
            class="flex-card__header"
            data-testid={targetPart === 'header' ? 'target' : undefined}
          >
            <h2 class="flex-card__heading">{CARD_TITLE}</h2>
          </div>
          <div
            class="flex-card__body"
            data-testid={targetPart === 'body' ? 'target' : undefined}
          >
            <p>{CARD_BODY_TEXT}</p>
          </div>
        </div>
      </div>
    ).toString(),
  }
}

export const spec: ConformanceSpec = {
  component: 'flex-card',
  reference: 'https://designsystem.digital.gov/components/card/',
  mapping: [
    {
      uswds: 'usa-card',
      flex: '.flex-card',
      notes: 'Outer card wrapper',
    },
    {
      uswds: 'usa-card__container',
      flex: '.flex-card__container',
      notes: 'Inner card container with border and background',
    },
    {
      uswds: 'usa-card__header',
      flex: '.flex-card__header',
      notes: 'Card header section',
    },
    {
      uswds: 'usa-card__heading',
      flex: '.flex-card__heading',
      notes: 'Card heading text',
    },
    {
      uswds: 'usa-card__media',
      flex: '.flex-card__media',
      notes: 'Card media wrapper',
    },
    {
      uswds: 'usa-card__img',
      flex: '.flex-card__img',
      notes: 'Card image container',
    },
    {
      uswds: 'usa-card__body',
      flex: '.flex-card__body',
      notes: 'Card body content',
    },
    {
      uswds: 'usa-card__footer',
      flex: '.flex-card__footer',
      notes: 'Card footer section',
    },
    {
      uswds: 'usa-card--flag',
      flex: 'data-variant="flag"',
      notes: 'Horizontal flag layout variant',
    },
    {
      uswds: 'usa-card--header-first',
      flex: 'data-variant="header-first"',
      notes: 'Header above media variant',
    },
    {
      uswds: 'usa-card--media-right',
      flex: 'data-media-right',
      notes: 'Media on right side (flag variant)',
    },
    {
      uswds: 'usa-card__media--inset',
      flex: 'data-inset-media',
      notes: 'Media with padding inset',
    },
  ],
  verified: [
    'border-width',
    'border-style',
    'border-color',
    'border-radius',
    'background-color',
    'color',
    'font-family',
    'display',
    'flex-direction',
    'padding-top',
    'padding-right',
    'padding-bottom',
    'padding-left',
  ],
  structuralIgnores: [],
  intentionalDifferences: [
    {
      property: 'border-color',
      ours: 'var(--flex-gray-cool-10)',
      uswds: '#dfe1e2',
      reason:
        'We use semantic token that resolves to the same value in light mode',
    },
  ],
  fixtures: [
    cardFixture(
      'default card container matches usa-card__container',
      'container',
    ),
    cardFixture('card body matches usa-card__body', 'body'),
    cardFixture('card header matches usa-card__header', 'header'),
    {
      name: 'card footer matches usa-card__footer',
      uswds: (
        <div class="usa-card">
          <div class="usa-card__container">
            <div class="usa-card__header">
              <h2 class="usa-card__heading">{CARD_TITLE}</h2>
            </div>
            <div class="usa-card__body">
              <p>Body</p>
            </div>
            <div class="usa-card__footer" data-testid="target">
              <a class="usa-button" href="#">
                Visit
              </a>
            </div>
          </div>
        </div>
      ).toString(),
      flex: (
        <div class="flex-card">
          <div class="flex-card__container">
            <div class="flex-card__header">
              <h2 class="flex-card__heading">{CARD_TITLE}</h2>
            </div>
            <div class="flex-card__body">
              <p>Body</p>
            </div>
            <div class="flex-card__footer" data-testid="target">
              <a class="flex-button" href="#">
                Visit
              </a>
            </div>
          </div>
        </div>
      ).toString(),
    },
  ],
  accessibilityFixtureHtml: `<main>
    <h1>Card Test</h1>
    <div class="flex-card">
      <div class="flex-card__container">
        <div class="flex-card__header"><h2 class="flex-card__heading">Card Title</h2></div>
        <div class="flex-card__body"><p>Card body content.</p></div>
        <div class="flex-card__footer"><a href="#">Action</a></div>
      </div>
    </div>
  </main>`,
  behavior: [],
}
