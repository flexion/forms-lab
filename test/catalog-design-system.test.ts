import { describe, expect, it } from 'bun:test'
import app from '../src/entrypoints/app/server'

describe('GET /catalog/design-system/:slug (tabbed examples)', () => {
  it('renders tab groups for component examples', async () => {
    const res = await app.request('/catalog/design-system/flex-button')
    expect(res.status).toBe(200)

    const body = await res.text()
    // Should have tab group wrapper
    expect(body).toContain('flex-tab-group')
    // Should have Preview and Code tabs
    expect(body).toContain('role="tab"')
    expect(body).toContain('Preview')
    expect(body).toContain('Code')
    // Should have tabpanels
    expect(body).toContain('role="tabpanel"')
  })

  it('renders syntax-highlighted HTML in Code tab', async () => {
    const res = await app.request('/catalog/design-system/flex-button')
    const body = await res.text()
    // The code panel should contain highlighted HTML (hljs classes)
    expect(body).toContain('hljs')
    // Should contain actual rendered markup (escaped angle brackets in highlighted form)
    expect(body).toContain('flex-button')
  })

  it('wraps CSS source in an accordion', async () => {
    const res = await app.request('/catalog/design-system/flex-button')
    const body = await res.text()
    expect(body).toContain('flex-accordion')
    expect(body).toContain('Source CSS')
  })
})
