import type { FC } from 'hono/jsx'
import { Checkbox } from '../flex-checkbox'
import { DatePicker } from '../flex-date-picker'
import { ErrorMessage } from '../flex-error-message'
import { InputGroup } from '../flex-input-prefix-suffix'
import { Label } from '../flex-label'
import { Radio } from '../flex-radio'
import { Select } from '../flex-select'
import { TextInput } from '../flex-text-input'
import { Textarea } from '../flex-textarea'

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

export interface FormFieldRequirement {
  fieldName: string
  label: string
  fieldType: FieldType
  required: boolean
  helpText?: string
  choices?: string[]
  displayWidth?: '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
}

export interface FormFieldEntry {
  value: string | number | boolean | null
  errors?: string[]
}

const CHOICE_RADIO_THRESHOLD = 7

const DEFAULT_WIDTHS: Partial<
  Record<
    FormFieldRequirement['fieldType'],
    FormFieldRequirement['displayWidth']
  >
> = {
  email: 'xl',
  phone: 'md',
  number: 'sm',
  currency: 'md',
}

interface FormFieldProps {
  requirement: FormFieldRequirement
  entry?: FormFieldEntry
}

export const FormField: FC<FormFieldProps> = ({ requirement, entry }) => {
  const {
    fieldName,
    label,
    fieldType,
    required,
    helpText,
    choices,
    displayWidth,
  } = requirement
  const hasError = entry?.errors && entry.errors.length > 0
  const errorId = `${fieldName}-error`
  const helpId = `${fieldName}-help`
  const describedBy =
    [hasError ? errorId : null, helpText ? helpId : null]
      .filter(Boolean)
      .join(' ') || undefined
  const value = entry?.value
  const width = displayWidth ?? DEFAULT_WIDTHS[fieldType]

  return (
    <div class="flex-form-group" data-state={hasError ? 'error' : undefined}>
      <div class="l-stack" style="--stack-space: var(--flex-space-xs)">
        {fieldType !== 'boolean' && fieldType !== 'date' && (
          <Label htmlFor={fieldName} optional={!required}>
            {label}
          </Label>
        )}
        {helpText && (
          <span class="flex-hint" id={helpId}>
            {helpText}
          </span>
        )}
        {hasError && entry?.errors && (
          <ErrorMessage id={errorId}>{entry.errors.join('. ')}</ErrorMessage>
        )}
        {renderInput(
          fieldType,
          fieldName,
          value,
          hasError,
          describedBy,
          choices,
          label,
          required,
          width,
        )}
      </div>
    </div>
  )
}

function renderInput(
  fieldType: FormFieldRequirement['fieldType'],
  name: string,
  value: string | number | boolean | null | undefined,
  hasError: boolean | undefined,
  describedBy: string | undefined,
  choices: string[] | undefined,
  label: string,
  required: boolean,
  width: FormFieldRequirement['displayWidth'],
) {
  const state = hasError ? ('error' as const) : undefined
  const strValue = value != null && value !== false ? String(value) : undefined

  switch (fieldType) {
    case 'text':
      return (
        <TextInput
          id={name}
          name={name}
          type="text"
          value={strValue}
          state={state}
          required={required}
          width={width}
          ariaDescribedby={describedBy}
        />
      )
    case 'email':
      return (
        <TextInput
          id={name}
          name={name}
          type="email"
          value={strValue}
          state={state}
          required={required}
          width={width}
          ariaDescribedby={describedBy}
        />
      )
    case 'phone':
      return (
        <TextInput
          id={name}
          name={name}
          type="tel"
          value={strValue}
          state={state}
          required={required}
          width={width}
          ariaDescribedby={describedBy}
        />
      )
    case 'url':
      return (
        <TextInput
          id={name}
          name={name}
          type="url"
          value={strValue}
          state={state}
          required={required}
          width={width}
          ariaDescribedby={describedBy}
        />
      )
    case 'number':
      return (
        <TextInput
          id={name}
          name={name}
          type="number"
          value={strValue}
          state={state}
          required={required}
          width={width}
          ariaDescribedby={describedBy}
        />
      )
    case 'currency':
      return (
        <InputGroup prefix="$" state={state}>
          <TextInput
            id={name}
            name={name}
            type="number"
            value={strValue}
            state={state}
            required={required}
            width={width}
            ariaDescribedby={describedBy}
          />
        </InputGroup>
      )
    case 'longText':
      return (
        <Textarea
          id={name}
          name={name}
          defaultValue={strValue}
          state={state}
          required={required}
          ariaDescribedby={describedBy}
        />
      )
    case 'boolean':
      return (
        <Checkbox
          id={name}
          name={name}
          value="on"
          label={label}
          checked={value === true}
          required={required}
          state={state}
          ariaDescribedby={describedBy}
        />
      )
    case 'date':
      return (
        <DatePicker
          id={name}
          name={name}
          label={label}
          defaultValue={strValue}
          required={required}
        />
      )
    case 'choice': {
      if (!choices) return null
      if (choices.length <= CHOICE_RADIO_THRESHOLD) {
        return (
          <fieldset>
            {choices.map((choice) => (
              <Radio
                key={choice}
                id={`${name}-${choice}`}
                name={name}
                value={choice}
                label={choice}
                checked={value === choice}
              />
            ))}
          </fieldset>
        )
      }
      return (
        <Select
          id={name}
          name={name}
          state={hasError ? 'error' : undefined}
          value={strValue}
          ariaDescribedby={describedBy}
          options={choices.map((c) => ({ value: c, label: c }))}
        />
      )
    }
  }
}
