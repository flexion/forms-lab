// Public interface for the data-collection service.
// External imports (other services, entrypoints, design-system) MUST come
// through this file. Enforced by test/architecture/dependency-rule.test.ts.

export type {
  DataCollectionSpec,
  DataRequirement,
  FieldCondition,
  FieldType,
  RequirementGroup,
  SensitivityLevel,
  ValidationRule,
} from './types'
