import { expect, test } from 'bun:test'
import type {
  Task,
  VariantPreference,
  VariantPreferencesGateway,
} from '../../src/services/variant-preferences'
import { createVariantPreferencesService } from '../../src/services/variant-preferences'
import { StrategyRegistry } from '../../src/shared/strategy-registry'

function inMemoryGateway(): VariantPreferencesGateway {
  const entries = new Map<string, VariantPreference>()
  const key = (user: string, task: Task) => `${user}:${task}`
  return {
    get(user, task) {
      return entries.get(key(user, task)) ?? null
    },
    set(user, task, variantId) {
      const pref: VariantPreference = {
        userLogin: user,
        task,
        variantId,
        updatedAt: 0,
      }
      entries.set(key(user, task), pref)
      return pref
    },
    listByUser(user) {
      return [...entries.values()].filter((p) => p.userLogin === user)
    },
  }
}

function registriesWithExtraction() {
  const extraction = new StrategyRegistry<{ id: string }>()
  extraction.register({
    id: 'opus',
    metadata: {
      name: 'Opus',
      description: '',
      status: 'baseline',
      courseTopics: [],
    },
    create: () => ({ id: 'opus' }),
  })
  extraction.register({
    id: 'sonnet',
    metadata: {
      name: 'Sonnet',
      description: '',
      status: 'production',
      courseTopics: [],
    },
    create: () => ({ id: 'sonnet' }),
  })
  extraction.setDefault('sonnet')
  return {
    extraction,
    shaping: new StrategyRegistry<unknown>(),
    filling: new StrategyRegistry<unknown>(),
    'field-mapping': new StrategyRegistry<unknown>(),
    'authoring-criteria': new StrategyRegistry<unknown>(),
    'authoring-structure': new StrategyRegistry<unknown>(),
    'authoring-generation': new StrategyRegistry<unknown>(),
  }
}

test('get returns registry default when no preference set', () => {
  const service = createVariantPreferencesService(
    inMemoryGateway(),
    registriesWithExtraction(),
  )
  expect(service.get('alice', 'extraction')).toBe('sonnet')
})

test('get returns stored preference when set', () => {
  const service = createVariantPreferencesService(
    inMemoryGateway(),
    registriesWithExtraction(),
  )
  service.set('alice', 'extraction', 'opus')
  expect(service.get('alice', 'extraction')).toBe('opus')
})

test('set rejects unknown variantId for task', () => {
  const service = createVariantPreferencesService(
    inMemoryGateway(),
    registriesWithExtraction(),
  )
  expect(() => service.set('alice', 'extraction', 'nonexistent')).toThrow(
    /unknown variant/i,
  )
})

test('list returns per-task defaults when unset, overrides when set', () => {
  const service = createVariantPreferencesService(
    inMemoryGateway(),
    registriesWithExtraction(),
  )
  service.set('alice', 'extraction', 'opus')
  const all = service.list('alice')
  expect(all.extraction).toBe('opus')
  expect(all.shaping).toBeNull()
  expect(all.filling).toBeNull()
  expect(all['field-mapping']).toBeNull()
})

test('get returns registry default when stored variantId no longer exists in registry', () => {
  // Store a preference for 'haiku' directly through the gateway so it
  // bypasses the service's set-time validation — simulates a variant that
  // was valid at save time but has since been removed or renamed.
  const gateway = inMemoryGateway()
  gateway.set('alice', 'extraction', 'haiku')

  const service = createVariantPreferencesService(
    gateway,
    registriesWithExtraction(),
  )
  expect(service.get('alice', 'extraction')).toBe('sonnet')
})

test('list returns default for stale stored preferences', () => {
  const gateway = inMemoryGateway()
  gateway.set('alice', 'extraction', 'haiku')

  const service = createVariantPreferencesService(
    gateway,
    registriesWithExtraction(),
  )
  const all = service.list('alice')
  expect(all.extraction).toBe('sonnet')
})
