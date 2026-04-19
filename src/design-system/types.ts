import type { ComponentKind } from './contract/types'

export type ComponentCategory =
  | 'form'
  | 'action'
  | 'feedback'
  | 'navigation'
  | 'layout'
  | 'process'
  | 'identity'

export interface ComponentMeta {
  name: string
  slug: string
  category: ComponentCategory
  kind: ComponentKind
  description: string
  reference?: string
  interactive: boolean
}
