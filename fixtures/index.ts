import { join } from 'node:path'
import { readFileSync } from 'node:fs'

export interface DemoFixture {
  slug: string
  name: string
  description: string
  filename: string
}

export const demoFixtures: DemoFixture[] = [
  {
    slug: 'pardon-application',
    name: 'Application for Pardon After Completion of Sentence',
    description:
      'U.S. Department of Justice petition for presidential pardon. 24 pages with personal information, criminal history, employment, and character references.',
    filename: 'pardon-application.pdf',
  },
]

export function getFixture(slug: string): DemoFixture | undefined {
  return demoFixtures.find((f) => f.slug === slug)
}

export function loadFixturePdf(fixture: DemoFixture): Buffer {
  const fixturesDir = join(import.meta.dir)
  return readFileSync(join(fixturesDir, fixture.filename)) as Buffer
}
