import { expect, test } from 'bun:test'
import { Layout } from '../../src/design-system/components/flex-layout'

async function render(element: unknown): Promise<string> {
  return String(await element)
}

const testUser = {
  login: 'testuser',
  name: 'Test User',
  avatarUrl: 'https://example.com/avatar.png',
}

test('currentSection="forms" highlights Forms nav item', async () => {
  const html = await render(
    Layout({ currentSection: 'forms', user: testUser, children: 'content' }),
  )
  // The Forms link should have aria-current="page"
  expect(html).toContain('aria-current="page"')
  // Extract the Forms nav link specifically
  const formsLinkMatch = html.match(/<a[^>]*href="[^"]*\/forms"[^>]*>/)
  expect(formsLinkMatch).not.toBeNull()
  expect(formsLinkMatch?.[0]).toContain('aria-current="page"')
})

test('currentSection="home" highlights Home nav item', async () => {
  const html = await render(
    Layout({ currentSection: 'home', user: testUser, children: 'content' }),
  )
  const homeLinkMatch = html.match(
    /<a[^>]*href="\/"[^>]*class="flex-header__nav-link[^"]*"[^>]*>/,
  )
  expect(homeLinkMatch).not.toBeNull()
  expect(homeLinkMatch?.[0]).toContain('aria-current="page"')
})

test('currentSection="projects" highlights Projects nav item', async () => {
  const html = await render(
    Layout({
      currentSection: 'projects',
      user: testUser,
      children: 'content',
    }),
  )
  const projectsLinkMatch = html.match(/<a[^>]*href="[^"]*\/projects"[^>]*>/)
  expect(projectsLinkMatch).not.toBeNull()
  expect(projectsLinkMatch?.[0]).toContain('aria-current="page"')
})

test('currentSection="catalog" highlights Catalog nav item', async () => {
  const html = await render(
    Layout({ currentSection: 'catalog', user: testUser, children: 'content' }),
  )
  const catalogLinkMatch = html.match(/<a[^>]*href="[^"]*\/catalog"[^>]*>/)
  expect(catalogLinkMatch).not.toBeNull()
  expect(catalogLinkMatch?.[0]).toContain('aria-current="page"')
})

test('no section set means no nav item is highlighted', async () => {
  const html = await render(Layout({ user: testUser, children: 'content' }))
  expect(html).not.toContain('aria-current="page"')
})
