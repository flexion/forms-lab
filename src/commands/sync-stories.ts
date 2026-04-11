import { mkdir, readdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { GitHubIssue } from '../services/deployment/github'
import {
  createGitHubClient,
  getGitHubToken,
} from '../services/deployment/github'

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function issueToMarkdown(issue: GitHubIssue): string {
  const labels = issue.labels.map((l) => l.name).join(', ')
  const milestone = issue.milestone?.title || ''

  let frontmatter = '---\n'
  frontmatter += `issue: ${issue.number}\n`
  frontmatter += `title: ${issue.title}\n`
  frontmatter += `milestone: "${milestone}"\n`
  frontmatter += `labels: [${labels}]\n`
  frontmatter += `state: ${issue.state}\n`
  frontmatter += `synced_at: ${new Date().toISOString()}\n`
  frontmatter += '---\n\n'

  return frontmatter + (issue.body || '')
}

export async function syncStoriesFromIssues(
  issues: GitHubIssue[],
  storiesDir: string,
): Promise<void> {
  await mkdir(storiesDir, { recursive: true })

  // Determine which files should exist
  const expectedFiles = new Set<string>()
  for (const issue of issues) {
    const slug = slugify(issue.title)
    const filename = `${issue.number}-${slug}.md`
    expectedFiles.add(filename)
    await writeFile(join(storiesDir, filename), issueToMarkdown(issue))
  }

  // Remove files that no longer match
  const existingFiles = await readdir(storiesDir)
  for (const file of existingFiles) {
    if (file.endsWith('.md') && !expectedFiles.has(file)) {
      await rm(join(storiesDir, file))
    }
  }
}

export async function syncStories(): Promise<number> {
  const owner = 'flexion'
  const repo = 'forms-lab'
  const label = 'user-story'
  const storiesDir = join(process.cwd(), 'catalog', 'stories')

  console.log(`Syncing stories from ${owner}/${repo}...`)

  const token = await getGitHubToken()
  if (!token) {
    console.warn('Warning: No GitHub token found. API rate limits may apply.')
  }

  const client = createGitHubClient(token)

  try {
    const issues = await client.listIssues(owner, repo, label)
    await syncStoriesFromIssues(issues, storiesDir)
    console.log(`Synced ${issues.length} stories to ${storiesDir}`)
    return 0
  } catch (err) {
    console.error('Failed to sync stories:', err)
    return 1
  }
}
