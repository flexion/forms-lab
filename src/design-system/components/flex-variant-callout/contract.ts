import type { CustomContract } from '../../contract/types'

export const spec: CustomContract = {
  kind: 'custom',
  component: 'flex-variant-callout',
  variants: [
    {
      name: 'ExtractionVariantCallout',
      description:
        'Callout card showing the active extraction model variant with its name, description, evaluation summary, and action links.',
    },
  ],
  behavior: [
    {
      description:
        'Callout exposes the task label and variant name to screen readers via the aside aria-label',
      tested: false,
    },
    {
      description:
        '"Change model" and "See benchmarks" links navigate to the settings and catalog pages respectively',
      tested: false,
    },
  ],
}
