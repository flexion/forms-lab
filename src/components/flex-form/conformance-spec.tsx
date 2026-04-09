/** @jsxImportSource hono/jsx */
import type { ConformanceSpec } from '../conformance-types'

const formContent = (uswdsPrefix: string, flexPrefix: string) => ({
  uswds: (
    <>
      <label class={`${uswdsPrefix}-label`} for="input-1">
        Name
      </label>
      <input
        class={`${uswdsPrefix}-input`}
        id="input-1"
        name="input-1"
        type="text"
      />
    </>
  ),
  flex: (
    <>
      <label class={`${flexPrefix}-label`} for="input-1">
        Name
      </label>
      <input
        class={`${flexPrefix}-input`}
        id="input-1"
        name="input-1"
        type="text"
      />
    </>
  ),
})

function formFixture(name: string, size?: string) {
  const content = formContent('usa', 'flex')
  return {
    name,
    uswds: (
      <div>
        <form
          class={`usa-form${size ? ` usa-form--${size}` : ''}`}
          data-testid="target"
        >
          {content.uswds}
        </form>
      </div>
    ).toString(),
    flex: (
      <div>
        <form class="flex-form" data-size={size} data-testid="target">
          {content.flex}
        </form>
      </div>
    ).toString(),
  }
}

export const spec: ConformanceSpec = {
  component: 'flex-form',
  reference: 'https://designsystem.digital.gov/components/form/',
  mapping: [
    {
      uswds: 'usa-form',
      flex: '.flex-form',
      notes: 'Base form class with max-width constraint',
    },
    {
      uswds: 'usa-form--large',
      flex: 'data-size="large"',
      notes: 'Wider form variant (30rem)',
    },
  ],
  verified: ['max-width', 'font-family', 'font-size', 'line-height'],
  structuralIgnores: [],
  intentionalDifferences: [],
  fixtures: [
    formFixture('default form matches usa-form'),
    formFixture('large form matches usa-form--large', 'large'),
  ],
  accessibilityFixtureHtml: `<main>
    <h1>Form Test</h1>
    <form class="flex-form">
      <label class="flex-label" for="name">Name</label>
      <input class="flex-input" id="name" name="name" type="text">
    </form>
  </main>`,
  behavior: [],
}
