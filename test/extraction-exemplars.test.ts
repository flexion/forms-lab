import { describe, expect, it } from 'bun:test'
import {
  type ExtractionExemplar,
  exemplars,
} from '../src/services/extraction/exemplars'

describe('extraction exemplars', () => {
  it('exports between 2 and 3 exemplars', () => {
    expect(exemplars.length).toBeGreaterThanOrEqual(2)
    expect(exemplars.length).toBeLessThanOrEqual(3)
  })

  it('each exemplar has required fields', () => {
    for (const exemplar of exemplars) {
      expect(exemplar.id).toBeTruthy()
      expect(exemplar.description).toBeTruthy()
      expect(exemplar.rationale).toBeTruthy()
      expect(exemplar.input).toBeTruthy()
      expect(exemplar.output).toBeTruthy()
    }
  })

  it('each exemplar has a unique id', () => {
    const ids = exemplars.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('each exemplar output is valid JSON matching DataCollectionSpec shape', () => {
    for (const exemplar of exemplars) {
      const parsed = JSON.parse(exemplar.output)
      expect(parsed.id).toBeTruthy()
      expect(parsed.title).toBeTruthy()
      expect(Array.isArray(parsed.groups)).toBe(true)
      expect(parsed.groups.length).toBeGreaterThan(0)
      for (const group of parsed.groups) {
        expect(group.id).toBeTruthy()
        expect(group.title).toBeTruthy()
        expect(Array.isArray(group.requirements)).toBe(true)
      }
    }
  })

  it('exemplars are compact (each under 1500 characters total)', () => {
    for (const exemplar of exemplars) {
      const total =
        exemplar.input.length +
        exemplar.output.length +
        exemplar.description.length
      expect(total).toBeLessThan(1500)
    }
  })
})
