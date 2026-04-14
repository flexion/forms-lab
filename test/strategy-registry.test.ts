import { describe, expect, it } from 'bun:test'
import { StrategyRegistry } from '../src/services/strategy-registry'

interface TestService {
  doWork(): string
}

function makeEntry(
  id: string,
  status: 'baseline' | 'experimental' | 'production' = 'experimental',
) {
  return {
    id,
    metadata: {
      name: `Strategy ${id}`,
      description: `Description for ${id}`,
      status,
      courseTopics: ['evaluation'],
    },
    create: (): TestService => ({ doWork: () => `result-${id}` }),
  }
}

describe('StrategyRegistry', () => {
  it('registers and retrieves a strategy by id', () => {
    const registry = new StrategyRegistry<TestService>()
    registry.register(makeEntry('alpha'))
    const service = registry.get('alpha')
    expect(service.doWork()).toBe('result-alpha')
  })

  it('throws on unknown strategy id', () => {
    const registry = new StrategyRegistry<TestService>()
    expect(() => registry.get('missing')).toThrow('Unknown strategy: missing')
  })

  it('first registered strategy becomes the default', () => {
    const registry = new StrategyRegistry<TestService>()
    registry.register(makeEntry('first'))
    registry.register(makeEntry('second'))
    const service = registry.getDefault()
    expect(service.doWork()).toBe('result-first')
  })

  it('setDefault changes the default strategy', () => {
    const registry = new StrategyRegistry<TestService>()
    registry.register(makeEntry('first'))
    registry.register(makeEntry('second'))
    registry.setDefault('second')
    expect(registry.getDefault().doWork()).toBe('result-second')
  })

  it('setDefault throws for unknown id', () => {
    const registry = new StrategyRegistry<TestService>()
    expect(() => registry.setDefault('nope')).toThrow('Unknown strategy: nope')
  })

  it('list returns metadata for all registered strategies', () => {
    const registry = new StrategyRegistry<TestService>()
    registry.register(makeEntry('a', 'baseline'))
    registry.register(makeEntry('b', 'production'))
    const list = registry.list()
    expect(list).toHaveLength(2)
    expect(list[0].id).toBe('a')
    expect(list[0].metadata.status).toBe('baseline')
    expect(list[1].id).toBe('b')
    expect(list[1].metadata.status).toBe('production')
  })

  it('getDefaultId returns the default strategy id', () => {
    const registry = new StrategyRegistry<TestService>()
    registry.register(makeEntry('alpha'))
    registry.register(makeEntry('beta'))
    expect(registry.getDefaultId()).toBe('alpha')
  })

  it('create is called each time get is called (factory pattern)', () => {
    let callCount = 0
    const registry = new StrategyRegistry<TestService>()
    registry.register({
      id: 'counted',
      metadata: {
        name: 'Counted',
        description: '',
        status: 'experimental',
        courseTopics: [],
      },
      create: () => {
        callCount++
        return { doWork: () => 'ok' }
      },
    })
    registry.get('counted')
    registry.get('counted')
    expect(callCount).toBe(2)
  })
})
