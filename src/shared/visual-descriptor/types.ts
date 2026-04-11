export interface PseudoElement {
  content: string
  styles: Record<string, string>
}

export interface VisualNode {
  tag: string
  classes: string[]
  attributes: Record<string, string>
  text: string | null
  styles: Record<string, string>
  box: {
    width: number
    height: number
    paddingTop: number
    paddingRight: number
    paddingBottom: number
    paddingLeft: number
    marginTop: number
    marginRight: number
    marginBottom: number
    marginLeft: number
  }
  before: PseudoElement | null
  after: PseudoElement | null
  children: VisualNode[]
}

export type VisualDescriptor = VisualNode

export interface VisualDifference {
  path: string
  property: string
  expected: string
  actual: string
}
