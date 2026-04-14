import type { FC } from 'hono/jsx'
import { resolveUrl } from '../../../shared/base-path'
import { StatusBadge } from '../flex-badge'

interface StrategyItem {
  id: string
  metadata: {
    name: string
    description: string
    status: 'baseline' | 'experimental' | 'production'
    catalogPath?: string
    metrics?: Record<string, number>
  }
}

interface StrategySelectorProps {
  strategies: StrategyItem[]
  defaultId: string
  name: string
}

export const StrategySelector: FC<StrategySelectorProps> = ({
  strategies,
  defaultId,
  name,
}) => {
  return (
    <fieldset class="flex-strategy-selector">
      <legend class="flex-strategy-selector__legend">
        Extraction Strategy
      </legend>
      <div class="flex-strategy-selector__hint">
        Choose the AI model and approach for extracting form structure. Each
        strategy has been evaluated for accuracy and performance.
      </div>
      <div class="flex-strategy-selector__options">
        {strategies.map((strategy) => {
          const isDefault = strategy.id === defaultId
          const metrics = strategy.metadata.metrics
          const hasMetrics = metrics && Object.keys(metrics).length > 0

          return (
            <label
              key={strategy.id}
              class="flex-strategy-selector__option"
              data-has-metrics={hasMetrics || undefined}
            >
              <input
                type="radio"
                name={name}
                value={strategy.id}
                checked={isDefault}
                class="flex-strategy-selector__input"
              />
              <div class="flex-strategy-selector__content">
                <div class="flex-strategy-selector__header">
                  <span class="flex-strategy-selector__name">
                    {strategy.metadata.name}
                  </span>
                  <div class="flex-strategy-selector__badges">
                    <StatusBadge status={strategy.metadata.status} />
                    {isDefault && (
                      <span class="badge" data-variant="tag">
                        default
                      </span>
                    )}
                  </div>
                </div>
                <p class="flex-strategy-selector__description">
                  {strategy.metadata.description}
                </p>
                {hasMetrics ? (
                  <div class="flex-strategy-selector__metrics">
                    {metrics.accuracy !== undefined && (
                      <span class="flex-strategy-selector__metric">
                        <strong>{Math.round(metrics.accuracy * 100)}%</strong>{' '}
                        accuracy
                      </span>
                    )}
                    {metrics.latency !== undefined && (
                      <span class="flex-strategy-selector__metric">
                        <strong>{Math.round(metrics.latency / 1000)}s</strong>{' '}
                        latency
                      </span>
                    )}
                    {metrics.cost !== undefined && (
                      <span class="flex-strategy-selector__metric">
                        <strong>${metrics.cost.toFixed(3)}</strong> cost
                      </span>
                    )}
                  </div>
                ) : (
                  <div class="flex-strategy-selector__metrics">
                    <span class="text-muted text-sm">
                      No evaluation data yet
                    </span>
                  </div>
                )}
                {strategy.metadata.catalogPath && (
                  <a
                    href={resolveUrl(strategy.metadata.catalogPath)}
                    class="flex-strategy-selector__link"
                  >
                    View evaluation →
                  </a>
                )}
              </div>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
