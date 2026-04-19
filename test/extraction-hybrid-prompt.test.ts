import { describe, expect, it } from 'bun:test'
import type { ExtractionExemplar } from '../src/services/extraction/exemplars'
import { exemplars } from '../src/services/extraction/exemplars'
import { buildExemplarSection } from '../src/services/form-documents/extraction'
import { buildHybridExtractionPrompt } from '../src/services/form-documents/hybrid-extraction-prompt'

const sampleExemplar: ExtractionExemplar = {
  id: 'nested-groups-sample',
  description: 'Employment history with current/previous sub-sections',
  rationale: 'Demonstrates nested grouping',
  input:
    'Section 4: Employment History. Sub-section A — Current Employment: Employer Name, Job Title.',
  output: JSON.stringify({
    id: 'employment-history',
    title: 'Employment History',
    groups: [
      {
        id: 'current-employment',
        title: 'Current Employment',
        requirements: [
          {
            id: 'current-employer-name',
            fieldName: 'currentEmployerName',
            label: 'Employer Name',
            fieldType: 'text',
            required: true,
          },
        ],
      },
    ],
  }),
}

describe('buildHybridExtractionPrompt', () => {
  it('includes the three top-level section headers', () => {
    const prompt = buildHybridExtractionPrompt(sampleExemplar)
    expect(prompt).toContain('## Example')
    expect(prompt).toContain('## Schema')
    expect(prompt).toContain('## Your extraction')
  })

  it('uses singular `## Example` — not the plural `## Examples` heading from the baseline few-shot appendix', () => {
    const prompt = buildHybridExtractionPrompt(sampleExemplar)
    // The baseline `buildExemplarSection` uses `## Examples` (plural).
    // The hybrid prompt is a self-contained rewrite, not an appendix,
    // so it must use the singular heading.
    expect(prompt).not.toContain('## Examples')
  })

  it('embeds the exemplar input verbatim', () => {
    const prompt = buildHybridExtractionPrompt(sampleExemplar)
    expect(prompt).toContain(sampleExemplar.input)
  })

  it('embeds a recognizable key from the exemplar output JSON', () => {
    const prompt = buildHybridExtractionPrompt(sampleExemplar)
    expect(prompt).toContain('currentEmployerName')
    expect(prompt).toContain('current-employment')
  })

  it('includes schema guidance for kebab-case ids and camelCase fieldNames', () => {
    const prompt = buildHybridExtractionPrompt(sampleExemplar)
    expect(prompt).toMatch(/kebab-case/i)
    expect(prompt).toMatch(/camelCase/i)
  })

  it('instructs the model to return ONLY the JSON', () => {
    const prompt = buildHybridExtractionPrompt(sampleExemplar)
    expect(prompt).toMatch(/ONLY the JSON/i)
  })

  it('is measurably shorter than the baseline prompt plus the 3-exemplar few-shot appendix', () => {
    // Sanity check on the "concise" claim. The hybrid prompt ships one
    // example inline; the baseline plus 3 few-shot exemplars is the
    // bulkiest competitor in the suite.
    const [nestedGroupsExemplar] = exemplars
    if (!nestedGroupsExemplar) throw new Error('exemplar 0 missing')
    const hybrid = buildHybridExtractionPrompt(nestedGroupsExemplar)
    const fewShotAppendix = buildExemplarSection(exemplars)
    expect(hybrid.length).toBeLessThan(fewShotAppendix.length)
  })
})
