/**
 * Data Collection domain types — what data to collect
 */

export interface DataCollectionSpec {
  id: string
  title: string
  description: string
  groups: RequirementGroup[]
}

export interface RequirementGroup {
  id: string
  title: string
  description?: string
  requirements: DataRequirement[]
  condition?: FieldCondition
}

export interface DataRequirement {
  id: string
  fieldName: string
  label: string
  fieldType: FieldType
  required: boolean
  helpText?: string
  choices?: string[]
  validation?: ValidationRule[]
  condition?: FieldCondition
  displayWidth?: '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
}

export type FieldType =
  | 'text'
  | 'email'
  | 'phone'
  | 'url'
  | 'number'
  | 'currency'
  | 'date'
  | 'boolean'
  | 'choice'
  | 'longText'

export interface ValidationRule {
  type: 'pattern' | 'min' | 'max' | 'minLength' | 'maxLength'
  value: string | number
  message?: string
}

export interface FieldCondition {
  field: string
  operator: 'equals' | 'notEquals' | 'contains'
  value: string | number | boolean
}
