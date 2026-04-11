import dagre from '@dagrejs/dagre'
import type { GraphDefinition } from './types'

function buildPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return ''
  const [first, ...rest] = points
  return `M ${first.x} ${first.y} ${rest.map((p) => `L ${p.x} ${p.y}`).join(' ')}`
}

export function DiagramRenderer({ graph }: { graph: GraphDefinition }) {
  const {
    title,
    description,
    nodes,
    edges,
    direction = 'TB',
    nodeWidth = 160,
    nodeHeight = 50,
    nodesep = 60,
    ranksep = 80,
  } = graph

  const g = new dagre.graphlib.Graph()
  g.setGraph({
    rankdir: direction,
    nodesep,
    ranksep,
    marginx: 40,
    marginy: 40,
  })
  g.setDefaultEdgeLabel(() => ({}))

  for (const node of nodes) {
    g.setNode(node.id, {
      label: node.label,
      width: nodeWidth,
      height: nodeHeight,
    })
  }

  for (const edge of edges) {
    g.setEdge(edge.source, edge.target)
  }

  dagre.layout(g)

  const graphInfo = g.graph() as { width: number; height: number }
  const svgWidth = graphInfo.width ?? 400
  const svgHeight = graphInfo.height ?? 300

  const titleId = 'diagram-title'
  const descId = 'diagram-desc'

  return (
    <svg
      class="flex-diagram"
      role="img"
      aria-labelledby={`${titleId} ${descId}`}
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title id={titleId}>{title}</title>
      <desc id={descId}>{description}</desc>
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="10"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" />
        </marker>
      </defs>

      {edges.map((edge) => {
        const edgeData = g.edge(edge.source, edge.target) as {
          points: Array<{ x: number; y: number }>
        }
        if (!edgeData?.points) return null

        const points = edgeData.points
        const pathD = buildPath(points)

        const midIndex = Math.floor(points.length / 2)
        const midPoint = points[midIndex]

        return (
          <g class="flex-diagram__edge">
            <path
              d={pathD}
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              marker-end="url(#arrowhead)"
              {...(edge.style === 'dashed'
                ? { 'stroke-dasharray': '6 4' }
                : {})}
            />
            {edge.label && midPoint && (
              <text
                x={midPoint.x}
                y={midPoint.y - 6}
                text-anchor="middle"
                class="flex-diagram__edge-label"
              >
                {edge.label}
              </text>
            )}
          </g>
        )
      })}

      {nodes.map((node) => {
        const nodeData = g.node(node.id) as {
          x: number
          y: number
          width: number
          height: number
        }
        if (!nodeData) return null

        const x = nodeData.x - nodeData.width / 2
        const y = nodeData.y - nodeData.height / 2

        const rect = (
          <g class="flex-diagram__node">
            <rect
              x={x}
              y={y}
              width={nodeData.width}
              height={nodeData.height}
              rx="4"
              ry="4"
              fill="white"
              stroke="currentColor"
              stroke-width="1.5"
            />
            <text
              x={nodeData.x}
              y={nodeData.y + 5}
              text-anchor="middle"
              dominant-baseline="middle"
            >
              {node.label}
            </text>
          </g>
        )

        if (node.href) {
          return <a href={node.href}>{rect}</a>
        }

        return rect
      })}
    </svg>
  )
}
