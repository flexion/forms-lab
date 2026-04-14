/** @jsxImportSource hono/jsx */
import type { ConformanceSpec } from '../../conformance/types'

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
      notes: 'Base form class with max-width 32em',
    },
    {
      uswds: 'usa-form--large',
      flex: 'data-size="large"',
      notes: 'Wider form variant (46rem)',
    },
  ],
  verified: ['max-width', 'font-family', 'font-size', 'line-height'],
  structuralIgnores: [],
  intentionalDifferences: [],
  fixtures: [
    formFixture('default form matches usa-form'),
    formFixture('large form matches usa-form--large', 'large'),
    {
      name: 'fieldset with legend',
      uswds: (
        <div>
          <form class="usa-form" data-testid="target">
            <fieldset class="usa-fieldset">
              <legend class="usa-legend usa-legend--large">Contact info</legend>
              <label class="usa-label" for="fs-input">
                Name
              </label>
              <input
                class="usa-input"
                id="fs-input"
                name="fs-input"
                type="text"
              />
            </fieldset>
          </form>
        </div>
      ).toString(),
      flex: (
        <div>
          <form class="flex-form" data-testid="target">
            <fieldset>
              <legend>Contact info</legend>
              <label class="flex-label" for="fs-input">
                Name
              </label>
              <input
                class="flex-input"
                id="fs-input"
                name="fs-input"
                type="text"
              />
            </fieldset>
          </form>
        </div>
      ).toString(),
    },
    {
      name: 'form group error state',
      uswds: (
        <div>
          <form class="usa-form" data-testid="target">
            <div class="usa-form-group usa-form-group--error">
              <label class="usa-label" for="err-input">
                Name
              </label>
              <span class="usa-error-message">Name is required</span>
              <input
                class="usa-input usa-input--error"
                id="err-input"
                name="err-input"
                type="text"
              />
            </div>
          </form>
        </div>
      ).toString(),
      flex: (
        <div>
          <form class="flex-form" data-testid="target">
            <div class="flex-form-group" data-state="error">
              <label class="flex-label" for="err-input">
                Name
              </label>
              <span class="flex-error-message">Name is required</span>
              <input
                class="flex-input"
                id="err-input"
                name="err-input"
                type="text"
                data-state="error"
              />
            </div>
          </form>
        </div>
      ).toString(),
    },
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
