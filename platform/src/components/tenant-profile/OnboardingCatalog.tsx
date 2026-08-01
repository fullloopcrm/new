'use client'

/**
 * "Add your first services, projects, and products" — lives inside the
 * ProfileWizard's Services & Pricing step (the one step PROFILE_FIELDS
 * deliberately has no field for: pricing was always meant to be "its own
 * editor", but that editor was never reachable from onboarding, so this step
 * rendered completely blank). Talks straight to /api/catalog -- the exact
 * same service_types table the real admin Catalog tab (dashboard/sales/
 * CatalogTab.tsx) manages. No separate/duplicate item list.
 *
 * Deliberately lean compared to the full Catalog tab (no materials, cost/
 * margin, image upload) -- onboarding needs "what do you sell and what does
 * it cost", not the full SKU editor. Anything added here is a real
 * service_types row the tenant (or admin) can refine later in Catalog.
 */
import { useEffect, useState } from 'react'

type Item = {
  id: string
  name: string
  item_type: 'service' | 'project' | 'product' | 'equipment' | string
  per_unit: string
  price_cents: number
  description: string | null
}

const TYPE_LABELS: Record<string, string> = { service: 'Labor', project: 'Project', product: 'Product', equipment: 'Equipment' }
const TYPES = ['service', 'project', 'product', 'equipment'] as const
const UNITS: Array<{ v: string; l: string }> = [
  { v: 'hour', l: 'per hour' },
  { v: 'job', l: 'flat / per job' },
  { v: 'unit', l: 'per unit (each)' },
  { v: 'sqft', l: 'per sq ft' },
  { v: 'visit', l: 'per visit' },
]

const money = (cents: number) => '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: cents % 100 ? 2 : 0 })

export default function OnboardingCatalog({ token }: { token?: string }) {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [itemType, setItemType] = useState<(typeof TYPES)[number]>('service')
  const [perUnit, setPerUnit] = useState('job')
  const [price, setPrice] = useState('')

  const withToken = (url: string) => (token ? `${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}` : url)

  const load = () => {
    fetch(withToken('/api/catalog'))
      .then((r) => r.json())
      .then((d) => setItems(d.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }
  useEffect(load, [token])

  const addItem = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          name: name.trim(),
          item_type: itemType,
          per_unit: perUnit,
          price_cents: Math.round((Number(price) || 0) * 100),
        }),
      })
      if (res.ok) {
        setName(''); setPrice('')
        load()
      }
    } finally {
      setSaving(false)
    }
  }

  const removeItem = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
    await fetch(withToken(`/api/catalog?id=${id}`), { method: 'DELETE' }).catch(() => {})
  }

  return (
    <div>
      <p className="mb-1 text-sm text-slate-500">
        Add what you sell — a few services, projects, or products with a price. This goes straight into your real Catalog; you can add more or fine-tune pricing anytime.
      </p>
      <p className="mb-3 text-xs text-slate-400">
        ✨ Our AI drafts a short customer-facing description for each item automatically — review it below, and edit or rewrite it anytime in Catalog.
      </p>

      {!loading && items.length > 0 && (
        <div className="mb-4 divide-y divide-slate-100 rounded-lg border border-slate-200">
          {items.map((it) => (
            <div key={it.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <div className="min-w-0">
                <div>
                  <span className="font-medium text-slate-900">{it.name}</span>
                  <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    {TYPE_LABELS[it.item_type] || it.item_type}
                  </span>
                </div>
                {it.description && <p className="mt-0.5 truncate text-xs text-slate-500">{it.description}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-slate-600">{money(it.price_cents)} {it.per_unit !== 'job' ? `/ ${it.per_unit}` : ''}</span>
                <button type="button" onClick={() => removeItem(it.id)} className="text-xs text-slate-400 hover:text-red-500">Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-2 rounded-lg border border-dashed border-slate-300 p-3 sm:grid-cols-[1fr_auto_auto_auto_auto]">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Standard Cleaning, Deep Clean, Cleaning Supplies"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
        />
        <select value={itemType} onChange={(e) => setItemType(e.target.value as typeof itemType)} className="rounded-lg border border-slate-300 px-2 py-2 text-sm">
          {TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
        </select>
        <select value={perUnit} onChange={(e) => setPerUnit(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-2 text-sm">
          {UNITS.map((u) => <option key={u.v} value={u.v}>{u.l}</option>)}
        </select>
        <div className="relative">
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            inputMode="decimal"
            placeholder="0"
            className="w-24 rounded-lg border border-slate-300 py-2 pl-5 pr-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <button
          type="button"
          onClick={addItem}
          disabled={saving || !name.trim()}
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {saving ? 'Adding…' : '+ Add'}
        </button>
      </div>
    </div>
  )
}
