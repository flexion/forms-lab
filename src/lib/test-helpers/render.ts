import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Page } from '@playwright/test'

const DEV_SERVER = 'http://localhost:3000'

function readCSSFile(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf-8')
}

function getFlexCSS(): string {
  const files = [
    'src/public/reset.css',
    'src/public/font-normalize.css',
    'src/public/base.css',
    'src/public/utilities.css',
    'src/components/flex-accordion/styles.css',
    'src/components/flex-alert/styles.css',
    'src/components/flex-icon/styles.css',
    'src/components/flex-layout/styles.css',
    'src/components/flex-badge/styles.css',
    'src/components/flex-card/styles.css',
    'src/components/flex-prose/styles.css',
    'src/components/flex-button/styles.css',
    'src/components/flex-label/styles.css',
    'src/components/flex-text-input/styles.css',
    'src/components/flex-textarea/styles.css',
    'src/components/flex-error-message/styles.css',
    'src/components/flex-tag/styles.css',
    'src/components/flex-link/styles.css',
    'src/components/flex-list/styles.css',
    'src/components/flex-collection/styles.css',
    'src/components/flex-table/styles.css',
    'src/components/flex-breadcrumb/styles.css',
    'src/components/flex-side-navigation/styles.css',
    'src/components/flex-pagination/styles.css',
    'src/components/flex-search/styles.css',
    'src/components/flex-checkbox/styles.css',
    'src/components/flex-radio/styles.css',
    'src/components/flex-select/styles.css',
    'src/components/flex-button-group/styles.css',
    'src/components/flex-footer/styles.css',
    'src/components/flex-banner/styles.css',
    'src/components/flex-identifier/styles.css',
    'src/components/flex-form/styles.css',
    'src/components/flex-validation/styles.css',
    'src/components/flex-input-prefix-suffix/styles.css',
    'src/components/flex-site-alert/styles.css',
    'src/components/flex-summary-box/styles.css',
    'src/components/flex-step-indicator/styles.css',
    'src/components/flex-process-list/styles.css',
  ]
  let css = files.map((f) => readCSSFile(f)).join('\n')
  // Resolve absolute font paths for Playwright's page.setContent()
  css = css.replaceAll('url("/static/', `url("${DEV_SERVER}/static/`)
  return css
}

function getTokenCSS(): string {
  return readCSSFile('src/public/tokens.css')
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
