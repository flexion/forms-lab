import type { FC } from 'hono/jsx'
import { VariantCallout } from './index'

export const ExtractionVariantCallout: FC = () => (
  <VariantCallout
    taskLabel="Extraction model"
    variantName="Claude Sonnet 4"
    variantDescription="Balanced quality and speed"
    evaluationSummary="3 variants evaluated on 3 government PDF fixtures"
    changeHref="/settings/variants?task=extraction"
    catalogHref="/catalog/experiments/pdf-field-extraction"
  />
)
