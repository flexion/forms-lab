import type { Command, ProjectState } from './commands'
import { type BatchResult, executeBatch } from './executor'

export function project(state: ProjectState, commands: Command[]): BatchResult {
  return executeBatch(state, commands)
}
