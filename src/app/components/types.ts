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
  description: string
  uswds: string
  interactive: boolean
}
