import { describe, expect, it } from 'bun:test'
import type { DataRequirement } from '../../src/services/data-collection/types'
import type { FieldEntry } from '../../src/services/forms/types'
import { validateFields } from '../../src/services/forms/validation'

describe('validateFields', () => {
  const textReq: DataRequirement = {
    id: 'name',
    fieldName: 'fullName',
    label: 'Full Name',
    fieldType: 'text',
    required: true,
    validation: [
      {
        type: 'minLength',
        value: 2,
        message: 'Name must be at least 2 characters',
      },
    ],
  }

  const numberReq: DataRequirement = {
    id: 'dep',
    fieldName: 'dependents',
    label: 'Dependents',
    fieldType: 'number',
    required: true,
    validation: [
      { type: 'min', value: 0 },
      { type: 'max', value: 20, message: 'Maximum 20 dependents' },
    ],
  }

  const currencyReq: DataRequirement = {
    id: 'income',
    fieldName: 'monthlyIncome',
    label: 'Monthly Income',
    fieldType: 'currency',
    required: true,
    validation: [{ type: 'min', value: 0 }],
  }

  const boolReq: DataRequirement = {
    id: 'agree',
    fieldName: 'agreeTerms',
    label: 'I agree',
    fieldType: 'boolean',
    required: true,
  }

  const conditionalReq: DataRequirement = {
    id: 'emp-type',
    fieldName: 'employmentType',
    label: 'Employment Type',
    fieldType: 'choice',
    required: true,
    choices: ['Full-time', 'Part-time'],
    condition: { field: 'employed', operator: 'equals', value: 'Yes' },
  }

  const patternReq: DataRequirement = {
    id: 'zip',
    fieldName: 'zipCode',
    label: 'Zip Code',
    fieldType: 'text',
    required: false,
    validation: [
      {
        type: 'pattern',
        value: '^\\d{5}$',
        message: 'Must be a 5-digit zip code',
      },
    ],
  }

  it('validates required text field with valid input', () => {
    const result = validateFields({ fullName: 'Alice' }, [textReq], {})
    expect(result.fullName.value).toBe('Alice')
    expect(result.fullName.errors).toBeUndefined()
  })

  it('errors on missing required text field', () => {
    const result = validateFields({}, [textReq], {})
    expect(result.fullName.value).toBeNull()
    expect(result.fullName.errors).toContain('Full Name is required')
  })

  it('applies minLength validation', () => {
    const result = validateFields({ fullName: 'A' }, [textReq], {})
    expect(result.fullName.errors).toContain(
      'Name must be at least 2 characters',
    )
  })

  it('validates number fields with coercion', () => {
    const result = validateFields({ dependents: '3' }, [numberReq], {})
    expect(result.dependents.value).toBe(3)
    expect(result.dependents.errors).toBeUndefined()
  })

  it('errors on non-numeric number field', () => {
    const result = validateFields({ dependents: 'abc' }, [numberReq], {})
    expect(result.dependents.errors).toContain('Must be a number')
  })

  it('applies min/max validation on numbers', () => {
    const result = validateFields({ dependents: '25' }, [numberReq], {})
    expect(result.dependents.errors).toContain('Maximum 20 dependents')
  })

  it('validates currency fields as numbers', () => {
    const result = validateFields({ monthlyIncome: '5000' }, [currencyReq], {})
    expect(result.monthlyIncome.value).toBe(5000)
    expect(result.monthlyIncome.errors).toBeUndefined()
  })

  it('validates boolean fields — checked', () => {
    const result = validateFields({ agreeTerms: 'on' }, [boolReq], {})
    expect(result.agreeTerms.value).toBe(true)
    expect(result.agreeTerms.errors).toBeUndefined()
  })

  it('errors on required boolean when unchecked', () => {
    const result = validateFields({}, [boolReq], {})
    expect(result.agreeTerms.value).toBe(false)
    expect(result.agreeTerms.errors).toContain('I agree is required')
  })

  it('skips fields whose condition is not met', () => {
    const sessionFields: Record<string, FieldEntry> = {
      employed: { value: 'No' },
    }
    const result = validateFields({}, [conditionalReq], sessionFields)
    expect(result.employmentType).toBeUndefined()
  })

  it('validates fields whose condition is met', () => {
    const sessionFields: Record<string, FieldEntry> = {
      employed: { value: 'Yes' },
    }
    const result = validateFields({}, [conditionalReq], sessionFields)
    expect(result.employmentType.errors).toContain(
      'Employment Type is required',
    )
  })

  it('applies pattern validation', () => {
    const result = validateFields({ zipCode: '1234' }, [patternReq], {})
    expect(result.zipCode.errors).toContain('Must be a 5-digit zip code')
  })

  it('passes pattern validation with valid input', () => {
    const result = validateFields({ zipCode: '12345' }, [patternReq], {})
    expect(result.zipCode.errors).toBeUndefined()
  })

  it('skips validation rules when field is empty and not required', () => {
    const result = validateFields({}, [patternReq], {})
    expect(result.zipCode.value).toBeNull()
    expect(result.zipCode.errors).toBeUndefined()
  })

  it('applies maxLength validation', () => {
    const req: DataRequirement = {
      id: 'short',
      fieldName: 'short',
      label: 'Short',
      fieldType: 'text',
      required: false,
      validation: [{ type: 'maxLength', value: 5 }],
    }
    const result = validateFields({ short: 'toolong' }, [req], {})
    expect(result.short.errors?.[0]).toContain('at most 5')
  })
})
