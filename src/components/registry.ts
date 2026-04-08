import { meta as accordion } from './flex-accordion/meta'
import { meta as alert } from './flex-alert/meta'
import { meta as icon } from './flex-icon/meta'
import { meta as button } from './flex-button/meta'
import { meta as errorMessage } from './flex-error-message/meta'
import { meta as label } from './flex-label/meta'
import { meta as textInput } from './flex-text-input/meta'
import { meta as textarea } from './flex-textarea/meta'
import type { ComponentMeta } from './types'

const components: ComponentMeta[] = [
  accordion,
  alert,
  button,
  errorMessage,
  icon,
  label,
  textInput,
  textarea,
]

export function getComponents(): ComponentMeta[] {
  return components
}

export function getComponentBySlug(slug: string): ComponentMeta | undefined {
  return components.find((c) => c.slug === slug)
}

export function getComponentsByCategory(): Record<string, ComponentMeta[]> {
  const grouped: Record<string, ComponentMeta[]> = {}
  for (const component of components) {
    if (!grouped[component.category]) {
      grouped[component.category] = []
    }
    grouped[component.category].push(component)
  }
  return grouped
}
