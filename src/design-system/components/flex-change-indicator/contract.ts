import type { CustomContract } from '../../contract/types'

export const spec: CustomContract = {
  kind: 'custom',
  component: 'flex-change-indicator',
  variants: [
    {
      name: 'Added',
      description: 'Dot indicator for a newly-added item; renders with the "added" variant color.',
    },
    {
      name: 'Removed',
      description: 'Dot indicator for a removed item; renders with the "removed" variant color.',
    },
    {
      name: 'Modified',
      description: 'Dot indicator for a modified item; renders with the "modified" variant color.',
    },
    {
      name: 'WithLabel',
      description: 'Indicator with an explicit text label next to the dot.',
    },
  ],
  behavior: [
    {
      description: 'aria-label conveys the change type to screen readers when no visible label is present',
      tested: false,
    },
    {
      description: 'Visible label text overrides the default aria-label',
      tested: false,
    },
  ],
}
