import { meta as accordion } from './components/flex-accordion/meta'
import { meta as alert } from './components/flex-alert/meta'
import { meta as banner } from './components/flex-banner/meta'
import { meta as branchSwitcher } from './components/flex-branch-switcher/meta'
import { meta as breadcrumb } from './components/flex-breadcrumb/meta'
import { meta as button } from './components/flex-button/meta'
import { meta as buttonGroup } from './components/flex-button-group/meta'
import { meta as card } from './components/flex-card/meta'
import { meta as changeIndicator } from './components/flex-change-indicator/meta'
import { meta as characterCount } from './components/flex-character-count/meta'
import { meta as checkbox } from './components/flex-checkbox/meta'
import { meta as collection } from './components/flex-collection/meta'
import { meta as comboBox } from './components/flex-combo-box/meta'
import { meta as confidenceBadge } from './components/flex-confidence-badge/meta'
import { meta as datePicker } from './components/flex-date-picker/meta'
import { meta as dateRangePicker } from './components/flex-date-range-picker/meta'
import { meta as errorMessage } from './components/flex-error-message/meta'
import { meta as fileInput } from './components/flex-file-input/meta'
import { meta as footer } from './components/flex-footer/meta'
import { meta as form } from './components/flex-form/meta'
import { meta as header } from './components/flex-header/meta'
import { meta as icon } from './components/flex-icon/meta'
import { meta as identifier } from './components/flex-identifier/meta'
import { meta as inPageNav } from './components/flex-in-page-nav/meta'
import { meta as inputMask } from './components/flex-input-mask/meta'
import { meta as inputPrefixSuffix } from './components/flex-input-prefix-suffix/meta'
import { meta as label } from './components/flex-label/meta'
import { meta as languageSelector } from './components/flex-language-selector/meta'
import { meta as link } from './components/flex-link/meta'
import { meta as list } from './components/flex-list/meta'
import { meta as memorableDate } from './components/flex-memorable-date/meta'
import { meta as modal } from './components/flex-modal/meta'
import { meta as pagination } from './components/flex-pagination/meta'
import { meta as previewBanner } from './components/flex-preview-banner/meta'
import { meta as processList } from './components/flex-process-list/meta'
import { meta as prose } from './components/flex-prose/meta'
import { meta as radio } from './components/flex-radio/meta'
import { meta as rangeSlider } from './components/flex-range-slider/meta'
import { meta as search } from './components/flex-search/meta'
import { meta as select } from './components/flex-select/meta'
import { meta as semanticDiff } from './components/flex-semantic-diff/meta'
import { meta as sideNavigation } from './components/flex-side-navigation/meta'
import { meta as siteAlert } from './components/flex-site-alert/meta'
import { meta as specBrowser } from './components/flex-spec-browser/meta'
import { meta as specDiffBrowser } from './components/flex-spec-diff-browser/meta'
import { meta as stepIndicator } from './components/flex-step-indicator/meta'
import { meta as summaryBox } from './components/flex-summary-box/meta'
import { meta as tabGroup } from './components/flex-tab-group/meta'
import { meta as table } from './components/flex-table/meta'
import { meta as tag } from './components/flex-tag/meta'
import { meta as textInput } from './components/flex-text-input/meta'
import { meta as textarea } from './components/flex-textarea/meta'
import { meta as timePicker } from './components/flex-time-picker/meta'
import { meta as tooltip } from './components/flex-tooltip/meta'
import { meta as validation } from './components/flex-validation/meta'
import { meta as variantCallout } from './components/flex-variant-callout/meta'
import type { ComponentMeta } from './types'

const components: ComponentMeta[] = [
  accordion,
  alert,
  banner,
  branchSwitcher,
  breadcrumb,
  button,
  buttonGroup,
  card,
  changeIndicator,
  characterCount,
  checkbox,
  collection,
  comboBox,
  confidenceBadge,
  datePicker,
  dateRangePicker,
  errorMessage,
  fileInput,
  footer,
  header,
  form,
  icon,
  identifier,
  inPageNav,
  inputMask,
  inputPrefixSuffix,
  label,
  languageSelector,
  link,
  list,
  memorableDate,
  modal,
  pagination,
  previewBanner,
  processList,
  prose,
  radio,
  rangeSlider,
  search,
  select,
  semanticDiff,
  sideNavigation,
  siteAlert,
  specBrowser,
  specDiffBrowser,
  stepIndicator,
  summaryBox,
  table,
  tabGroup,
  tag,
  textInput,
  timePicker,
  textarea,
  tooltip,
  validation,
  variantCallout,
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
