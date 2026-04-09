import type { Page } from '@playwright/test'
import { DEFAULT_PROPERTIES, TRACKED_ATTRIBUTES } from './schema'
import type { VisualDescriptor } from './types'

/**
 * Extract a VisualDescriptor from a rendered component.
 * If url is provided, navigates there first. Otherwise assumes content is already loaded.
 * Waits for selector, then walks the subtree extracting computed styles and box model.
 */
export async function extract(
  page: Page,
  url: string,
  selector: string = '[data-testid="target"]',
  properties: string[] = DEFAULT_PROPERTIES,
): Promise<VisualDescriptor> {
  if (url) {
    await page.goto(url, { waitUntil: 'networkidle' })
  }
  await page.waitForSelector(selector)

  return page.evaluate(
    ({ selector, properties, trackedAttributes }) => {
      // biome-ignore lint/suspicious/noExplicitAny: Playwright evaluate serialization boundary
      function extractPseudo(el: Element, pseudo: '::before' | '::after'): any {
        const cs = getComputedStyle(el, pseudo)
        const content = cs.getPropertyValue('content')
        if (content === 'none' || content === 'normal' || content === '')
          return null

        const styles: Record<string, string> = {}
        for (const prop of properties) {
          styles[prop] = cs.getPropertyValue(prop)
        }
        return { content, styles }
      }

      // biome-ignore lint/suspicious/noExplicitAny: Playwright evaluate serialization boundary
      function extractNode(el: Element): any {
        const cs = getComputedStyle(el)
        const rect = el.getBoundingClientRect()

        const styles: Record<string, string> = {}
        for (const prop of properties) {
          styles[prop] = cs.getPropertyValue(prop)
        }

        // Tracked attributes
        const attributes: Record<string, string> = {}
        for (const attr of trackedAttributes) {
          if (el.hasAttribute(attr)) {
            attributes[attr] = el.getAttribute(attr) ?? ''
          }
        }

        // Direct text content (not children's text)
        let text: string | null = null
        for (const child of el.childNodes) {
          if (child.nodeType === Node.TEXT_NODE) {
            const t = child.textContent?.trim()
            if (t) {
              text = text ? `${text} ${t}` : t
            }
          }
        }

        // biome-ignore lint/suspicious/noExplicitAny: Playwright evaluate serialization boundary
        const children: any[] = []
        for (const child of el.children) {
          children.push(extractNode(child))
        }

        return {
          tag: el.tagName.toLowerCase(),
          classes: Array.from(el.classList).sort(),
          attributes,
          text,
          styles,
          box: {
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            paddingTop: parseFloat(cs.paddingTop),
            paddingRight: parseFloat(cs.paddingRight),
            paddingBottom: parseFloat(cs.paddingBottom),
            paddingLeft: parseFloat(cs.paddingLeft),
            marginTop: parseFloat(cs.marginTop),
            marginRight: parseFloat(cs.marginRight),
            marginBottom: parseFloat(cs.marginBottom),
            marginLeft: parseFloat(cs.marginLeft),
          },
          before: extractPseudo(el, '::before'),
          after: extractPseudo(el, '::after'),
          children,
        }
      }

      const root = document.querySelector(selector)
      if (!root) throw new Error(`Element not found: ${selector}`)
      return extractNode(root)
    },
    { selector, properties, trackedAttributes: TRACKED_ATTRIBUTES },
  )
}
