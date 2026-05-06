import type { Command, ProjectState } from './commands'

export interface FormShaper {
  shape(request: ShapingRequest): Promise<ShapingResult>
}

export interface ShapingRequest {
  intent: string
  state: ProjectState
  previousAttempt?: { commands: Command[]; feedback: string }
  /** User login for activity tracking. */
  userId?: string
  /** Project identifier for activity tracking. */
  projectId?: string
}

export interface ShapingResult {
  commands: Command[]
  explanation: string
}
