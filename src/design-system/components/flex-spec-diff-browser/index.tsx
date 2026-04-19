/**
 * flex-spec-diff-browser — single-column annotated diff of a form spec.
 *
 * Replaces the previous two-browser side-by-side Preview by rendering the
 * *head* spec as the primary tree and overlaying change badges, before/after
 * rows, and removed items from the base spec in their original positions.
 *
 * The component is stateless presentation: it consumes the already-computed
 * list of SpecChange entries produced by services/forms/comparison and maps
 * each change to its DOM row. Interaction is native <details> — no client JS.
 */

import type { FC } from 'hono/jsx'
// biome-ignore format: keep on one line so the dep-rule parser (which is line-based) recognizes this as a type-only import
import type { DataCollectionSpec, DataRequirement, RequirementGroup } from '../../../services/data-collection'
// biome-ignore format: keep on one line so the dep-rule parser (which is line-based) recognizes this as a type-only import
// biome-ignore format: keep on one line so the dep-rule parser (which is line-based) recognizes this as a type-only import
import type { ChangeCategory, FormPage, FormSpec, SpecChange } from '../../../services/forms'

export type RevealMode = 'changed' | 'all'

export interface SpecDiffBrowserProps {
  /**
   * The base specs are used to source "was" values for modified/renamed
   * items and to render removed items that no longer exist on head. Both
   * may be null for the initial-import case.
   */
  baseDataSpec: DataCollectionSpec | null
  baseFormSpec: FormSpec | null
  /** Head specs drive the rendering — they are what's being promoted. */
  headDataSpec: DataCollectionSpec
  headFormSpec: FormSpec
  changes: SpecChange[]
  /**
   * How aggressively to collapse unchanged items.
   * - 'changed': panels with no changes collapse to a summary row
   * - 'all': every panel starts open
   *
   * When undefined, the component picks based on the shape of the diff
   * (see inferRevealMode).
   */
  revealMode?: RevealMode
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const pageDomId = (id: string) => `page-${id}`
const groupDomId = (id: string) => `group-${id}`
const fieldDomId = (id: string) => `field-${id}`

const CATEGORY_BADGE: Record<ChangeCategory, string> = {
  added: '+ New',
  removed: '- Removed',
  modified: '~ Modified',
  moved: '↕ Moved',
  renamed: '~ Renamed',
}

const CATEGORY_SUMMARY_LABEL: Record<ChangeCategory, string> = {
  added: 'added',
  removed: 'removed',
  modified: 'modified',
  moved: 'moved',
  renamed: 'renamed',
}

// Order used by the overview strip — matches the semantic diff grouping.
const SUMMARY_ORDER: ChangeCategory[] = [
  'added',
  'modified',
  'renamed',
  'moved',
  'removed',
]

function pluralizeChanges(n: number, label: string): string {
  return `${n} ${label}`
}

// ---------------------------------------------------------------------------
// Change indexing
//
// The component walks the head spec (plus a few base-only entries for removed
// items) and needs to ask "is *this* page/group/field changed?" on every
// node. A flat scan of props.changes per node would be O(N·M); instead we
// build small maps keyed by DOM id up front.
// ---------------------------------------------------------------------------

interface ChangeIndex {
  byPage: Map<string, SpecChange[]>
  byGroup: Map<string, SpecChange[]>
  byField: Map<string, SpecChange[]>
  // Removed items that exist only on base — rendered inline in their original
  // positions so the reviewer can see what disappeared.
  removedPageIds: Set<string>
  removedGroupIdsInPage: Map<string, string[]>
  removedFieldIdsInGroup: Map<string, string[]>
}

function indexChanges(changes: SpecChange[]): ChangeIndex {
  const byPage = new Map<string, SpecChange[]>()
  const byGroup = new Map<string, SpecChange[]>()
  const byField = new Map<string, SpecChange[]>()
  const removedPageIds = new Set<string>()
  const removedGroupIdsInPage = new Map<string, string[]>()
  const removedFieldIdsInGroup = new Map<string, string[]>()

  const push = (map: Map<string, SpecChange[]>, key: string, c: SpecChange) => {
    const existing = map.get(key)
    if (existing) existing.push(c)
    else map.set(key, [c])
  }

  for (const change of changes) {
    const pageSeg = change.path.find((p) => p.startsWith('page:'))
    const groupSeg = change.path.find((p) => p.startsWith('group:'))
    const fieldSeg = change.path.find((p) => p.startsWith('field:'))

    if (fieldSeg) {
      const fid = fieldSeg.slice('field:'.length)
      push(byField, fid, change)
      if (change.category === 'removed' && groupSeg) {
        const gid = groupSeg.slice('group:'.length)
        const list = removedFieldIdsInGroup.get(gid) ?? []
        if (!list.includes(fid)) list.push(fid)
        removedFieldIdsInGroup.set(gid, list)
      }
      continue
    }
    if (groupSeg) {
      const gid = groupSeg.slice('group:'.length)
      push(byGroup, gid, change)
      if (pageSeg && change.category === 'removed') {
        const pid = pageSeg.slice('page:'.length)
        const list = removedGroupIdsInPage.get(pid) ?? []
        if (!list.includes(gid)) list.push(gid)
        removedGroupIdsInPage.set(pid, list)
      }
      continue
    }
    if (pageSeg) {
      const pid = pageSeg.slice('page:'.length)
      push(byPage, pid, change)
      if (change.category === 'removed') {
        removedPageIds.add(pid)
      }
    }
  }

  return {
    byPage,
    byGroup,
    byField,
    removedPageIds,
    removedGroupIdsInPage,
    removedFieldIdsInGroup,
  }
}

/**
 * Pick the strongest category when a single node has more than one change
 * (e.g. a page that was both modified and moved — show "modified"). The
 * ordering here is intentional: changes that alter content win over
 * changes that only alter position.
 */
const CATEGORY_PRIORITY: ChangeCategory[] = [
  'removed',
  'added',
  'modified',
  'renamed',
  'moved',
]

function dominantCategory(changes: SpecChange[]): ChangeCategory | null {
  if (changes.length === 0) return null
  for (const cat of CATEGORY_PRIORITY) {
    if (changes.some((c) => c.category === cat)) return cat
  }
  return changes[0].category
}

// ---------------------------------------------------------------------------
// Reveal-mode heuristic
//
// Cheap default: if we have no base context to compare against (initial
// import) there's nothing useful to collapse, so open everything. Otherwise
// default to 'changed' and let unchanged panels collapse.
// ---------------------------------------------------------------------------

function inferRevealMode(props: SpecDiffBrowserProps): RevealMode {
  if (props.revealMode) return props.revealMode
  if (props.baseDataSpec === null || props.baseFormSpec === null) return 'all'
  return 'changed'
}

// ---------------------------------------------------------------------------
// Overview strip (top of tab): counts + jump-links to changed pages
// ---------------------------------------------------------------------------

interface OverviewProps {
  changes: SpecChange[]
  headPages: FormPage[]
  index: ChangeIndex
  basePages: FormPage[]
}

const Overview: FC<OverviewProps> = ({
  changes,
  headPages,
  index,
  basePages,
}) => {
  const counts: Record<ChangeCategory, number> = {
    added: 0,
    removed: 0,
    modified: 0,
    moved: 0,
    renamed: 0,
  }
  for (const c of changes) counts[c.category]++

  const summaryParts = SUMMARY_ORDER.filter((cat) => counts[cat] > 0).map(
    (cat) => pluralizeChanges(counts[cat], CATEGORY_SUMMARY_LABEL[cat]),
  )

  // Jump-list: pages that have descendant changes (including removed pages,
  // which live in base order). We deliberately skip pages whose only signal
  // is "moved" on the page itself — moved pages still appear in the head
  // tree; we want this list to point to where *work* lives.
  const changedHeadPages = headPages.filter((p) => {
    const pageChanges = index.byPage.get(p.id) ?? []
    const nonMove = pageChanges.some((c) => c.category !== 'moved')
    const hasGroupChange = p.groups.some(
      (gid) =>
        (index.byGroup.get(gid)?.length ?? 0) > 0 ||
        (index.removedFieldIdsInGroup.get(gid)?.length ?? 0) > 0 ||
        hasFieldChangesInGroup(gid, index),
    )
    return nonMove || hasGroupChange
  })
  const removedPages = basePages.filter((p) => index.removedPageIds.has(p.id))
  const jumpTargets = [...changedHeadPages, ...removedPages]

  if (changes.length === 0) {
    return (
      <div class="flex-spec-diff-browser__overview">
        <p class="flex-spec-diff-browser__overview-empty">
          These refs are identical.
        </p>
      </div>
    )
  }

  return (
    <div class="flex-spec-diff-browser__overview">
      <p class="flex-spec-diff-browser__overview-counts">
        {summaryParts.map((part, i) => (
          <>
            {i > 0 ? (
              <span
                class="flex-spec-diff-browser__overview-sep"
                aria-hidden="true"
              >
                {' · '}
              </span>
            ) : null}
            <span>{part}</span>
          </>
        ))}
      </p>
      {jumpTargets.length > 0 ? (
        <p class="flex-spec-diff-browser__overview-jumps">
          <span class="flex-spec-diff-browser__overview-jumps-label">
            Pages with changes:
          </span>{' '}
          {jumpTargets.map((p, i) => (
            <>
              {i > 0 ? (
                <span
                  class="flex-spec-diff-browser__overview-sep"
                  aria-hidden="true"
                >
                  {' · '}
                </span>
              ) : null}
              <a
                class="flex-spec-diff-browser__overview-jump"
                href={`#${pageDomId(p.id)}`}
              >
                {p.title}
              </a>
            </>
          ))}
        </p>
      ) : null}
    </div>
  )
}

function hasFieldChangesInGroup(groupId: string, index: ChangeIndex): boolean {
  // Any field changes sitting under this group? We don't have a direct
  // group->fields lookup from just the change index, so we scan the flat
  // field map looking for entries whose changes mention this group id.
  for (const [, changes] of index.byField) {
    if (changes.some((c) => c.path.some((seg) => seg === `group:${groupId}`))) {
      return true
    }
  }
  return false
}

// ---------------------------------------------------------------------------
// Change badge + indicator dot
// ---------------------------------------------------------------------------

const ChangeBadge: FC<{ category: ChangeCategory }> = ({ category }) => {
  // The badge text itself (e.g. "+ New", "- Removed") is descriptive, so
  // no aria-label is needed. The data-change attribute drives styling only.
  return (
    <span class="flex-spec-diff-browser__badge" data-change={category}>
      {CATEGORY_BADGE[category]}
    </span>
  )
}

const PanelIndicator: FC<{ category: ChangeCategory }> = ({ category }) => {
  return (
    <span
      class="flex-change-indicator"
      data-variant={
        category === 'removed'
          ? 'removed'
          : category === 'added'
            ? 'added'
            : 'modified'
      }
      role="status"
      aria-label={`${category} change`}
    >
      <span class="flex-change-indicator__dot" aria-hidden="true" />
    </span>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const SpecDiffBrowser: FC<SpecDiffBrowserProps> = (props) => {
  const { baseDataSpec, baseFormSpec, headDataSpec, headFormSpec, changes } =
    props
  const revealMode = inferRevealMode(props)
  const index = indexChanges(changes)

  const headGroupMap = new Map(headDataSpec.groups.map((g) => [g.id, g]))
  const baseGroupMap = new Map(
    (baseDataSpec?.groups ?? []).map((g) => [g.id, g]),
  )
  const basePages = baseFormSpec?.pages ?? []
  const basePageMap = new Map(basePages.map((p) => [p.id, p]))

  // Splice removed pages back into their original base positions so they
  // appear in a coherent spot rather than tacked on at the end.
  const mergedPages = mergeWithRemovedPages(
    headFormSpec.pages,
    basePages,
    index.removedPageIds,
  )

  return (
    <flex-spec-diff-browser class="flex-spec-diff-browser">
      <Overview
        changes={changes}
        headPages={headFormSpec.pages}
        basePages={basePages}
        index={index}
      />

      <div class="flex-spec-diff-browser__panels">
        {mergedPages.map((entry, i) =>
          entry.kind === 'head' ? (
            <PagePanel
              key={entry.page.id}
              page={entry.page}
              index={i}
              headGroupMap={headGroupMap}
              baseGroupMap={baseGroupMap}
              basePage={basePageMap.get(entry.page.id) ?? null}
              changeIndex={index}
              revealMode={revealMode}
            />
          ) : (
            <RemovedPagePanel
              key={entry.page.id}
              page={entry.page}
              index={i}
              baseGroupMap={baseGroupMap}
            />
          ),
        )}
      </div>
    </flex-spec-diff-browser>
  )
}

// A page in the rendered tree is either "from head" (the common case,
// possibly modified or added) or "removed from base" (stitched back in).
type MergedPage =
  | { kind: 'head'; page: FormPage }
  | { kind: 'removed'; page: FormPage }

function mergeWithRemovedPages(
  headPages: FormPage[],
  basePages: FormPage[],
  removedIds: Set<string>,
): MergedPage[] {
  if (removedIds.size === 0) {
    return headPages.map((page) => ({ kind: 'head' as const, page }))
  }
  // Walk the head list; interleave removed base pages at the position they
  // would have held in base. This keeps the reading order close to the
  // reviewer's mental model of "here's the form, with a gap where X was."
  const result: MergedPage[] = []
  const headIds = new Set(headPages.map((p) => p.id))
  let bIdx = 0
  for (const head of headPages) {
    // Insert any removed base pages that originally appeared before `head`
    while (
      bIdx < basePages.length &&
      basePages[bIdx].id !== head.id &&
      !headIds.has(basePages[bIdx].id)
    ) {
      if (removedIds.has(basePages[bIdx].id)) {
        result.push({ kind: 'removed', page: basePages[bIdx] })
      }
      bIdx++
    }
    result.push({ kind: 'head', page: head })
    // Skip past the matching base position if we landed on it
    if (bIdx < basePages.length && basePages[bIdx].id === head.id) bIdx++
  }
  // Any trailing removed pages
  while (bIdx < basePages.length) {
    if (removedIds.has(basePages[bIdx].id)) {
      result.push({ kind: 'removed', page: basePages[bIdx] })
    }
    bIdx++
  }
  return result
}

// ---------------------------------------------------------------------------
// Page panel (head side)
// ---------------------------------------------------------------------------

interface PagePanelProps {
  page: FormPage
  index: number
  headGroupMap: Map<string, RequirementGroup>
  baseGroupMap: Map<string, RequirementGroup>
  basePage: FormPage | null
  changeIndex: ChangeIndex
  revealMode: RevealMode
}

const PagePanel: FC<PagePanelProps> = ({
  page,
  index,
  headGroupMap,
  baseGroupMap,
  basePage,
  changeIndex,
  revealMode,
}) => {
  const pageChanges = changeIndex.byPage.get(page.id) ?? []
  const category = dominantCategory(pageChanges)
  const hasDescendantChange = pageHasAnyChange(page, changeIndex)
  const shouldOpen = revealMode === 'all' || hasDescendantChange

  // Groups to render inside the page body. Start from the head assignment;
  // splice in removed groups at their original base positions.
  const removedGroupIds = changeIndex.removedGroupIdsInPage.get(page.id) ?? []
  const headGroupIds = page.groups
  const basePageGroupIds = basePage?.groups ?? []
  const mergedGroupIds = mergeWithRemovedGroups(
    headGroupIds,
    basePageGroupIds,
    new Set(removedGroupIds),
  )

  return (
    <details
      id={pageDomId(page.id)}
      class="flex-spec-diff-browser__panel"
      data-panel-kind="page"
      data-change={category ?? 'none'}
      {...(shouldOpen ? { open: true } : {})}
    >
      <summary class="flex-spec-diff-browser__panel-summary">
        <span class="flex-spec-diff-browser__panel-number">{index + 1}.</span>
        <span class="flex-spec-diff-browser__panel-title">{page.title}</span>
        {category ? <PanelIndicator category={category} /> : null}
        {pageChanges.map((c) => (
          <ChangeBadge category={c.category} />
        ))}
      </summary>
      <div class="flex-spec-diff-browser__panel-body">
        {page.description ? <p class="text-muted">{page.description}</p> : null}
        {mergedGroupIds.length === 0 ? (
          <p class="text-muted">No groups on this page.</p>
        ) : (
          <div class="flex-spec-diff-browser__groups">
            {mergedGroupIds.map((entry) => {
              if (entry.kind === 'head') {
                const group = headGroupMap.get(entry.id)
                if (!group) return null
                return (
                  <GroupSection
                    key={group.id}
                    group={group}
                    baseGroup={baseGroupMap.get(group.id) ?? null}
                    changeIndex={changeIndex}
                    revealMode={revealMode}
                  />
                )
              }
              const baseGroup = baseGroupMap.get(entry.id)
              if (!baseGroup) return null
              return (
                <RemovedGroupSection key={baseGroup.id} group={baseGroup} />
              )
            })}
          </div>
        )}
      </div>
    </details>
  )
}

function pageHasAnyChange(page: FormPage, index: ChangeIndex): boolean {
  if ((index.byPage.get(page.id)?.length ?? 0) > 0) return true
  for (const gid of page.groups) {
    if ((index.byGroup.get(gid)?.length ?? 0) > 0) return true
    if ((index.removedFieldIdsInGroup.get(gid)?.length ?? 0) > 0) return true
    if (hasFieldChangesInGroup(gid, index)) return true
  }
  return false
}

type MergedGroup = { kind: 'head' | 'removed'; id: string }

function mergeWithRemovedGroups(
  headIds: string[],
  baseIds: string[],
  removedIds: Set<string>,
): MergedGroup[] {
  if (removedIds.size === 0) {
    return headIds.map((id) => ({ kind: 'head' as const, id }))
  }
  const result: MergedGroup[] = []
  const headSet = new Set(headIds)
  let bIdx = 0
  for (const hid of headIds) {
    while (
      bIdx < baseIds.length &&
      baseIds[bIdx] !== hid &&
      !headSet.has(baseIds[bIdx])
    ) {
      if (removedIds.has(baseIds[bIdx])) {
        result.push({ kind: 'removed', id: baseIds[bIdx] })
      }
      bIdx++
    }
    result.push({ kind: 'head', id: hid })
    if (bIdx < baseIds.length && baseIds[bIdx] === hid) bIdx++
  }
  while (bIdx < baseIds.length) {
    if (removedIds.has(baseIds[bIdx])) {
      result.push({ kind: 'removed', id: baseIds[bIdx] })
    }
    bIdx++
  }
  return result
}

// ---------------------------------------------------------------------------
// Removed page panel — rendered from base, strikethrough
// ---------------------------------------------------------------------------

const RemovedPagePanel: FC<{
  page: FormPage
  index: number
  baseGroupMap: Map<string, RequirementGroup>
}> = ({ page, index, baseGroupMap }) => {
  const pageGroups = page.groups
    .map((gid) => baseGroupMap.get(gid))
    .filter((g): g is RequirementGroup => Boolean(g))
  return (
    <details
      id={pageDomId(page.id)}
      class="flex-spec-diff-browser__panel"
      data-panel-kind="page"
      data-change="removed"
    >
      <summary class="flex-spec-diff-browser__panel-summary">
        <span class="flex-spec-diff-browser__panel-number">{index + 1}.</span>
        <span class="flex-spec-diff-browser__panel-title">{page.title}</span>
        <PanelIndicator category="removed" />
        <ChangeBadge category="removed" />
      </summary>
      <div class="flex-spec-diff-browser__panel-body">
        <div class="flex-spec-diff-browser__groups">
          {pageGroups.map((group) => (
            <RemovedGroupSection key={group.id} group={group} />
          ))}
        </div>
      </div>
    </details>
  )
}

// ---------------------------------------------------------------------------
// Group section
// ---------------------------------------------------------------------------

interface GroupSectionProps {
  group: RequirementGroup
  baseGroup: RequirementGroup | null
  changeIndex: ChangeIndex
  revealMode: RevealMode
}

const GroupSection: FC<GroupSectionProps> = ({
  group,
  baseGroup,
  changeIndex,
  revealMode,
}) => {
  const groupChanges = changeIndex.byGroup.get(group.id) ?? []
  const category = dominantCategory(groupChanges)
  const hasFieldChanges =
    group.requirements.some(
      (r) => (changeIndex.byField.get(r.id)?.length ?? 0) > 0,
    ) || (changeIndex.removedFieldIdsInGroup.get(group.id)?.length ?? 0) > 0
  const hasAnyChange = category !== null || hasFieldChanges
  const shouldOpen = revealMode === 'all' || hasAnyChange

  // Merge head requirements with removed (base-only) ones for rendering.
  const removedFieldIds = new Set(
    changeIndex.removedFieldIdsInGroup.get(group.id) ?? [],
  )
  const baseReqMap = new Map(
    (baseGroup?.requirements ?? []).map((r) => [r.id, r]),
  )
  const headReqIds = group.requirements.map((r) => r.id)
  const baseReqIds = baseGroup?.requirements.map((r) => r.id) ?? []
  const mergedFieldIds = mergeWithRemovedGroups(
    headReqIds,
    baseReqIds,
    removedFieldIds,
  )

  return (
    <details
      id={groupDomId(group.id)}
      class="flex-spec-diff-browser__group"
      data-change={category ?? 'none'}
      {...(shouldOpen ? { open: true } : {})}
    >
      <summary class="flex-spec-diff-browser__group-summary">
        <span class="flex-spec-diff-browser__group-title">{group.title}</span>
        {hasAnyChange ? (
          category ? (
            <PanelIndicator category={category} />
          ) : (
            <PanelIndicator category="modified" />
          )
        ) : null}
        {groupChanges.map((c) => (
          <ChangeBadge category={c.category} />
        ))}
        {!hasAnyChange ? (
          <span class="flex-spec-diff-browser__group-unchanged">
            {group.requirements.length} field
            {group.requirements.length === 1 ? '' : 's'}, unchanged
          </span>
        ) : null}
      </summary>
      <div class="flex-spec-diff-browser__group-body">
        {mergedFieldIds.map((entry) => {
          if (entry.kind === 'head') {
            const req = group.requirements.find((r) => r.id === entry.id)
            if (!req) return null
            return (
              <FieldRow
                key={req.id}
                field={req}
                baseField={baseReqMap.get(req.id) ?? null}
                changes={changeIndex.byField.get(req.id) ?? []}
              />
            )
          }
          const baseField = baseReqMap.get(entry.id)
          if (!baseField) return null
          return <RemovedFieldRow key={baseField.id} field={baseField} />
        })}
      </div>
    </details>
  )
}

const RemovedGroupSection: FC<{ group: RequirementGroup }> = ({ group }) => {
  return (
    <details
      id={groupDomId(group.id)}
      class="flex-spec-diff-browser__group"
      data-change="removed"
    >
      <summary class="flex-spec-diff-browser__group-summary">
        <span class="flex-spec-diff-browser__group-title">{group.title}</span>
        <PanelIndicator category="removed" />
        <ChangeBadge category="removed" />
      </summary>
      <div class="flex-spec-diff-browser__group-body">
        {group.requirements.map((req) => (
          <RemovedFieldRow key={req.id} field={req} />
        ))}
      </div>
    </details>
  )
}

// ---------------------------------------------------------------------------
// Field rows
// ---------------------------------------------------------------------------

const FieldRow: FC<{
  field: DataRequirement
  baseField: DataRequirement | null
  changes: SpecChange[]
}> = ({ field, baseField, changes }) => {
  const category = dominantCategory(changes)

  // For a modified/renamed field, render an inline "was" row from the base
  // values so the reviewer sees the before/after at a glance.
  const showBefore =
    baseField !== null && (category === 'modified' || category === 'renamed')

  return (
    <div
      id={fieldDomId(field.id)}
      class="flex-spec-diff-browser__field"
      data-change={category ?? 'none'}
    >
      <div class="flex-spec-diff-browser__field-row">
        <span class="flex-spec-diff-browser__field-label">{field.label}</span>
        <span class="flex-spec-diff-browser__field-type">
          {field.fieldType}
        </span>
        {field.required ? (
          <span class="flex-spec-diff-browser__field-required">required</span>
        ) : null}
        {category ? <ChangeBadge category={category} /> : null}
      </div>
      {showBefore && baseField ? (
        <div
          class="flex-spec-diff-browser__field-row flex-spec-diff-browser__field-row--was"
          data-was
        >
          <span class="flex-spec-diff-browser__field-was-prefix">was:</span>
          <span class="flex-spec-diff-browser__field-label">
            {baseField.label}
          </span>
          <span class="flex-spec-diff-browser__field-type">
            {baseField.fieldType}
          </span>
          {baseField.required ? (
            <span class="flex-spec-diff-browser__field-required">required</span>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

const RemovedFieldRow: FC<{ field: DataRequirement }> = ({ field }) => {
  return (
    <div
      id={fieldDomId(field.id)}
      class="flex-spec-diff-browser__field"
      data-change="removed"
    >
      <div class="flex-spec-diff-browser__field-row">
        <span class="flex-spec-diff-browser__field-label">{field.label}</span>
        <span class="flex-spec-diff-browser__field-type">
          {field.fieldType}
        </span>
        {field.required ? (
          <span class="flex-spec-diff-browser__field-required">required</span>
        ) : null}
        <ChangeBadge category="removed" />
      </div>
    </div>
  )
}
