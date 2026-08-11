export type VariantSkuMap = Record<string, { externalSku: string; externalVariantId: string }>

// Keeps only entries with a non-empty SKU, keyed "<color>|<size>" to match
// the dispatch route's lookup (src/lib/dropship/dispatch.ts).
export function sanitizeVariantSkus(v: unknown): VariantSkuMap {
  if (!v || typeof v !== 'object') return {}
  const out: VariantSkuMap = {}
  for (const [key, entry] of Object.entries(v as Record<string, unknown>)) {
    if (!entry || typeof entry !== 'object') continue
    const externalSku = typeof (entry as Record<string, unknown>).externalSku === 'string' ? (entry as Record<string, string>).externalSku.trim() : ''
    if (!externalSku) continue
    const externalVariantId = typeof (entry as Record<string, unknown>).externalVariantId === 'string' ? (entry as Record<string, string>).externalVariantId.trim() : ''
    out[key] = { externalSku, externalVariantId }
  }
  return out
}
