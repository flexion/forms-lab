import { Hono } from 'hono'
import { Layout } from '../../../../design-system/components/flex-layout'
import type { AccessStore } from '../../../../services/auth'
import type {
  TaskRegistries,
  VariantPreferencesService,
} from '../../../../services/variant-preferences'
import { isTask, TASKS } from '../../../../services/variant-preferences'
import { resolveUrl } from '../../../../shared/base-path'
import { requireAuth } from '../../middleware/auth'
import { VariantPickerPage } from './components'

export interface SettingsRoutesDeps {
  preferences: VariantPreferencesService
  registries: TaskRegistries
  accessStore?: AccessStore
}

export function createSettingsRoutes(deps: SettingsRoutesDeps): Hono {
  const app = new Hono()
  app.use('*', requireAuth(deps.accessStore))

  app.get('/variants', (c) => {
    const user = c.get('user')
    if (!user) return c.redirect(resolveUrl('/auth/signin'))
    const highlight = c.req.query('task')
    const saved = c.req.query('saved') === '1'
    const selections = deps.preferences.list(user.login)
    return c.html(
      <Layout currentSection="projects" user={user}>
        <VariantPickerPage
          registries={deps.registries}
          selections={selections}
          highlightTask={isTask(highlight) ? highlight : undefined}
          saved={saved}
        />
      </Layout>,
    )
  })

  app.post('/variants', async (c) => {
    const user = c.get('user')
    if (!user) return c.redirect(resolveUrl('/auth/signin'))
    const body = await c.req.parseBody()
    for (const task of TASKS) {
      const raw = body[`variant__${task}`]
      if (typeof raw !== 'string' || raw.length === 0) continue
      const ids = deps.registries[task].list().map((v) => v.id)
      if (!ids.includes(raw)) continue
      deps.preferences.set(user.login, task, raw)
    }
    return c.redirect(resolveUrl('/settings/variants?saved=1'))
  })

  return app
}
