import { expect } from '@playwright/test'
import type { VisualDifference } from '../visual-descriptor'

export function expectMatch(differences: VisualDifference[]): void {
  if (differences.length > 0) {
    const report = differences
      .map((d) => `  ${d.path}: ${d.property} — expected ${d.expected}, got ${d.actual}`)
      .join('\n')
    console.log(`Visual differences found:\n${report}`)
  }
  expect(differences).toEqual([])
}
