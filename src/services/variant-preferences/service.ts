import type { VariantRegistry } from '../strategy-registry'
import { TASKS, type Task, type VariantPreferencesGateway } from './types'

export interface VariantPreferencesService {
  get(userLogin: string, task: Task): string | null
  set(userLogin: string, task: Task, variantId: string): void
  list(userLogin: string): Record<Task, string | null>
}

export type TaskRegistries = {
  [K in Task]: VariantRegistry<unknown>
}

export function createVariantPreferencesService(
  gateway: VariantPreferencesGateway,
  registries: TaskRegistries,
): VariantPreferencesService {
  function defaultFor(task: Task): string | null {
    const registry = registries[task]
    if (registry.list().length === 0) return null
    return registry.getDefaultId()
  }

  function variantExists(task: Task, variantId: string): boolean {
    return registries[task].list().some((v) => v.id === variantId)
  }

  function ensureVariantExists(task: Task, variantId: string): void {
    if (!variantExists(task, variantId)) {
      const ids = registries[task].list().map((v) => v.id)
      throw new Error(
        `Unknown variant '${variantId}' for task '${task}'. Known: ${ids.join(', ') || '(none)'}`,
      )
    }
  }

  return {
    get(userLogin, task) {
      const stored = gateway.get(userLogin, task)
      if (stored && variantExists(task, stored.variantId)) {
        return stored.variantId
      }
      return defaultFor(task)
    },
    set(userLogin, task, variantId) {
      ensureVariantExists(task, variantId)
      gateway.set(userLogin, task, variantId)
    },
    list(userLogin) {
      const stored = new Map(
        gateway.listByUser(userLogin).map((p) => [p.task, p.variantId]),
      )
      const out = {} as Record<Task, string | null>
      for (const task of TASKS) {
        const override = stored.get(task)
        out[task] =
          override && variantExists(task, override)
            ? override
            : defaultFor(task)
      }
      return out
    },
  }
}
