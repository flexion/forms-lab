import { describe, expect, it } from 'bun:test'
import app from '../src/entrypoints/app/server'

describe('GET /catalog/design-system/layout', () => {
  it('returns 200', async () => {
    const res = await app.request('/catalog/design-system/layout')
    expect(res.status).toBe(200)
  })

  it('renders an h1 heading', async () => {
    const res = await app.request('/catalog/design-system/layout')
    const body = await res.text()
    expect(body).toContain('<h1>Layout</h1>')
  })

  it('mentions all three page layout class names', async () => {
    const res = await app.request('/catalog/design-system/layout')
    const body = await res.text()
    expect(body).toContain('l-page-content')
    expect(body).toContain('l-page-sidebar-start')
    expect(body).toContain('l-page-sidebar-end')
  })

  it('includes a Breakout tracks section', async () => {
    const res = await app.request('/catalog/design-system/layout')
    const body = await res.text()
    expect(body).toContain('Breakout tracks')
  })

  it('mentions l-switcher', async () => {
    const res = await app.request('/catalog/design-system/layout')
    const body = await res.text()
    expect(body).toContain('l-switcher')
  })
})

describe('GET /catalog/design-system (index)', () => {
  it('contains a link to /catalog/design-system/layout', async () => {
    const res = await app.request('/catalog/design-system')
    const body = await res.text()
    expect(body).toContain('/catalog/design-system/layout')
  })
})

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
