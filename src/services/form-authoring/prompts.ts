// src/services/form-authoring/prompts.ts
import type { ProjectState } from '../forms'
import type { PolicyChunk } from '../rag'
import type { Criterion } from './types'

function formatCorpus(chunks: PolicyChunk[]): string {
  return chunks.map((c) => `### ${c.source}\n\n${c.text}`).join('\n\n')
}

function formatCriteria(criteria: Criterion[]): string {
  return criteria
    .filter((c) => c.status === 'approved' || c.status === 'added')
    .map((c) => `- [${c.id}] ${c.text} (${c.source})`)
    .join('\n')
}

function formatState(state: ProjectState): string {
  const groups = state.dataSpec.groups.map((g) => ({
    id: g.id,
    title: g.title,
    fields: g.requirements.map((r) => ({
      id: r.id,
      label: r.label,
      type: r.fieldType,
    })),
  }))
  return `## Current FormSpec\n${JSON.stringify(state.formSpec, null, 2)}\n\n## Current groups and fields\n${JSON.stringify(groups, null, 2)}`
}

export function buildCriteriaPrompt(corpus: PolicyChunk[]): string {
  return `You are a regulatory compliance analyst. Given the following policy corpus, identify the criteria a compliant application form must satisfy. Each criterion should be a clear English sentence with a specific regulatory citation.

## Policy Corpus

${formatCorpus(corpus)}

## Instructions

Analyze the corpus and produce a list of criteria. Each criterion must:
1. State what the form must collect or verify
2. Include a specific regulatory citation (e.g., "7 CFR 273.2(i)")
3. Be independently verifiable against a completed form

Return criteria as a JSON array. Each item has: id (kebab-case slug), text (the requirement), source (the citation).`
}

export function buildStructurePrompt(
  criteria: Criterion[],
  corpus: PolicyChunk[],
  state: ProjectState | null,
): string {
  const stateSection = state
    ? `\n\n## Current form state\n${formatState(state)}\n\nBuild on this existing structure.`
    : '\n\nStart from an empty form.'

  return `You are a form design assistant. Using the approved evaluation criteria and the policy corpus below, design the complete page and group structure for a compliant government benefits application form.

## Approved Criteria

${formatCriteria(criteria)}

## Policy Corpus

${formatCorpus(corpus)}
${stateSection}

## Instructions

Derive the form's topical structure from the criteria and policy corpus. Every page and group should trace to one or more criteria or corpus sections — do not invent topics that the policy does not mention, and do not omit topics that the policy clearly requires.

For each distinct topical area the policy addresses, call \`addPage\` once with a descriptive title that names what the page collects (e.g. "Household Composition", "Earned Income", "Shelter and Utility Expenses"). Titles should describe user-facing content, not paraphrase regulatory citations.

For each page, call \`addGroup\` one or more times to create the logical sub-sections within that page. Use additional groups when a page covers independently variable sub-topics (e.g. "Current employment" and "Prior employment" within "Employment history"); use a single group when the page is a single coherent subject.

Shape guidance:
- The number of pages should reflect the topical structure of the policy. Do not merge unrelated subjects onto one page. Do not split a coherent subject across pages unless the regulation itself separates them (e.g. federal eligibility vs. state-specific administration).
- Every criterion with status "approved" or "added" must be addressable by at least one page+group pair you create. If the corpus contains material that no criterion references, still include it if it implies a required page (e.g. rights notices, signature).
- If the criteria and corpus are empty, call no tools and return a short explanation that insufficient input was provided.

Call every \`addPage\` and \`addGroup\` tool invocation in this single response.`
}

export function buildSectionPrompt(
  groupId: string,
  groupTitle: string,
  criteria: Criterion[],
  scopedCorpus: PolicyChunk[],
): string {
  return `You are a form design assistant. Generate the fields for the "${groupTitle}" section (group id: ${groupId}).

## Relevant Criteria

${formatCriteria(criteria)}

## Relevant Policy

${formatCorpus(scopedCorpus)}

## Instructions

Propose addField, setFieldSensitivity, setFieldCondition, and relabelField commands to populate this section. Each field should:
1. Have a clear, user-friendly label
2. Use the appropriate field type (text, date, boolean, choice, number, etc.)
3. Be marked required or optional per regulation
4. Have sensitivity set for PII fields (SSN, DOB, etc.)

Call the appropriate tools. Cite the regulation that requires each field.`
}

export function buildEvalPrompt(
  groupId: string,
  state: ProjectState,
  criteria: Criterion[],
  corpus: PolicyChunk[],
): string {
  return `You are an evaluation judge assessing whether a form section meets regulatory criteria. Evaluate the "${groupId}" section of the form.

## Form State

${formatState(state)}

## Criteria to Evaluate

${formatCriteria(criteria)}

## Policy Corpus

${formatCorpus(corpus)}

## Instructions

For each criterion that is relevant to this section, score it as:
- **pass**: The form section fully satisfies this criterion
- **fail**: The form section is missing required elements for this criterion
- **partial**: The form section partially addresses this criterion

Return a JSON array of results. Each item has: criterionId, pass (boolean — true for pass, false for fail/partial), explanation (one sentence).`
}
