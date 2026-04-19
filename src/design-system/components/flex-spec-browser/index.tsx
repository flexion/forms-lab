import type { FC } from 'hono/jsx'
// biome-ignore format: keep on one line so the dep-rule parser (which is line-based) recognizes this as a type-only import
import type { DataCollectionSpec, RequirementGroup } from '../../../services/data-collection'
import type { FormPage, FormSpec } from '../../../services/forms/types'
import { resolveUrl } from '../../../shared/base-path'
import type { FieldConfidence } from '../../../types/models'
import { ConfidenceBadge } from '../flex-confidence-badge'

export interface SpecBrowserProps {
  dataSpec: DataCollectionSpec
  formSpec: FormSpec
  confidence?: FieldConfidence[]
  /** Links to source files (optional). When provided, section headings link out. */
  blobBasePath?: string
  /** Default expand state for panels. Defaults to `'all'`. */
  defaultExpanded?: 'all' | 'first' | 'none'
}

const pageDomId = (id: string) => `page-${id}`
const groupDomId = (id: string) => `group-${id}`

export const SpecBrowser: FC<SpecBrowserProps> = ({
  dataSpec,
  formSpec,
  confidence = [],
  blobBasePath,
  defaultExpanded = 'all',
}) => {
  const groupMap = new Map(dataSpec.groups.map((g) => [g.id, g]))
  const confidenceMap = new Map(confidence.map((c) => [c.fieldId, c]))

  return (
    <flex-spec-browser class="flex-spec-browser">
      <aside class="flex-spec-browser__sidebar">
        <nav class="flex-spec-browser__nav" aria-label="On this form">
          <h2 class="flex-spec-browser__nav-heading">On this form</h2>
          <ul class="flex-spec-browser__nav-list">
            {formSpec.pages.map((page, i) => (
              <li key={page.id} class="flex-spec-browser__nav-item">
                <a
                  class="flex-spec-browser__nav-link"
                  href={`#${pageDomId(page.id)}`}
                  data-spec-nav-link
                >
                  <span class="flex-spec-browser__nav-num">{i + 1}.</span>{' '}
                  {page.title}
                </a>
                <ul class="flex-spec-browser__nav-sublist">
                  {page.groups.map((gid) => {
                    const group = groupMap.get(gid)
                    if (!group) return null
                    return (
                      <li key={gid} class="flex-spec-browser__nav-item">
                        <a
                          class="flex-spec-browser__nav-link flex-spec-browser__nav-link--sub"
                          href={`#${groupDomId(gid)}`}
                          data-spec-nav-link
                        >
                          {group.title}
                        </a>
                      </li>
                    )
                  })}
                </ul>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <div class="flex-spec-browser__content">
        <section
          class="flex-spec-browser__section"
          aria-labelledby="spec-pages"
        >
          <h2 id="spec-pages" class="flex-spec-browser__section-heading">
            {blobBasePath ? (
              <a href={resolveUrl(`${blobBasePath}/forms/default/form.json`)}>
                Pages
              </a>
            ) : (
              'Pages'
            )}
          </h2>
          {formSpec.description && (
            <p class="text-muted">{formSpec.description}</p>
          )}
          <div class="flex-spec-browser__panels">
            {formSpec.pages.map((page, i) => (
              <PagePanel
                key={page.id}
                page={page}
                index={i}
                groupMap={groupMap}
                defaultOpen={isOpen(defaultExpanded, i)}
              />
            ))}
          </div>
        </section>

        <section
          class="flex-spec-browser__section"
          aria-labelledby="spec-groups"
        >
          <h2 id="spec-groups" class="flex-spec-browser__section-heading">
            {blobBasePath ? (
              <a href={resolveUrl(`${blobBasePath}/forms/default/spec.json`)}>
                Groups
              </a>
            ) : (
              'Groups'
            )}
          </h2>
          {dataSpec.description && (
            <p class="text-muted">{dataSpec.description}</p>
          )}
          <div class="flex-spec-browser__panels">
            {dataSpec.groups.map((group, i) => (
              <GroupPanel
                key={group.id}
                group={group}
                confidenceMap={confidenceMap}
                defaultOpen={isOpen(defaultExpanded, i)}
              />
            ))}
          </div>
        </section>
      </div>
    </flex-spec-browser>
  )
}

function isOpen(mode: 'all' | 'first' | 'none', index: number): boolean {
  if (mode === 'all') return true
  if (mode === 'first') return index === 0
  return false
}

const PagePanel: FC<{
  page: FormPage
  index: number
  groupMap: Map<string, RequirementGroup>
  defaultOpen: boolean
}> = ({ page, index, groupMap, defaultOpen }) => {
  const deliveryMode = page.deliveryMode ?? 'static'
  const pageGroups = page.groups
    .map((gid) => groupMap.get(gid))
    .filter((g): g is RequirementGroup => Boolean(g))
  const fieldCount = pageGroups.reduce(
    (sum, g) => sum + g.requirements.length,
    0,
  )

  return (
    <details
      id={pageDomId(page.id)}
      class="flex-spec-browser__panel"
      data-spec-panel
      data-panel-kind="page"
      {...(defaultOpen ? { open: true } : {})}
    >
      <summary class="flex-spec-browser__panel-summary">
        <span class="flex-spec-browser__panel-number">{index + 1}.</span>
        <span class="flex-spec-browser__panel-title">{page.title}</span>
        <span class="flex-spec-browser__panel-meta">
          <span
            class="flex-spec-browser__delivery"
            data-delivery={deliveryMode}
          >
            {deliveryMode.charAt(0).toUpperCase() + deliveryMode.slice(1)}
          </span>
          <span class="flex-spec-browser__panel-count">
            {pageGroups.length} group{pageGroups.length === 1 ? '' : 's'} ·{' '}
            {fieldCount} field{fieldCount === 1 ? '' : 's'}
          </span>
        </span>
      </summary>
      <div class="flex-spec-browser__panel-body">
        {page.description && <p class="text-muted">{page.description}</p>}
        {pageGroups.length === 0 ? (
          <p class="text-muted">No groups assigned to this page.</p>
        ) : (
          <ul class="flex-spec-browser__page-groups">
            {pageGroups.map((group) => (
              <li key={group.id} class="flex-spec-browser__page-group">
                <a
                  href={`#${groupDomId(group.id)}`}
                  class="flex-spec-browser__page-group-title"
                  data-spec-nav-link
                >
                  {group.title}
                </a>
                <ul class="flex-spec-browser__page-group-fields">
                  {group.requirements.map((req) => (
                    <li key={req.id}>
                      <span>{req.label}</span>
                      <span class="text-muted text-sm">{req.fieldType}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  )
}

const GroupPanel: FC<{
  group: RequirementGroup
  confidenceMap: Map<string, FieldConfidence>
  defaultOpen: boolean
}> = ({ group, confidenceMap, defaultOpen }) => {
  return (
    <details
      id={groupDomId(group.id)}
      class="flex-spec-browser__panel"
      data-spec-panel
      data-panel-kind="group"
      {...(defaultOpen ? { open: true } : {})}
    >
      <summary class="flex-spec-browser__panel-summary">
        <span class="flex-spec-browser__panel-title">{group.title}</span>
        <span class="flex-spec-browser__panel-meta">
          <span class="flex-spec-browser__panel-count">
            {group.requirements.length} field
            {group.requirements.length === 1 ? '' : 's'}
          </span>
        </span>
      </summary>
      <div class="flex-spec-browser__panel-body">
        {group.description && <p class="text-muted">{group.description}</p>}
        <div class="flex-spec-browser__table-wrap">
          <table class="flex-table" data-variant="borderless" data-stacked>
            <thead>
              <tr>
                <th scope="col">Field</th>
                <th scope="col">Type</th>
                <th scope="col">Required</th>
                <th scope="col">Conditions</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {group.requirements.map((req) => {
                const conf = confidenceMap.get(req.id)
                return (
                  <tr key={req.id}>
                    <td data-label="Field">
                      <strong>{req.label}</strong>
                      {req.helpText && (
                        <div class="text-muted text-sm">{req.helpText}</div>
                      )}
                    </td>
                    <td data-label="Type">
                      {req.fieldType.charAt(0).toUpperCase() +
                        req.fieldType.slice(1)}
                    </td>
                    <td data-label="Required">{req.required ? 'Yes' : 'No'}</td>
                    <td data-label="Conditions">
                      {req.condition ? (
                        <span class="flex-spec-browser__condition">
                          When {req.condition.field} {req.condition.operator}{' '}
                          {String(req.condition.value)}
                        </span>
                      ) : (
                        <span class="text-muted">&mdash;</span>
                      )}
                    </td>
                    <td data-label="Status">
                      {conf ? (
                        <ConfidenceBadge
                          confidence={conf.confidence}
                          flags={conf.flags}
                        />
                      ) : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </details>
  )
}
