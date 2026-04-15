/**
 * Content domain types — content rendering and catalog entities
 */

export interface MarkdownFile {
  frontmatter: Record<string, string>
  content: string
}

export interface Persona {
  id: string
  name: string
  role: string
  description: string
  needs: string[]
  content: string
}

export interface Decision {
  slug: string
  group: string
  title: string
  status: string
  tags: string[]
  decided: string
  content: string
}

export interface ArchitectureDoc {
  slug: string
  title: string
  status: string
  tags: string[]
  content: string
}

export interface Story {
  slug: string
  issue: number
  title: string
  milestone: string
  labels: string[]
  state: string
  syncedAt: string
  content: string
}

export interface WalkthroughPage {
  slug: string
  title: string
  order: number
  rubric: string[]
  timing: string
  audience: string[]
  content: string
}
