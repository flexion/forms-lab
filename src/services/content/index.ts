// Public interface for the content service.
// External imports (other services, entrypoints, design-system) MUST come
// through this file. Enforced by test/architecture/dependency-rule.test.ts.

export type { PermalinkOptions } from './github-permalink'
export { githubPermalink } from './github-permalink'
export type { RenderOptions } from './markdown'
export {
  parseMarkdown,
  readMarkdownDir,
  renderMarkdown,
} from './markdown'

export type {
  ArchitectureDoc,
  Decision,
  MarkdownFile,
  Persona,
  Story,
  WalkthroughPage,
} from './types'
