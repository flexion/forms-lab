import { describe, expect, it } from 'bun:test'
import { buildSystemPrompt } from '../../src/services/forms/filling-agent/system-prompt-builder'
import { testDataSpec } from './fixtures'

describe('buildSystemPrompt', () => {
  it('includes form structure description', () => {
    const prompt = buildSystemPrompt(testDataSpec.groups, {})

    // Should include group titles (the form structure available to us)
    expect(prompt).toContain('Personal Information')
    expect(prompt).toContain('Employment Status')
    expect(prompt).toContain('Additional Information')
  })

  it('includes tool descriptions', () => {
    const prompt = buildSystemPrompt(testDataSpec.groups, {})

    expect(prompt).toContain('collect_field')
    expect(prompt).toContain('explain_field')
    expect(prompt).toContain('skip_field')
  })

  it('lists remaining fields to collect', () => {
    const prompt = buildSystemPrompt(testDataSpec.groups, {})

    // Should list uncollected required fields
    expect(prompt).toContain('fullName')
    expect(prompt).toContain('email')
    expect(prompt).toContain('employed')
    expect(prompt).toContain('startDate')
    expect(prompt).toContain('dependents')
    expect(prompt).toContain('agreeTerms')
  })

  it('filters out fields already collected', () => {
    const collectedFields = {
      fullName: { value: 'Alice Johnson' },
      email: { value: 'alice@example.com' },
    }

    const prompt = buildSystemPrompt(testDataSpec.groups, collectedFields)

    // Should not list collected fields
    expect(prompt).not.toContain('fullName')
    expect(prompt).not.toContain('email')

    // Should still list uncollected fields
    expect(prompt).toContain('employed')
    expect(prompt).toContain('startDate')
  })

  it('respects conditional logic - filters fields with unmet conditions', () => {
    const collectedFields = {
      fullName: { value: 'Bob Smith' },
      email: { value: 'bob@example.com' },
      employed: { value: 'No' },
    }

    const prompt = buildSystemPrompt(testDataSpec.groups, collectedFields)

    // employmentType requires employed='Yes', should not appear
    expect(prompt).not.toContain('employmentType')

    // monthlyIncome is in a group that requires employed='Yes', should not appear
    expect(prompt).not.toContain('monthlyIncome')

    // startDate has no condition, should appear
    expect(prompt).toContain('startDate')
  })

  it('respects conditional logic - includes fields with met conditions', () => {
    const collectedFields = {
      fullName: { value: 'Carol Brown' },
      email: { value: 'carol@example.com' },
      employed: { value: 'Yes' },
    }

    const prompt = buildSystemPrompt(testDataSpec.groups, collectedFields)

    // employmentType requires employed='Yes', should appear
    expect(prompt).toContain('employmentType')

    // monthlyIncome is in a group that requires employed='Yes', should appear
    expect(prompt).toContain('monthlyIncome')
  })

  it('filters out conditional groups with unmet conditions', () => {
    const collectedFields = {
      employed: { value: 'No' },
    }

    const prompt = buildSystemPrompt(testDataSpec.groups, collectedFields)

    // Income Details group requires employed='Yes', should not appear
    expect(prompt).not.toContain('Income Details')
  })

  it('includes conditional groups with met conditions', () => {
    const collectedFields = {
      employed: { value: 'Yes' },
    }

    const prompt = buildSystemPrompt(testDataSpec.groups, collectedFields)

    // Income Details group requires employed='Yes', should appear
    expect(prompt).toContain('Income Details')
  })

  it('includes guidance on how to use tools', () => {
    const prompt = buildSystemPrompt(testDataSpec.groups, {})

    // Should have instructive text about the agent's role
    expect(prompt.toLowerCase()).toMatch(/collect|gather|fill|complete/)
  })

  it('includes field metadata for better conversation', () => {
    const prompt = buildSystemPrompt(testDataSpec.groups, {})

    // Should include field types to help the LLM understand expectations
    expect(prompt).toContain('text')
    expect(prompt).toContain('email')
    expect(prompt).toContain('choice')
    expect(prompt).toContain('boolean')
  })
})
