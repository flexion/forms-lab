import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Page } from '@playwright/test'

const DEV_SERVER = 'http://localhost:3000'

function readCSSFile(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf-8')
}

function getFlexCSS(): string {
  const files = [
    'src/app/public/reset.css',
    'src/app/public/font-normalize.css',
    'src/app/public/base.css',
    'src/app/public/base-classes.css',
    'src/app/public/utilities.css',
    'src/app/components/flex-accordion/styles.css',
    'src/app/components/flex-alert/styles.css',
    'src/app/components/flex-icon/styles.css',
    'src/app/components/flex-layout/styles.css',
    'src/app/components/flex-badge/styles.css',
    'src/app/components/flex-card/styles.css',
    'src/app/components/flex-prose/styles.css',
    'src/app/components/flex-button/styles.css',
    'src/app/components/flex-label/styles.css',
    'src/app/components/flex-text-input/styles.css',
    'src/app/components/flex-textarea/styles.css',
    'src/app/components/flex-error-message/styles.css',
    'src/app/components/flex-tag/styles.css',
    'src/app/components/flex-link/styles.css',
    'src/app/components/flex-list/styles.css',
    'src/app/components/flex-collection/styles.css',
    'src/app/components/flex-table/styles.css',
    'src/app/components/flex-breadcrumb/styles.css',
    'src/app/components/flex-side-navigation/styles.css',
    'src/app/components/flex-pagination/styles.css',
    'src/app/components/flex-search/styles.css',
    'src/app/components/flex-checkbox/styles.css',
    'src/app/components/flex-radio/styles.css',
    'src/app/components/flex-select/styles.css',
    'src/app/components/flex-button-group/styles.css',
    'src/app/components/flex-footer/styles.css',
    'src/app/components/flex-header/styles.css',
    'src/app/components/flex-banner/styles.css',
    'src/app/components/flex-identifier/styles.css',
    'src/app/components/flex-form/styles.css',
    'src/app/components/flex-validation/styles.css',
    'src/app/components/flex-input-prefix-suffix/styles.css',
    'src/app/components/flex-site-alert/styles.css',
    'src/app/components/flex-summary-box/styles.css',
    'src/app/components/flex-step-indicator/styles.css',
    'src/app/components/flex-process-list/styles.css',
    'src/app/components/flex-character-count/styles.css',
    'src/app/components/flex-memorable-date/styles.css',
    'src/app/components/flex-input-mask/styles.css',
    'src/app/components/flex-range-slider/styles.css',
    'src/app/components/flex-file-input/styles.css',
    'src/app/components/flex-language-selector/styles.css',
    'src/app/components/flex-modal/styles.css',
    'src/app/components/flex-tooltip/styles.css',
    'src/app/components/flex-combo-box/styles.css',
    'src/app/components/flex-date-picker/styles.css',
    'src/app/components/flex-date-range-picker/styles.css',
    'src/app/components/flex-time-picker/styles.css',
    'src/app/components/flex-in-page-nav/styles.css',
  ]
  let css = files.map((f) => readCSSFile(f)).join('\n')
  // Resolve absolute font paths for Playwright's page.setContent()
  css = css.replaceAll('url("/static/', `url("${DEV_SERVER}/static/`)
  return css
}

function getTokenCSS(): string {
  return readCSSFile('src/app/public/tokens.css')
}

function getUswdsCSS(): string {
  let css = readFileSync(
    resolve(process.cwd(), 'node_modules/@uswds/uswds/dist/css/uswds.min.css'),
    'utf-8',
  )
  // USWDS font paths are relative (../fonts/...) — resolve to absolute
  // by pointing to the USWDS dist directory served by the dev server
  // We can't serve USWDS fonts from our server, so use data URI font-face
  // replacements. Actually — USWDS CSS references ../fonts/ relative to
  // the CSS file location. When injected via setContent, there's no base URL.
  // Fix: rewrite to absolute localhost URLs pointing to our copies of the
  // same font files.
  css = css.replaceAll(
    'url(../fonts/source-sans-pro/',
    `url(${DEV_SERVER}/static/fonts/source-sans-pro/`,
  )
  css = css.replaceAll(
    'url(../fonts/roboto-mono/',
    `url(${DEV_SERVER}/static/fonts/roboto-mono/`,
  )
  // USWDS also references merriweather and public-sans — we don't serve those
  // but they're fallback fonts not used in default theme components
  return css
}

export async function renderFlexFixture(
  page: Page,
  html: string,
): Promise<void> {
  const css = `${getTokenCSS()}\n${getFlexCSS()}`
  await page.setContent(`
    <!DOCTYPE html>
    <html lang="en">
    <head><style>${css}</style></head>
    <body style="margin: 0; padding: 16px;">
      ${html}
    </body>
    </html>
  `)
  await page.waitForLoadState('networkidle')
}

export async function renderUswdsFixture(
  page: Page,
  html: string,
): Promise<void> {
  const css = getUswdsCSS()
  await page.setContent(`
    <!DOCTYPE html>
    <html lang="en">
    <head><style>${css}</style></head>
    <body style="margin: 0; padding: 16px;">
      ${html}
    </body>
    </html>
  `)
  await page.waitForLoadState('networkidle')
}
