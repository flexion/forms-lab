import { describe, expect, it } from 'bun:test'
import { Layout } from '../src/design-system/components/flex-layout'
import type { SessionUser } from '../src/services/auth/session'

describe('Layout with auth', () => {
  it('renders sign-in link when no user', () => {
    const result = Layout({
      currentPath: '/',
      children: <p>Content</p>,
    })
    const html = result?.toString() ?? ''

    expect(html).toContain('Sign in')
    expect(html).toContain('/auth/signin')
  })

  it('renders user identity when signed in', () => {
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

    expect(html).toContain('Test User')
    expect(html).toContain('https://example.com/avatar.png')
    expect(html).toContain('Sign out')
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
