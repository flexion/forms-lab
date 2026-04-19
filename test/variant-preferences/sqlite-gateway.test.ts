import { expect, test } from 'bun:test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createVariantPreferencesGateway } from '../../src/services/variant-preferences/sqlite-gateway'

function createGateway() {
  const dir = mkdtempSync(join(tmpdir(), 'variant-prefs-'))
  return createVariantPreferencesGateway(join(dir, 'test.sqlite'))
}

test('get returns null when no preference is set', () => {
  const gateway = createGateway()
  expect(gateway.get('alice', 'extraction')).toBeNull()
})

test('set stores and get retrieves a preference', () => {
  const gateway = createGateway()
  const stored = gateway.set('alice', 'extraction', 'haiku')
  expect(stored.userLogin).toBe('alice')
  expect(stored.task).toBe('extraction')
  expect(stored.variantId).toBe('haiku')
  expect(gateway.get('alice', 'extraction')?.variantId).toBe('haiku')
})

test('set overwrites an existing preference', () => {
  const gateway = createGateway()
  gateway.set('alice', 'extraction', 'haiku')
  gateway.set('alice', 'extraction', 'opus-baseline')
  expect(gateway.get('alice', 'extraction')?.variantId).toBe('opus-baseline')
})

test('listByUser returns all task preferences for a user', () => {
  const gateway = createGateway()
  gateway.set('alice', 'extraction', 'haiku')
  gateway.set('alice', 'shaping', 'bedrock-sonnet')
  gateway.set('bob', 'extraction', 'opus-baseline')
  const alicePrefs = gateway.listByUser('alice')
  expect(alicePrefs).toHaveLength(2)
  const tasks = alicePrefs.map((p) => p.task).sort()
  expect(tasks).toEqual(['extraction', 'shaping'])
})
