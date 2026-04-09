import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import {
  runAccessibilityAudit,
  runVisualConformance,
} from '../../../lib/test-helpers/conformance-runner'
import { renderFlexFixture } from '../../../lib/test-helpers/render'
import { spec } from './conformance-spec'

const componentsJs = readFileSync(
  resolve(process.cwd(), 'dist/components.js'),
  'utf-8',
)

// Spec-driven visual conformance and accessibility
runVisualConformance(spec)
runAccessibilityAudit(spec)

// --- Custom behavioral tests ---

test.describe('flex-file-input drag behavior', () => {
  async function renderWithJs(page: import('@playwright/test').Page) {
    await renderFlexFixture(
      page,
      `<flex-file-input>
        <label class="flex-label" for="f">Upload</label>
        <div class="flex-file-input__target">
          <div class="flex-file-input__instructions" aria-hidden="true">
            Drag file here or <span class="flex-file-input__choose">choose from folder</span>
          </div>
          <input class="flex-file-input__input" id="f" name="f" type="file">
        </div>
        <div class="flex-file-input__preview-area"></div>
      </flex-file-input>
      <script>${componentsJs}</script>`,
    )
    await page.waitForFunction(() => customElements.get('flex-file-input'))
  }

  test('drag highlight appears on dragover', async ({ page }) => {
    await renderWithJs(page)

    const target = page.locator('.flex-file-input__target')

    // Dispatch dragover event on the target
    await target.dispatchEvent('dragenter', { bubbles: true })
    await expect(target).toHaveAttribute('data-drag-active', '')

    await target.dispatchEvent('dragleave', {
      bubbles: true,
      relatedTarget: null,
    })
    // After dragleave with null relatedTarget the attribute should be removed
    await expect(target).not.toHaveAttribute('data-drag-active')
  })
})

test.describe('flex-file-input file selection', () => {
  async function renderWithJs(page: import('@playwright/test').Page) {
    await renderFlexFixture(
      page,
      `<flex-file-input>
        <label class="flex-label" for="f">Upload</label>
        <div class="flex-file-input__target">
          <div class="flex-file-input__instructions" aria-hidden="true">
            Drag file here or <span class="flex-file-input__choose">choose from folder</span>
          </div>
          <input class="flex-file-input__input" id="f" name="f" type="file">
        </div>
        <div class="flex-file-input__preview-area"></div>
      </flex-file-input>
      <script>${componentsJs}</script>`,
    )
    await page.waitForFunction(() => customElements.get('flex-file-input'))
  }

  test('selecting a file displays file name in preview', async ({ page }) => {
    await renderWithJs(page)

    // Programmatically simulate file selection via the change event
    await page.evaluate(() => {
      const input = document.querySelector(
        '.flex-file-input__input',
      ) as HTMLInputElement
      const dt = new DataTransfer()
      const file = new File(['hello'], 'test-document.txt', {
        type: 'text/plain',
      })
      dt.items.add(file)
      Object.defineProperty(input, 'files', { value: dt.files })
      input.dispatchEvent(new Event('change', { bubbles: true }))
    })

    const preview = page.locator('.flex-file-input__preview')
    await expect(preview).toBeVisible()

    const fileName = page.locator('.flex-file-input__file-name')
    await expect(fileName).toContainText('test-document.txt')

    const fileSize = page.locator('.flex-file-input__file-size')
    await expect(fileSize).toBeVisible()
  })

  test('remove button removes file from preview', async ({ page }) => {
    await renderWithJs(page)

    // Add a file
    await page.evaluate(() => {
      const input = document.querySelector(
        '.flex-file-input__input',
      ) as HTMLInputElement
      const dt = new DataTransfer()
      dt.items.add(new File(['data'], 'remove-me.txt', { type: 'text/plain' }))
      Object.defineProperty(input, 'files', { value: dt.files })
      input.dispatchEvent(new Event('change', { bubbles: true }))
    })

    await expect(page.locator('.flex-file-input__preview')).toBeVisible()

    // Click remove
    await page.locator('.flex-file-input__remove').click()

    await expect(page.locator('.flex-file-input__preview')).toHaveCount(0)
  })

  test('invalid file type shows error', async ({ page }) => {
    await renderFlexFixture(
      page,
      `<flex-file-input>
        <label class="flex-label" for="f">Upload</label>
        <div class="flex-file-input__target">
          <div class="flex-file-input__instructions" aria-hidden="true">
            Drag file here or <span class="flex-file-input__choose">choose from folder</span>
          </div>
          <input class="flex-file-input__input" id="f" name="f" type="file" accept=".pdf">
        </div>
        <div class="flex-file-input__preview-area"></div>
      </flex-file-input>
      <script>${componentsJs}</script>`,
    )
    await page.waitForFunction(() => customElements.get('flex-file-input'))

    // Try to add a non-PDF file
    await page.evaluate(() => {
      const input = document.querySelector(
        '.flex-file-input__input',
      ) as HTMLInputElement
      const dt = new DataTransfer()
      dt.items.add(new File(['data'], 'bad.txt', { type: 'text/plain' }))
      Object.defineProperty(input, 'files', { value: dt.files })
      input.dispatchEvent(new Event('change', { bubbles: true }))
    })

    const errorPreview = page.locator('.flex-file-input__preview--error')
    await expect(errorPreview).toBeVisible()
  })

  test('image file shows thumbnail preview', async ({ page }) => {
    await renderWithJs(page)

    // Create a tiny 1x1 PNG as a data URL and use it as file content
    await page.evaluate(() => {
      const input = document.querySelector(
        '.flex-file-input__input',
      ) as HTMLInputElement
      const dt = new DataTransfer()
      // Minimal valid PNG
      const pngData = atob(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      )
      const arr = new Uint8Array(pngData.length)
      for (let i = 0; i < pngData.length; i++) {
        arr[i] = pngData.charCodeAt(i)
      }
      const file = new File([arr], 'photo.png', { type: 'image/png' })
      dt.items.add(file)
      Object.defineProperty(input, 'files', { value: dt.files })
      input.dispatchEvent(new Event('change', { bubbles: true }))
    })

    // The thumbnail is created async via FileReader, wait for it
    const thumbnail = page.locator('.flex-file-input__thumbnail')
    await expect(thumbnail).toBeVisible({ timeout: 5000 })
    await expect(thumbnail).toHaveAttribute('alt', 'photo.png')
  })
})

test.describe('flex-file-input accessibility', () => {
  test('accessibility audit passes', async ({ page }) => {
    await renderFlexFixture(
      page,
      `<main>
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
    )

    await page.evaluate(() => {
      document.title = 'File Input Conformance Test'
    })

    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })
})
