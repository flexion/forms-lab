interface VariantListItem {
  id: string
  metadata: { name: string }
}

interface VariantListable {
  list(): VariantListItem[]
}

interface LogEntryLike {
  source: string
  variantId?: string
}

export function resolveVariantBadge(
  registry: VariantListable,
  variantId: string,
): { variantId: string; variantName: string } {
  const meta = registry.list().find((v) => v.id === variantId)
  return { variantId, variantName: meta?.metadata.name ?? variantId }
}

export function resolveShapingBadgeFromLog(
  log: LogEntryLike[],
  registry: VariantListable,
): { variantId: string; variantName: string } | null {
  const lastLlmEntry = [...log]
    .reverse()
    .find((e) => e.source === 'llm' && e.variantId)
  if (!lastLlmEntry?.variantId) return null
  return resolveVariantBadge(registry, lastLlmEntry.variantId)
}
