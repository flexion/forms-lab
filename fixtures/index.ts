import { join } from 'node:path'
import { readFileSync } from 'node:fs'
import type { FixtureManifest } from '../src/services/evaluation/schemas'
import type { DataCollectionSpec } from '../src/types/models'

export interface DemoFixture {
  slug: string
  name: string
  description: string
  filename: string
}

export interface LoadedFixture {
  slug: string
  name: string
  description: string
  pdf: Buffer
  manifest: FixtureManifest
  groundTruth?: DataCollectionSpec
}

export const demoFixtures: DemoFixture[] = [
  {
    slug: 'pardon-application',
    name: 'Application for Pardon After Completion of Sentence',
    description:
      'U.S. Department of Justice petition for presidential pardon. 24 pages with personal information, criminal history, employment, and character references.',
    filename: 'pardon-application.pdf',
  },
  {
    slug: 'i-9',
    name: 'USCIS Form I-9 — Employment Eligibility Verification',
    description:
      'Federal employment eligibility verification form. Single-page, simple demographics and document verification.',
    filename: 'i-9.pdf',
  },
  {
    slug: 'w-9',
    name: 'IRS Form W-9 — Request for Taxpayer Identification',
    description:
      'Tax identification request form. Short, simple fields covering name, address, TIN, and certification.',
    filename: 'w-9.pdf',
  },
]

export function getFixture(slug: string): DemoFixture | undefined {
  return demoFixtures.find((f) => f.slug === slug)
}

export function loadFixturePdf(fixture: DemoFixture): Buffer {
  const fixturesDir = join(import.meta.dir)
  return readFileSync(join(fixturesDir, fixture.filename)) as Buffer
}

export function loadFixtureForEvaluation(slug: string): LoadedFixture | null {
  const fixture = getFixture(slug)
  if (!fixture) return null

  const fixturesDir = join(import.meta.dir)
  const pdf = readFileSync(join(fixturesDir, fixture.filename)) as Buffer
  const manifest = JSON.parse(
    readFileSync(join(fixturesDir, slug, 'manifest.json'), 'utf-8'),
  ) as FixtureManifest

  let groundTruth: DataCollectionSpec | undefined
  try {
    groundTruth = JSON.parse(
      readFileSync(join(fixturesDir, slug, 'ground-truth.json'), 'utf-8'),
    ) as DataCollectionSpec
  } catch {
    // Not yet generated
  }

  return {
    slug,
    name: fixture.name,
    description: fixture.description,
    pdf,
    manifest,
    groundTruth,
  }
}

export function loadAllFixturesForEvaluation(): LoadedFixture[] {
  return demoFixtures
    .map((f) => loadFixtureForEvaluation(f.slug))
    .filter((f): f is LoadedFixture => f !== null)
}
