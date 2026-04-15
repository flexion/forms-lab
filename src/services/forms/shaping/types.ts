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
