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

  return `You are a form design assistant building a government benefits application form. Using the approved evaluation criteria and policy corpus, create the COMPLETE page and group structure in a single response.

## Approved Criteria

${formatCriteria(criteria)}

## Policy Corpus

${formatCorpus(corpus)}
${stateSection}

## Instructions

Create the FULL form structure by calling addPage and addGroup tools MANY TIMES in this single response. A SNAP application typically needs 6-8 pages with 2-3 groups each. You MUST call the tools multiple times to create all pages and all groups.

Required pages (call addPage for EACH):
1. Applicant Information
2. Household Composition
3. Income (Earned and Unearned)
4. Resources and Assets
5. Expenses and Deductions
6. Expedited Service Screening
7. Work Requirements
8. Rights, Responsibilities, and Signature

For EACH page, also call addGroup to create 1-3 groups within it.

Call ALL the addPage and addGroup tools NOW in this single response. Do not stop after one call.`
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
