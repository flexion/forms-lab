import type { Submission, SubmissionGateway } from './types'

export class InMemorySubmissionGateway implements SubmissionGateway {
  private submissions = new Map<string, Submission>()

  save(submission: Submission): void {
    this.submissions.set(submission.id, submission)
  }

  getSubmission(id: string): Submission | null {
    return this.submissions.get(id) ?? null
  }
}
