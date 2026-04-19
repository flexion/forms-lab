// Public interface for the content service.
// External imports (other services, entrypoints, design-system) MUST come
// through this file. Enforced by test/architecture/dependency-rule.test.ts.

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
