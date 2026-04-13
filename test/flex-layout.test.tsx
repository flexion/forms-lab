import { describe, expect, it } from 'bun:test'
import { Layout } from '../src/design-system/components/flex-layout'
import type { SessionUser } from '../src/services/auth/session'

describe('Layout with auth', () => {
  it('renders a profile dropdown menu when signed in', () => {
    const user: SessionUser = {
      login: 'testuser',
      name: 'Test User',
      avatarUrl: 'https://example.com/avatar.png',
    }

    const result = Layout({
      currentPath: '/',
      user,
      children: <p>Content</p>,
    })
    const html = result?.toString() ?? ''

    // Trigger button
    expect(html).toContain('data-header-user-menu')
    expect(html).toContain('class="flex-header__user-trigger"')
    expect(html).toContain('aria-haspopup="menu"')
    expect(html).toContain('aria-expanded="false"')
    expect(html).toContain('aria-controls="header-user-menu"')
    expect(html).toContain('https://example.com/avatar.png')

    // Panel (hidden by default)
    expect(html).toMatch(
      /id="header-user-menu"[^>]*hidden|hidden[^>]*id="header-user-menu"/,
    )
    expect(html).toContain('Test User')
    expect(html).toContain('@testuser')
    expect(html).toContain('Sign out')
    expect(html).toContain('action="/auth/signout"')

    // Theme toggle is inside the panel, not a separate header widget
    expect(html).toContain('flex-header__user-theme')

    // Old ad-hoc classes are gone
    expect(html).not.toContain('flex-header__user-info')
    expect(html).not.toContain('flex-header__signout-btn')
  })

  it('renders inline theme toggle when signed out', () => {
    const result = Layout({
      currentPath: '/',
      children: <p>Content</p>,
    })
    const html = result?.toString() ?? ''

    expect(html).toContain('Sign in')
    expect(html).toContain('/auth/signin')
    // Theme toggle is present inline (not inside a user panel)
    expect(html).toContain('data-theme-toggle')
    expect(html).not.toContain('data-header-user-menu')
  })
})

describe('Layout sidebar', () => {
  it('wraps sidebar in a details/summary toggle', () => {
    const result = Layout({
      currentPath: '/catalog',
      sidebar: <nav>sidebar content</nav>,
      children: <p>Main</p>,
    })
    const html = result?.toString() ?? ''

    expect(html).toContain('<details class="catalog-nav-toggle"')
    expect(html).toContain('<summary>')
    expect(html).toContain('open')
  })

  it('includes resize script for sidebar toggle', () => {
    const result = Layout({
      currentPath: '/catalog',
      sidebar: <nav>sidebar content</nav>,
      children: <p>Main</p>,
    })
    const html = result?.toString() ?? ''

    expect(html).toContain('addEventListener')
    expect(html).toContain('resize')
    expect(html).toContain('catalog-nav-toggle')
  })
})

describe('Layout — catalog shell uses l-page-sidebar-start', () => {
  it('emits l-page-sidebar-start on the catalog wrapper when a sidebar is provided', () => {
    const result = Layout({
      title: 'Test',
      sidebar: <nav data-testid="nav">nav</nav>,
      currentPath: '/catalog',
      children: <p>Body</p>,
    })
    const html = result?.toString() ?? ''

    expect(html).toContain('class="l-page-sidebar-start"')
    expect(html).toContain('l-page-sidebar')
    expect(html).toContain('catalog-sidebar')
    expect(html).toContain('class="l-page-main"')
    expect(html).not.toContain('class="catalog-layout"')
  })
})

describe('Layout — non-sidebar shell uses l-page-content', () => {
  it('emits l-page-content on the main element when no sidebar is provided', () => {
    const html = (
      <Layout title="Test" currentPath="/">
        <p>Body</p>
      </Layout>
    ).toString()

    expect(html).toContain('<main class="l-page-content">')
    expect(html).not.toContain('class="l-center"')
  })
})
