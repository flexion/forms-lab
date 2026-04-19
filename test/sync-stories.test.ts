import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { mkdir, readdir, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { syncStoriesFromIssues } from '../src/entrypoints/cli/commands/sync-stories'
import type { GitHubIssue } from '../src/services/deployment'

const testDir = join(import.meta.dir, '__fixtures__', 'stories')

const fakeIssues: GitHubIssue[] = [
  {
    number: 2,
    title: 'Maya signs in to access form authoring',
    body: '## User Story\n\nAs a form creator...',
    state: 'open',
    labels: [{ name: 'user-story' }, { name: 'authentication' }],
    milestone: { title: 'Slice 1: Maya Signs In' },
  },
  {
    number: 3,
    title: 'Maya uploads a PDF and reviews the extracted specs',
    body: '## User Story\n\nAs a form creator...',
    state: 'open',
    labels: [{ name: 'user-story' }, { name: 'llm-integration' }],
    milestone: { title: 'Slice 2: Maya Uploads PDF' },
  },
]

describe('syncStoriesFromIssues', () => {
  beforeEach(async () => {
    await mkdir(testDir, { recursive: true })
  })

  afterEach(async () => {
    await rm(testDir, { recursive: true })
  })

  it('writes story files from issues', async () => {
    await syncStoriesFromIssues(fakeIssues, testDir)

    const files = await readdir(testDir)
    expect(files).toContain('2-maya-signs-in-to-access-form-authoring.md')
    expect(files).toContain(
      '3-maya-uploads-a-pdf-and-reviews-the-extracted-specs.md',
    )
  })

  it('includes correct frontmatter', async () => {
    await syncStoriesFromIssues(fakeIssues, testDir)

    const content = await readFile(
      join(testDir, '2-maya-signs-in-to-access-form-authoring.md'),
      'utf-8',
    )
    expect(content).toContain('issue: 2')
    expect(content).toContain('title: Maya signs in to access form authoring')
    expect(content).toContain('milestone: "Slice 1: Maya Signs In"')
    expect(content).toContain('state: open')
    expect(content).toContain('labels: [user-story, authentication]')
  })

  it('includes issue body as content', async () => {
    await syncStoriesFromIssues(fakeIssues, testDir)

    const content = await readFile(
      join(testDir, '2-maya-signs-in-to-access-form-authoring.md'),
      'utf-8',
    )
    expect(content).toContain('As a form creator...')
  })

  it('removes files for issues no longer matching', async () => {
    const { writeFile } = await import('node:fs/promises')
    await writeFile(join(testDir, '99-old-story.md'), 'old content')

    await syncStoriesFromIssues(fakeIssues, testDir)

    const files = await readdir(testDir)
    expect(files).not.toContain('99-old-story.md')
  })
})
