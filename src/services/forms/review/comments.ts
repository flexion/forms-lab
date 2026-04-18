import type { FormProjectRepo } from '../../form-project-repo'
import type { Comment, CommentsFile, ReviewRef } from './types'

function commentsPath(ref: ReviewRef): string {
  return `reviews/${ref.base}---${ref.head}/comments.json`
}

export function createCommentsStore(repo: FormProjectRepo) {
  async function load(ref: ReviewRef): Promise<CommentsFile> {
    const buf = await repo.readFile(ref.slug, ref.head, commentsPath(ref))
    if (!buf) return { comments: [] }
    return JSON.parse(buf.toString()) as CommentsFile
  }

  return {
    async list(ref: ReviewRef): Promise<Comment[]> {
      const file = await load(ref)
      return file.comments
    },

    async add(
      ref: ReviewRef,
      input: { body: string; author: string; parentId?: string },
    ): Promise<Comment> {
      const file = await load(ref)
      const comment: Comment = {
        id: crypto.randomUUID(),
        author: input.author,
        timestamp: new Date().toISOString(),
        body: input.body,
        parentId: input.parentId,
      }
      const next: CommentsFile = { comments: [...file.comments, comment] }
      await repo.commit(
        ref.slug,
        [
          {
            path: commentsPath(ref),
            content: Buffer.from(JSON.stringify(next, null, 2)),
          },
        ],
        `comment: ${input.author}`,
        input.author,
        { branch: ref.head },
      )
      return comment
    },
  }
}

export type CommentsStore = ReturnType<typeof createCommentsStore>
