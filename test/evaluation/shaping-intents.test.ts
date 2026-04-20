import { describe, expect, it } from 'bun:test'
import {
  fixtureProjectState,
  shapingIntentFixtures,
} from '../../src/services/evaluation/fixtures/shaping-intents'
import { executeBatch } from '../../src/services/forms'

describe('shaping intent fixtures', () => {
  it('provides 9 scripted intents', () => {
    expect(shapingIntentFixtures.length).toBe(9)
  })

  it("every fixture's expectedCommands execute cleanly against the project state", () => {
    for (const fixture of shapingIntentFixtures) {
      const result = executeBatch(fixtureProjectState, fixture.expectedCommands)
      if (!result.ok) {
        throw new Error(
          `fixture "${fixture.id}" failed at command ${result.failedAt}: ${result.error}`,
        )
      }
      expect(result.ok).toBe(true)
    }
  })

  it('each fixture has a unique id', () => {
    const ids = shapingIntentFixtures.map((f) => f.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('each fixture has a non-empty intent string', () => {
    for (const fixture of shapingIntentFixtures) {
      expect(fixture.intent.length).toBeGreaterThan(0)
    }
  })

  it('each fixture has at least one expected command', () => {
    for (const fixture of shapingIntentFixtures) {
      expect(fixture.expectedCommands.length).toBeGreaterThan(0)
    }
  })

  it('each fixture has a matching groundTruth', () => {
    for (const fixture of shapingIntentFixtures) {
      expect(fixture.groundTruth.intent).toBe(fixture.intent)
      expect(fixture.groundTruth.expectedCommands).toBe(
        fixture.expectedCommands,
      )
    }
  })

  it('fixture project state has 5 pages', () => {
    expect(fixtureProjectState.formSpec.pages.length).toBe(5)
  })

  it('fixture project state has 5 groups', () => {
    expect(fixtureProjectState.dataSpec.groups.length).toBe(5)
  })

  it('all group ids referenced in pages exist in data spec', () => {
    const groupIds = new Set(
      fixtureProjectState.dataSpec.groups.map((g) => g.id),
    )
    for (const page of fixtureProjectState.formSpec.pages) {
      for (const groupId of page.groups) {
        expect(groupIds.has(groupId)).toBe(true)
      }
    }
  })

  it('expected commands reference valid ids from the project state', () => {
    const pageIds = new Set(fixtureProjectState.formSpec.pages.map((p) => p.id))
    const groupIds = new Set(
      fixtureProjectState.dataSpec.groups.map((g) => g.id),
    )
    const fieldIds = new Set(
      fixtureProjectState.dataSpec.groups.flatMap((g) =>
        g.requirements.map((r) => r.id),
      ),
    )

    for (const fixture of shapingIntentFixtures) {
      for (const cmd of fixture.expectedCommands) {
        if (cmd.kind === 'swapPages') {
          expect(pageIds.has(cmd.a)).toBe(true)
          expect(pageIds.has(cmd.b)).toBe(true)
        }
        if (cmd.kind === 'mergePages') {
          expect(pageIds.has(cmd.intoId)).toBe(true)
          expect(pageIds.has(cmd.fromId)).toBe(true)
        }
        if (cmd.kind === 'setRequired') {
          expect(fieldIds.has(cmd.id)).toBe(true)
        }
        if (cmd.kind === 'moveGroup') {
          expect(groupIds.has(cmd.groupId)).toBe(true)
          expect(pageIds.has(cmd.toPageId)).toBe(true)
        }
        if (cmd.kind === 'renamePage') {
          expect(pageIds.has(cmd.id)).toBe(true)
        }
        if (cmd.kind === 'setDeliveryMode') {
          expect(pageIds.has(cmd.pageId)).toBe(true)
        }
      }
    }
  })
})
