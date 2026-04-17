export interface Comment {
  id: string
  author: string
  timestamp: string
  body: string
  parentId?: string
}

export interface CommentsFile {
  comments: Comment[]
}

export interface ReviewRef {
  owner: string
  slug: string
  base: string
  head: string
}

export type MergeOutcome =
  | { status: 'merged'; sha: string }
  | { status: 'conflict'; reason: 'not-fast-forward' }
  | { status: 'missing-branch' }
