'use client'

/**
 * Per-variant supplier SKU matrix for a dropshipped product. A product with
 * color/size options needs a distinct supplier SKU per combination so the
 * dispatch route (POST /api/shop/orders/[id]/dispatch) can route a
 * "Large / Black" order to a different supplier line than "Small / Red" —
 * see src/lib/dropship/registry.ts and the dispatch route's resolveSku().
 * Stored on service_types.dropship_variant_skus as { "<color>|<size>":
 * { externalSku, externalVariantId } }. Combos with no color (size-only
 * product) or no size (color-only product) use "" for the missing half of
 * the key, matching the dispatch route's key construction.
 */

export type VariantSkuMap = Record<string, { externalSku: string; externalVariantId: string }>

function parseOptionList(v: string): string[] {
  return v.split(',').map((s) => s.trim()).filter(Boolean)
}

function combosFor(colorOptions: string, sizeOptions: string): Array<{ color: string; size: string; label: string }> {
  const colors = parseOptionList(colorOptions)
  const sizes = parseOptionList(sizeOptions)
  if (colors.length && sizes.length) {
    return colors.flatMap((c) => sizes.map((s) => ({ color: c, size: s, label: `${c} / ${s}` })))
  }
  if (colors.length) return colors.map((c) => ({ color: c, size: '', label: c }))
  if (sizes.length) return sizes.map((s) => ({ color: '', size: s, label: s }))
  return []
}

type Props = {
  colorOptions: string
  sizeOptions: string
  value: VariantSkuMap
  onChange: (next: VariantSkuMap) => void
}

export default function DropshipVariantSkuEditor({ colorOptions, sizeOptions, value, onChange }: Props) {
  const combos = combosFor(colorOptions, sizeOptions)
  if (!combos.length) return null

  const inp: React.CSSProperties = { padding: '6px 8px', border: '1px solid var(--sl-line,#e6e6e0)', borderRadius: 6, fontSize: 12, color: 'var(--sl-ink)', width: '100%', background: '#fff' }
  const lbl: React.CSSProperties = { fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--sl-muted)', fontWeight: 600, marginBottom: 3, display: 'block' }

  function setEntry(key: string, field: 'externalSku' | 'externalVariantId', v: string) {
    const current = value[key] || { externalSku: '', externalVariantId: '' }
    onChange({ ...value, [key]: { ...current, [field]: v } })
  }

  return (
    <div style={{ marginTop: 8 }}>
      <label style={lbl}>Per-variant supplier SKUs</label>
      <p style={{ fontSize: 11, color: 'var(--sl-muted)', margin: '0 0 8px' }}>
        Give each color/size combo its own supplier SKU so orders route to the right item. Leave a row blank to fall back to the single Supplier SKU above for that combo.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {combos.map(({ color, size, label }) => {
          const key = `${color}|${size}`
          const entry = value[key] || { externalSku: '', externalVariantId: '' }
          return (
            <div key={key} style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1.2fr', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--sl-ink)' }}>{label}</span>
              <input style={inp} value={entry.externalSku} onChange={(e) => setEntry(key, 'externalSku', e.target.value)} placeholder="Supplier SKU / product ID" />
              <input style={inp} value={entry.externalVariantId} onChange={(e) => setEntry(key, 'externalVariantId', e.target.value)} placeholder="Supplier variant ID (optional)" />
            </div>
          )
        })}
      </div>
    </div>
  )
}
