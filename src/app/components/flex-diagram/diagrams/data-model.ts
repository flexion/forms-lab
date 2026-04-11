import type { GraphDefinition } from '../types'

export const dataModelGraph: GraphDefinition = {
  title: 'Data Model',
  description:
    'Three-tier data model: DataCollectionSpec defines what data to collect, FormSpec defines how to present it, and Submission captures the collected data. One DataCollectionSpec can have multiple FormSpecs, and one FormSpec produces multiple Submissions.',
  nodes: [
    { id: 'collection-spec', label: 'DataCollectionSpec' },
    { id: 'form-spec', label: 'FormSpec' },
    { id: 'submission', label: 'Submission' },
    { id: 'form-project', label: 'FormProject' },
  ],
  edges: [
    { source: 'collection-spec', target: 'form-spec', label: '1 → many' },
    { source: 'form-spec', target: 'submission', label: '1 → many' },
    { source: 'form-project', target: 'collection-spec', label: 'contains' },
    { source: 'form-project', target: 'form-spec', label: 'contains' },
  ],
  direction: 'LR',
}
