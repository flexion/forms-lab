/**
 * Curated few-shot exemplars for PDF field extraction.
 *
 * Each exemplar demonstrates a specific edge case that the base prompt
 * struggles with. The input describes a hypothetical form; the output
 * is a compact DataCollectionSpec snippet showing the expected extraction.
 *
 * Keep exemplars small (under ~500 tokens each) to avoid blowing the
 * token budget. The model only needs the pattern, not a complete form.
 */

export interface ExtractionExemplar {
  /** Unique identifier for this exemplar */
  id: string
  /** Short label shown in catalog and logs */
  description: string
  /** Why this exemplar was chosen — what edge case it teaches */
  rationale: string
  /** Compact description of a hypothetical form */
  input: string
  /** Expected DataCollectionSpec JSON output */
  output: string
}

/**
 * Exemplar 1: Nested groups
 *
 * The base prompt sometimes flattens hierarchical form sections into a
 * single group. This exemplar shows that sub-sections (e.g., "Current"
 * and "Previous" under "Employment") should be separate groups.
 */
const nestedGroups: ExtractionExemplar = {
  id: 'nested-groups',
  description: 'Employment history with current and previous sub-sections',
  rationale:
    'Teaches the model to preserve hierarchical grouping rather than flattening related sections into one group.',
  input:
    'Section 4: Employment History. Sub-section A — Current Employment: Employer Name, Job Title, Start Date, Supervisor Name, Supervisor Phone. Sub-section B — Previous Employment: Employer Name, Job Title, Start Date, End Date, Reason for Leaving.',
  output: JSON.stringify({
    id: 'employment-history',
    title: 'Employment History',
    description: 'Current and previous employment details.',
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
          {
            id: 'current-job-title',
            fieldName: 'currentJobTitle',
            label: 'Job Title',
            fieldType: 'text',
            required: true,
          },
          {
            id: 'current-start-date',
            fieldName: 'currentStartDate',
            label: 'Start Date',
            fieldType: 'date',
            required: true,
          },
          {
            id: 'current-supervisor-name',
            fieldName: 'currentSupervisorName',
            label: 'Supervisor Name',
            fieldType: 'text',
            required: false,
          },
          {
            id: 'current-supervisor-phone',
            fieldName: 'currentSupervisorPhone',
            label: 'Supervisor Phone',
            fieldType: 'phone',
            required: false,
          },
        ],
      },
      {
        id: 'previous-employment',
        title: 'Previous Employment',
        requirements: [
          {
            id: 'previous-employer-name',
            fieldName: 'previousEmployerName',
            label: 'Employer Name',
            fieldType: 'text',
            required: true,
          },
          {
            id: 'previous-job-title',
            fieldName: 'previousJobTitle',
            label: 'Job Title',
            fieldType: 'text',
            required: true,
          },
          {
            id: 'previous-start-date',
            fieldName: 'previousStartDate',
            label: 'Start Date',
            fieldType: 'date',
            required: true,
          },
          {
            id: 'previous-end-date',
            fieldName: 'previousEndDate',
            label: 'End Date',
            fieldType: 'date',
            required: true,
          },
          {
            id: 'previous-reason-leaving',
            fieldName: 'previousReasonForLeaving',
            label: 'Reason for Leaving',
            fieldType: 'text',
            required: false,
          },
        ],
      },
    ],
  }),
}

/**
 * Exemplar 2: Sensitivity labels
 *
 * The base prompt often omits or incorrectly assigns sensitivity levels.
 * This exemplar shows correct PII classification for fields containing
 * SSN, date of birth, and other personally identifiable information.
 */
