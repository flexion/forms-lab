export const TASKS = [
  'extraction',
  'shaping',
  'filling',
  'field-mapping',
] as const
export type Task = (typeof TASKS)[number]

export function isTask(value: unknown): value is Task {
  return (
    typeof value === 'string' && (TASKS as readonly string[]).includes(value)
  )
}

export interface VariantPreference {
  userLogin: string
  task: Task
  variantId: string
  updatedAt: number
}

export interface VariantPreferencesGateway {
  get(userLogin: string, task: Task): VariantPreference | null
  set(userLogin: string, task: Task, variantId: string): VariantPreference
  listByUser(userLogin: string): VariantPreference[]
}
