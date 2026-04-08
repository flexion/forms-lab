import { meta as accordion } from './flex-accordion/meta'
import { meta as alert } from './flex-alert/meta'
import { meta as banner } from './flex-banner/meta'
import { meta as breadcrumb } from './flex-breadcrumb/meta'
import { meta as button } from './flex-button/meta'
import { meta as buttonGroup } from './flex-button-group/meta'
import { meta as card } from './flex-card/meta'
import { meta as characterCount } from './flex-character-count/meta'
import { meta as checkbox } from './flex-checkbox/meta'
import { meta as collection } from './flex-collection/meta'
import { meta as errorMessage } from './flex-error-message/meta'
import { meta as footer } from './flex-footer/meta'
import { meta as form } from './flex-form/meta'
import { meta as icon } from './flex-icon/meta'
import { meta as identifier } from './flex-identifier/meta'
import { meta as inputMask } from './flex-input-mask/meta'
import { meta as inputPrefixSuffix } from './flex-input-prefix-suffix/meta'
import { meta as label } from './flex-label/meta'
import { meta as link } from './flex-link/meta'
import { meta as list } from './flex-list/meta'
import { meta as memorableDate } from './flex-memorable-date/meta'
import { meta as pagination } from './flex-pagination/meta'
import { meta as processList } from './flex-process-list/meta'
import { meta as prose } from './flex-prose/meta'
import { meta as radio } from './flex-radio/meta'
import { meta as rangeSlider } from './flex-range-slider/meta'
import { meta as search } from './flex-search/meta'
import { meta as select } from './flex-select/meta'
import { meta as sideNavigation } from './flex-side-navigation/meta'
import { meta as siteAlert } from './flex-site-alert/meta'
import { meta as stepIndicator } from './flex-step-indicator/meta'
import { meta as summaryBox } from './flex-summary-box/meta'
import { meta as table } from './flex-table/meta'
import { meta as tag } from './flex-tag/meta'
import { meta as textInput } from './flex-text-input/meta'
import { meta as textarea } from './flex-textarea/meta'
import { meta as validation } from './flex-validation/meta'
import type { ComponentMeta } from './types'

const components: ComponentMeta[] = [
  accordion,
  alert,
  banner,
  breadcrumb,
  button,
  buttonGroup,
  card,
  characterCount,
  checkbox,
  collection,
  errorMessage,
  footer,
  form,
  icon,
  identifier,
  inputMask,
  inputPrefixSuffix,
  label,
  link,
  list,
  memorableDate,
  pagination,
  processList,
  prose,
  radio,
  rangeSlider,
  search,
  select,
  sideNavigation,
  siteAlert,
  stepIndicator,
  summaryBox,
  table,
  tag,
  textInput,
  textarea,
  validation,
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
