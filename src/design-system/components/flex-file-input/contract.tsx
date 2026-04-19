/** @jsxImportSource hono/jsx */
import type { UswdsContract } from '../../contract/types'

const LABEL_TEXT = 'Upload a file'
const INSTRUCTIONS_TEXT = 'Drag file here or'
const CHOOSE_TEXT = 'choose from folder'

export const spec: UswdsContract = {
  kind: 'uswds-derived',
  component: 'flex-file-input',
  reference: 'https://designsystem.digital.gov/components/file-input/',
  mapping: [
    {
      uswds: 'usa-file-input',
      flex: '<flex-file-input> (custom element)',
      notes: 'Container element',
    },
    {
      uswds: 'usa-file-input__target',
      flex: '.flex-file-input__target',
      notes: 'Drop zone / click target',
    },
    {
      uswds: 'usa-file-input__instructions',
      flex: '.flex-file-input__instructions',
      notes: 'Instructional text ("Drag file here or choose from folder")',
    },
    {
      uswds: 'usa-file-input__choose',
      flex: '.flex-file-input__choose',
      notes: '"choose from folder" styled link text',
    },
    {
      uswds: 'usa-file-input__input',
      flex: '.flex-file-input__input',
      notes: 'Hidden native file input positioned over target',
    },
    {
      uswds: 'usa-file-input__preview',
      flex: '.flex-file-input__preview',
      notes: 'Individual file preview card',
    },
    {
      uswds: 'usa-file-input__target (drag active)',
      flex: '.flex-file-input__target[data-drag-active]',
      notes: 'Drag highlight state via data attribute',
    },
    {
      uswds: 'has-invalid-file',
      flex: '.flex-file-input__target--error',
      notes: 'Error state when file type is invalid',
    },
  ],
  verified: [
    'display',
    'max-width',
    'width',
    'border-style',
    'font-size',
    'text-align',
    'position',
  ],
  structuralIgnores: [
    'font-family',
    'line-height',
    'color',
    'padding-left',
    'padding-right',
  ],
  intentionalDifferences: [],
  extraIgnoreAttributes: [
    'id',
    'name',
    'accept',
    'multiple',
    'aria-describedby',
  ],
  fixtures: [
    {
      name: 'file input target matches usa-file-input__target',
      uswds: `<div class="usa-file-input" data-testid="outer">
    <label class="usa-label" for="uswds-file">${LABEL_TEXT}</label>
    <div class="usa-file-input__target" data-testid="target">
      <div class="usa-file-input__instructions" aria-hidden="true">
        ${INSTRUCTIONS_TEXT} <span class="usa-file-input__choose">${CHOOSE_TEXT}</span>
      </div>
      <div class="usa-file-input__box"></div>
      <input class="usa-file-input__input" id="uswds-file" name="file" type="file">
    </div>
  </div>`,
      flex: `<flex-file-input data-testid="outer">
    <label class="flex-label" for="flex-file">${LABEL_TEXT}</label>
    <div class="flex-file-input__target" data-testid="target">
      <div class="flex-file-input__instructions" aria-hidden="true">
        ${INSTRUCTIONS_TEXT} <span class="flex-file-input__choose">${CHOOSE_TEXT}</span>
      </div>
      <input class="flex-file-input__input" id="flex-file" name="file" type="file">
    </div>
  </flex-file-input>`,
      uswdsSelector: '[data-testid="target"]',
      flexSelector: '[data-testid="target"]',
    },
  ],
  accessibilityFixtureHtml: `<main>
    <h1>File Input Test</h1>
    <flex-file-input>
      <label class="flex-label" for="file-test">Upload a file</label>
      <div class="flex-file-input__target">
        <div class="flex-file-input__instructions" aria-hidden="true">
          Drag file here or <span class="flex-file-input__choose">choose from folder</span>
        </div>
        <input class="flex-file-input__input" id="file-test" name="file-test" type="file">
      </div>
      <div class="flex-file-input__preview-area"></div>
    </flex-file-input>
  </main>`,
  behavior: [
    {
      description: 'Drag highlight appears on dragenter/dragover',
      tested: true,
    },
    {
      description: 'Drag highlight removed on dragleave/drop',
      tested: true,
    },
    {
      description: 'File selection displays file name and size in preview',
      tested: true,
    },
    {
      description: 'Image files show thumbnail preview',
      tested: true,
    },
    {
      description: 'Remove button removes file from preview',
      tested: true,
    },
    {
      description: 'Invalid file type shows error state',
      tested: true,
    },
  ],
}
