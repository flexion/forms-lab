import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Page } from '@playwright/test'

const DEV_SERVER = 'http://localhost:3000'

// Cache CSS in memory — these never change during a test run.
// Eliminates thousands of redundant disk reads across 279 tests.
let cachedFlexCSS: string | undefined
let cachedUswdsCSS: string | undefined

function getFlexCSS(): string {
  if (cachedFlexCSS) return cachedFlexCSS
  // Use the pre-built CSS bundle (includes tokens + all component styles)
  // instead of reading 50+ individual files.
  let css = readFileSync(
    resolve(process.cwd(), 'dist/styles.css'),
    'utf-8',
  )
  css = css.replaceAll('url("/static/', `url("${DEV_SERVER}/static/`)
  cachedFlexCSS = css
  return css
}

function getUswdsCSS(): string {
  if (cachedUswdsCSS) return cachedUswdsCSS
  let css = readFileSync(
    resolve(process.cwd(), 'node_modules/@uswds/uswds/dist/css/uswds.min.css'),
    'utf-8',
  )
  css = css.replaceAll(
    'url(../fonts/source-sans-pro/',
    `url(${DEV_SERVER}/static/fonts/source-sans-pro/`,
  )
  css = css.replaceAll(
    'url(../fonts/roboto-mono/',
    `url(${DEV_SERVER}/static/fonts/roboto-mono/`,
  )
  cachedUswdsCSS = css
  return css
}

export async function renderFlexFixture(
  page: Page,
  html: string,
): Promise<void> {
  const css = getFlexCSS()
  await page.setContent(`
    <!DOCTYPE html>
    <html lang="en">
    <head><style>${css}</style></head>
    <body style="margin: 0; padding: 16px;">
      ${html}
    </body>
    </html>
  `)
  await page.waitForLoadState('domcontentloaded')
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
  await page.waitForLoadState('domcontentloaded')
}
