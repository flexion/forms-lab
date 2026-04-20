import { expect, test } from 'bun:test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Hono } from 'hono'
import { sessionReader } from '../../src/entrypoints/app/middleware/auth'
import { createSettingsRoutes } from '../../src/entrypoints/app/routes/settings/index'
import { COOKIE_NAME, encryptSession } from '../../src/services/auth'
import type { Task } from '../../src/services/variant-preferences'
import {
  createVariantPreferencesGateway,
  createVariantPreferencesService,
} from '../../src/services/variant-preferences'
import { StrategyRegistry } from '../../src/shared/strategy-registry'

const SESSION_SECRET = 'test-secret-test-secret-test-secret'

function buildRegistries(): Record<Task, StrategyRegistry<unknown>> {
  const extraction = new StrategyRegistry<unknown>()
  extraction.register({
    id: 'sonnet',
    metadata: {
      name: 'Claude Sonnet 4',
      description: 'default',
      status: 'production',
      courseTopics: [],
      catalogPath: '/catalog/experiments/pdf-field-extraction/sonnet',
    },
    create: () => ({}),
  })
  extraction.register({
    id: 'haiku',
    metadata: {
      name: 'Claude Haiku 4.5',
      description: 'fast',
      status: 'experimental',
      courseTopics: [],
    },
    create: () => ({}),
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

function buildApp() {
  process.env.SESSION_SECRET = SESSION_SECRET
  const dir = mkdtempSync(join(tmpdir(), 'settings-variants-'))
  const gateway = createVariantPreferencesGateway(join(dir, 'prefs.sqlite'))
  const registries = buildRegistries()
  const preferences = createVariantPreferencesService(gateway, registries)

  const app = new Hono()
  app.use('*', sessionReader())
  app.route('/settings', createSettingsRoutes({ preferences, registries }))
  return { app, preferences }
}

async function signedInHeaders(login: string): Promise<Headers> {
  const cookie = await encryptSession(
    { login, name: 'Test', avatarUrl: '' },
    SESSION_SECRET,
  )
  return new Headers({ Cookie: `${COOKIE_NAME}=${cookie}` })
}

test('GET /settings/variants redirects unauthenticated users to signin', async () => {
  const { app } = buildApp()
  const res = await app.request('/settings/variants')
  expect(res.status).toBe(302)
  expect(res.headers.get('location')).toContain('/auth/signin')
})

test('GET /settings/variants renders extraction section for authed user', async () => {
  const { app } = buildApp()
  const res = await app.request('/settings/variants', {
    headers: await signedInHeaders('alice'),
  })
  expect(res.status).toBe(200)
  const html = await res.text()
  expect(html).toContain('Extraction')
  expect(html).toContain('Claude Sonnet 4')
  expect(html).toContain('Claude Haiku 4.5')
  expect(html).toContain('/catalog/experiments/pdf-field-extraction/sonnet')
  expect(html).toContain('No variants yet — available in a later release.')
})

test('POST /settings/variants persists valid selection', async () => {
  const { app, preferences } = buildApp()
  const body = new URLSearchParams({ variant__extraction: 'haiku' })
  const res = await app.request('/settings/variants', {
    method: 'POST',
    body,
    headers: {
      ...Object.fromEntries((await signedInHeaders('alice')).entries()),
      'content-type': 'application/x-www-form-urlencoded',
    },
  })
  expect(res.status).toBe(302)
  expect(res.headers.get('location')).toContain('/settings/variants?saved=1')
  expect(preferences.get('alice', 'extraction')).toBe('haiku')
})

test('POST /settings/variants ignores unknown variantId', async () => {
  const { app, preferences } = buildApp()
  const body = new URLSearchParams({ variant__extraction: 'bogus' })
  const res = await app.request('/settings/variants', {
    method: 'POST',
    body,
    headers: {
      ...Object.fromEntries((await signedInHeaders('alice')).entries()),
      'content-type': 'application/x-www-form-urlencoded',
    },
  })
  expect(res.status).toBe(302)
  expect(preferences.get('alice', 'extraction')).toBe('sonnet')
})
