import { describe, expect, it } from 'bun:test'
import { Layout } from '../src/app/components/flex-layout'
import type { SessionUser } from '../src/lib/session'

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
