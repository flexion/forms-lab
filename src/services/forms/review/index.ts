import type { FormProjectRepo } from '../../projects'
import { createCommentsStore } from './comments'
import type { MergeOutcome, ReviewRef } from './types'

export function createReviewService(repo: FormProjectRepo) {
  const comments = createCommentsStore(repo)

  return {
    comments,

    async merge(ref: ReviewRef): Promise<MergeOutcome> {
      const result = await repo.mergeBranch(ref.slug, ref.head, ref.base)
      if (!result.ok) {
        if (result.reason === 'not-fast-forward')
          return { status: 'conflict', reason: 'not-fast-forward' }
        return { status: 'missing-branch' }
      }
      // Clean up the source branch now that its content lives on the target.
      try {
        await repo.deleteBranch(ref.slug, ref.head)
      } catch {
        // Branch deletion is best-effort; the merge already succeeded.
      }
      return { status: 'merged', sha: result.sha }
    },

    async close(ref: ReviewRef): Promise<void> {
      await repo.deleteBranch(ref.slug, ref.head)
    },

    async changedFiles(ref: ReviewRef): Promise<string[]> {
      return repo.getBranchDiff(ref.slug, ref.base, ref.head)
    },
  }
}

export type ReviewService = ReturnType<typeof createReviewService>
export type { Comment, MergeOutcome, ReviewRef } from './types'
