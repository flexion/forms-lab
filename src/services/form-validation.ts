import type { DataRequirement, FieldEntry } from '../types/models'
import { evaluateCondition } from './form-resolver'

export function validateFields(
  formData: Record<string, string>,
  requirements: DataRequirement[],
  sessionFields: Record<string, FieldEntry>,
): Record<string, FieldEntry> {
  const result: Record<string, FieldEntry> = {}

  for (const req of requirements) {
    if (!evaluateCondition(req.condition, sessionFields)) continue

    const rawValue = formData[req.fieldName] ?? ''
    const errors: string[] = []
    let value: string | number | boolean | null

    if (req.fieldType === 'boolean') {
      value = rawValue === 'on' || rawValue === 'true'
    } else if (req.fieldType === 'number' || req.fieldType === 'currency') {
      if (rawValue === '') {
        value = null
      } else {
        const num = Number(rawValue)
        if (Number.isNaN(num)) {
          errors.push('Must be a number')
          value = null
        } else {
          value = num
        }
      }
    } else {
      value = rawValue || null
    }

    if (req.required) {
      if (
        value === null ||
        value === '' ||
        (req.fieldType === 'boolean' && value === false)
      ) {
        errors.push(`${req.label} is required`)
      }
    }

    if (value !== null && value !== '' && req.validation) {
      for (const rule of req.validation) {
        switch (rule.type) {
          case 'minLength':
            if (
              typeof value === 'string' &&
              value.length < Number(rule.value)
            ) {
              errors.push(
                rule.message ?? `Must be at least ${rule.value} characters`,
              )
            }
            break
          case 'maxLength':
            if (
              typeof value === 'string' &&
              value.length > Number(rule.value)
            ) {
              errors.push(
                rule.message ?? `Must be at most ${rule.value} characters`,
              )
            }
            break
          case 'min':
            if (typeof value === 'number' && value < Number(rule.value)) {
              errors.push(rule.message ?? `Must be at least ${rule.value}`)
            }
            break
          case 'max':
            if (typeof value === 'number' && value > Number(rule.value)) {
              errors.push(rule.message ?? `Must be at most ${rule.value}`)
            }
            break
          case 'pattern':
            if (
              typeof value === 'string' &&
              !new RegExp(String(rule.value)).test(value)
            ) {
              errors.push(rule.message ?? `Invalid format`)
            }
            break
        }
      }
    }

    result[req.fieldName] = {
      value,
      errors: errors.length > 0 ? errors : undefined,
    }
  }

  return result
}
