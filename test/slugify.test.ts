import { describe, expect, it } from 'bun:test'
import { slugify } from '../src/shared/slugify'

describe('slugify', () => {
  it('lowercases and replaces spaces with hyphens', () => {
    expect(slugify('Pardon Application')).toBe('pardon-application')
  })

  it('strips non-alphanumeric characters', () => {
    expect(slugify('Application for Pardon (Form DOJ-1)')).toBe(
      'application-for-pardon-form-doj-1',
    )
  })

  it('collapses multiple hyphens', () => {
    expect(slugify('hello   world')).toBe('hello-world')
  })

  it('trims leading and trailing hyphens', () => {
    expect(slugify('--hello--')).toBe('hello')
  })

  it('handles .pdf extension removal', () => {
    expect(slugify('my-form.pdf')).toBe('my-form')
  })
})
