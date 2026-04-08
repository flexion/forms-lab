import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Page } from '@playwright/test'

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
    'src/components/flex-layout/styles.css',
    'src/components/flex-badge/styles.css',
    'src/components/flex-card/styles.css',
    'src/components/flex-prose/styles.css',
    'src/components/flex-button/styles.css',
    'src/components/flex-label/styles.css',
    'src/components/flex-text-input/styles.css',
    'src/components/flex-textarea/styles.css',
    'src/components/flex-error-message/styles.css',
  ]
  return files.map((f) => readCSSFile(f)).join('\n')
}

function getTokenCSS(): string {
  return readCSSFile('src/public/tokens.css')
}

function getUswdsCSS(): string {
  return readFileSync(
    resolve(process.cwd(), 'node_modules/@uswds/uswds/dist/css/uswds.min.css'),
    'utf-8',
  )
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
    <body style="margin: 0; padding: 16px; font-family: system-ui;">
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
    <body style="margin: 0; padding: 16px; font-family: system-ui;">
      ${html}
    </body>
    </html>
  `)
  await page.waitForLoadState('networkidle')
}
