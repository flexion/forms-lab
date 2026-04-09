import type { FC } from 'hono/jsx'
import { LanguageSelector, LanguageSelectorTwo } from './index'

export const TwoLanguage: FC = () => (
  <LanguageSelectorTwo href="/es" label="Espa\u00f1ol" lang="es" />
)

export const MultiLanguage: FC = () => (
  <LanguageSelector
    buttonLabel="Languages"
    languages={[
      { href: '/es', label: 'Espa\u00f1ol', lang: 'es' },
      { href: '/fr', label: 'Fran\u00e7ais', lang: 'fr' },
      { href: '/zh', label: '\u4e2d\u6587', lang: 'zh' },
    ]}
  />
)

export const AllVariants: FC = () => (
  <div style="display: flex; flex-direction: column; gap: 24px;">
    <div>
      <h3>Two-language toggle</h3>
      <TwoLanguage />
    </div>
    <div>
      <h3>Multi-language dropdown</h3>
      <MultiLanguage />
    </div>
  </div>
)
