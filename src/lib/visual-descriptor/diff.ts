import type { VisualNode, VisualDifference, PseudoElement } from './types'

function diffPseudo(
  refPseudo: PseudoElement | null,
  implPseudo: PseudoElement | null,
  path: string,
  pseudoName: string,
): VisualDifference[] {
  const differences: VisualDifference[] = []
  const pseudoPath = `${path}::${pseudoName}`

  if (refPseudo && !implPseudo) {
    differences.push({ path: pseudoPath, property: 'exists', expected: 'yes', actual: 'no' })
    return differences
  }
  if (!refPseudo && implPseudo) {
    differences.push({ path: pseudoPath, property: 'exists', expected: 'no', actual: 'yes' })
    return differences
  }
  if (!refPseudo || !implPseudo) return differences

  if (refPseudo.content !== implPseudo.content) {
    differences.push({ path: pseudoPath, property: 'content', expected: refPseudo.content, actual: implPseudo.content })
  }

  for (const prop of Object.keys(refPseudo.styles)) {
    const expected = refPseudo.styles[prop]
    const actual = implPseudo.styles[prop]
    if (expected !== actual) {
      differences.push({ path: pseudoPath, property: prop, expected, actual: actual ?? '(missing)' })
    }
  }

  return differences
}

export interface DiffOptions {
  /** Attribute names to skip when comparing (for known convention differences). */
  ignoreAttributes?: string[]
  /** CSS property names to skip when comparing (for values that vary by font/rendering). */
  ignoreProperties?: string[]
  /** Box model keys to skip (e.g., 'width', 'height' for content-dependent dimensions). */
  ignoreBoxKeys?: string[]
  /** Skip pseudo-element comparison (for components that intentionally omit USWDS pseudo icons). */
  ignorePseudos?: boolean
}

/**
 * Diff two VisualDescriptor trees. Returns a list of differences.
 * Compares styles, box model, attributes, pseudo-elements, and children.
 */
export function diff(
  reference: VisualNode,
  implementation: VisualNode,
  path: string = '',
  options: DiffOptions = {},
): VisualDifference[] {
  const differences: VisualDifference[] = []
  const currentPath = path || reference.tag + (reference.classes.length ? '.' + reference.classes.join('.') : '')

  // Structural check
  if (reference.tag !== implementation.tag) {
    differences.push({
      path: currentPath,
      property: 'tag',
      expected: reference.tag,
      actual: implementation.tag,
    })
    return differences
  }

  // Compare attributes
  const ignoreAttrs = new Set(options.ignoreAttributes ?? [])
  const allAttrKeys = new Set([...Object.keys(reference.attributes), ...Object.keys(implementation.attributes)])
  for (const attr of allAttrKeys) {
    if (ignoreAttrs.has(attr)) continue
    const expected = reference.attributes[attr]
    const actual = implementation.attributes[attr]
    if (expected !== actual) {
      differences.push({
        path: currentPath,
        property: `attr:${attr}`,
        expected: expected ?? '(absent)',
        actual: actual ?? '(absent)',
      })
    }
  }

  // Compare styles
  const ignoreProps = new Set(options.ignoreProperties ?? [])
  for (const prop of Object.keys(reference.styles)) {
    if (ignoreProps.has(prop)) continue
    const expected = reference.styles[prop]
    const actual = implementation.styles[prop]
    if (expected !== actual) {
      differences.push({ path: currentPath, property: prop, expected, actual: actual ?? '(missing)' })
    }
  }

  // Check for extra properties in implementation not in reference
  for (const prop of Object.keys(implementation.styles)) {
    if (ignoreProps.has(prop)) continue
    if (!(prop in reference.styles)) {
      differences.push({ path: currentPath, property: prop, expected: '(not set)', actual: implementation.styles[prop] })
    }
  }

  // Compare box model
  const ignoreBox = new Set(options.ignoreBoxKeys ?? [])
  for (const key of Object.keys(reference.box) as (keyof VisualNode['box'])[]) {
    if (ignoreBox.has(key)) continue
    const expected = reference.box[key]
    const actual = implementation.box[key]
    if (expected !== actual) {
      differences.push({
        path: currentPath,
        property: `box.${key}`,
        expected: String(expected),
        actual: String(actual),
      })
    }
  }

  // Compare pseudo-elements
  if (!options.ignorePseudos) {
    differences.push(...diffPseudo(reference.before, implementation.before, currentPath, 'before'))
    differences.push(...diffPseudo(reference.after, implementation.after, currentPath, 'after'))
  }

  // Compare children count
  if (reference.children.length !== implementation.children.length) {
    differences.push({
      path: currentPath,
      property: 'children.length',
      expected: String(reference.children.length),
      actual: String(implementation.children.length),
    })
    return differences
  }

  // Recurse into children
  for (let i = 0; i < reference.children.length; i++) {
    const refChild = reference.children[i]
    const implChild = implementation.children[i]
    const childPath = currentPath + ' > ' + refChild.tag +
      (refChild.classes.length ? '.' + refChild.classes.join('.') : '') +
      (reference.children.length > 1 ? `:nth-child(${i + 1})` : '')
    differences.push(...diff(refChild, implChild, childPath, options))
  }

  return differences
}
