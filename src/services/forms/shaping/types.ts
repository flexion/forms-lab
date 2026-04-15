import type { Command, ProjectState } from './commands'

export interface FormShaper {
  shape(request: ShapingRequest): Promise<ShapingResult>
}

export interface ShapingRequest {
  intent: string
  state: ProjectState
  previousAttempt?: { commands: Command[]; feedback: string }
}

export interface ShapingResult {
  commands: Command[]
  explanation: string
}

// Keep for now — to be deleted in Task 11
export interface PageDiff {
  id: string
  title: string
  status: 'added' | 'removed' | 'moved' | 'modified' | 'unchanged'
  details?: string
}

// Keep for now — to be deleted in Task 11
export interface FormSpecDiff {
  summary: string
  pages: PageDiff[]
  hasChanges: boolean
}
