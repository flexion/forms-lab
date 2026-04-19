import type { FC } from 'hono/jsx'
import { Button } from '../flex-button'

export interface VariantCalloutProps {
  /** Task label shown as the callout heading, e.g., "Extraction model" */
  taskLabel: string
  /** Name of the currently-selected variant, e.g., "Claude Sonnet 4" */
  variantName: string
  /** One-line description of the variant, e.g., "Balanced quality and speed" */
  variantDescription: string
  /** Summary of how many variants exist and how they were evaluated */
  evaluationSummary: string
  /** Href to the settings picker (pre-resolved) */
  changeHref: string
  /** Href to the suite's catalog page (pre-resolved) */
  catalogHref: string
}

export const VariantCallout: FC<VariantCalloutProps> = ({
  taskLabel,
  variantName,
  variantDescription,
  evaluationSummary,
  changeHref,
  catalogHref,
}) => (
  <aside
    class="flex-variant-callout l-stack"
    aria-label={`${taskLabel}: ${variantName}`}
  >
    <div class="flex-variant-callout__header">
      <span class="flex-variant-callout__task-label">{taskLabel}</span>
    </div>

    <div class="flex-variant-callout__body l-stack">
      <span class="flex-variant-callout__variant-name">{variantName}</span>
      <span class="flex-variant-callout__variant-description">
        {variantDescription}
      </span>
    </div>

    <p class="flex-variant-callout__evaluation-summary">{evaluationSummary}</p>

    <div class="flex-variant-callout__actions l-cluster">
      <Button variant="outline" size="small" href={changeHref}>
        Change model
      </Button>
      <Button variant="unstyled" size="small" href={catalogHref}>
        See benchmarks →
      </Button>
    </div>
  </aside>
)