const sensitivityLabels: ExtractionExemplar = {
  id: 'sensitivity-labels',
  description: 'Personal information section with PII fields',
  rationale:
    'Teaches the model to assign correct sensitivity levels: SSN and alien number are pii, date of birth is high, name is medium, and general fields are low.',
  input:
    'Section 1: Applicant Information. Full Legal Name, Social Security Number (SSN), Date of Birth, USCIS Alien Number (A-Number), Email Address, Preferred Language.',
  output: JSON.stringify({
    id: 'applicant-information',
    title: 'Applicant Information',
    description: 'Personal details for the applicant.',
    groups: [
      {
        id: 'applicant-details',
        title: 'Applicant Details',
        requirements: [
          {
            id: 'full-legal-name',
            fieldName: 'fullLegalName',
            label: 'Full Legal Name',
            fieldType: 'text',
            required: true,
            sensitivity: 'medium',
          },
          {
            id: 'ssn',
            fieldName: 'socialSecurityNumber',
            label: 'Social Security Number (SSN)',
            fieldType: 'text',
            required: true,
            sensitivity: 'pii',
          },
          {
            id: 'date-of-birth',
            fieldName: 'dateOfBirth',
            label: 'Date of Birth',
            fieldType: 'date',
            required: true,
            sensitivity: 'high',
          },
          {
            id: 'alien-number',
            fieldName: 'uscisAlienNumber',
            label: 'USCIS Alien Number (A-Number)',
            fieldType: 'text',
            required: false,
            sensitivity: 'pii',
          },
          {
            id: 'email-address',
            fieldName: 'emailAddress',
            label: 'Email Address',
            fieldType: 'email',
            required: false,
            sensitivity: 'medium',
          },
          {
            id: 'preferred-language',
            fieldName: 'preferredLanguage',
            label: 'Preferred Language',
            fieldType: 'text',
            required: false,
            sensitivity: 'low',
          },
        ],
      },
    ],
  }),
}

/**
 * Exemplar 3: Conditional fields
 *
 * The base prompt rarely emits `condition` on groups or requirements.
 * This exemplar shows that some fields should only appear based on
 * a prior answer (e.g., citizenship status determines which ID fields
 * are required).
 */
const conditionalFields: ExtractionExemplar = {
  id: 'conditional-fields',
  description: 'Citizenship section with conditional document fields',
  rationale:
    'Teaches the model to emit condition objects when fields are only relevant based on a prior answer.',
  input:
    'Section 2: Citizenship Status. Select one: U.S. Citizen, Lawful Permanent Resident, Work-Authorized Alien. If Lawful Permanent Resident, provide USCIS Number. If Work-Authorized Alien, provide Work Authorization Expiration Date and Foreign Passport Number.',
  output: JSON.stringify({
    id: 'citizenship-status',
    title: 'Citizenship Status',
    description: 'Immigration and work authorization details.',
    groups: [
      {
        id: 'citizenship-selection',
        title: 'Citizenship Status',
        requirements: [
          {
            id: 'citizenship-status',
            fieldName: 'citizenshipStatus',
            label: 'Citizenship Status',
            fieldType: 'choice',
            required: true,
            choices: [
              'U.S. Citizen',
              'Lawful Permanent Resident',
              'Work-Authorized Alien',
            ],
          },
        ],
      },
      {
        id: 'lpr-details',
        title: 'Permanent Resident Details',
        condition: {
          field: 'citizenshipStatus',
          operator: 'equals',
          value: 'Lawful Permanent Resident',
        },
        requirements: [
          {
            id: 'lpr-uscis-number',
            fieldName: 'lprUscisNumber',
            label: 'USCIS Number',
            fieldType: 'text',
            required: true,
            sensitivity: 'pii',
          },
        ],
      },
      {
        id: 'alien-details',
        title: 'Work Authorization Details',
        condition: {
          field: 'citizenshipStatus',
          operator: 'equals',
          value: 'Work-Authorized Alien',
        },
        requirements: [
          {
            id: 'work-auth-expiration',
            fieldName: 'workAuthorizationExpiration',
            label: 'Work Authorization Expiration Date',
            fieldType: 'date',
            required: true,
          },
          {
            id: 'foreign-passport-number',
            fieldName: 'foreignPassportNumber',
            label: 'Foreign Passport Number',
            fieldType: 'text',
            required: true,
            sensitivity: 'pii',
          },
        ],
      },
    ],
  }),
}

export const exemplars: ExtractionExemplar[] = [
  nestedGroups,
  sensitivityLabels,
  conditionalFields,
]
