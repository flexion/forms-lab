import type { FC } from 'hono/jsx'
import { SemanticDiff } from './index'

export const NoChanges: FC = () => <SemanticDiff changes={[]} />

export const WithAdditions: FC = () => (
  <SemanticDiff
    changes={[
      {
        category: 'added',
        groupKey: 'personal-info',
        groupLabel: 'Personal Information',
        description: 'Added field: Middle name',
      },
      {
        category: 'added',
        groupKey: 'personal-info',
        groupLabel: 'Personal Information',
        description: 'Added field: Suffix',
      },
    ]}
  />
)

export const WithRemovals: FC = () => (
  <SemanticDiff
    changes={[
      {
        category: 'removed',
        groupKey: 'contact',
        groupLabel: 'Contact Details',
        description: 'Removed field: Fax number',
      },
    ]}
  />
)

export const MixedChanges: FC = () => (
  <SemanticDiff
    changes={[
      {
        category: 'added',
        groupKey: 'personal-info',
        groupLabel: 'Personal Information',
        description: 'Added field: Middle name',
      },
      {
        category: 'modified',
        groupKey: 'contact',
        groupLabel: 'Contact Details',
        description: 'Modified field: Phone (type changed from text to tel)',
      },
      {
        category: 'removed',
        groupKey: 'contact',
        groupLabel: 'Contact Details',
        description: 'Removed field: Fax number',
      },
      {
        category: 'renamed',
        groupKey: 'identity',
        groupLabel: 'Identity',
        description: 'Renamed: "SSN" → "Social Security Number"',
      },
    ]}
  />
)
