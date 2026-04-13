export interface DiagramNode {
  id: string
  label: string
  /** Short secondary line rendered under the label in smaller text */
  sublabel?: string
  description?: string
  href?: string
  group?: string
}

export interface DiagramEdge {
  source: string
  target: string
  label?: string
  style?: 'solid' | 'dashed'
}

export interface DiagramGroup {
  id: string
  label: string
  style?: 'solid' | 'dashed'
}

export interface GraphDefinition {
  title: string
  description: string
  nodes: DiagramNode[]
  edges: DiagramEdge[]
  groups?: DiagramGroup[]
  direction?: 'TB' | 'LR'
  nodeWidth?: number
  nodeHeight?: number
  nodesep?: number
  ranksep?: number
}
