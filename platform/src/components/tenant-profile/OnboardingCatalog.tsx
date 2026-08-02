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
import { useEffect, useMemo, useState } from 'react'
import { SERVICE_PRESETS, pricingShapeFor, labelForIndustry, type IndustryKey, type DefaultService } from '@/lib/industry-presets'

type Item = {
  id: string
  name: string
  item_type: 'service' | 'project' | 'product' | 'equipment' | string
  per_unit: string
  price_cents: number
  price_is_starting?: boolean
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
const UNIT_VALUES = new Set(UNITS.map((u) => u.v))

const money = (cents: number) => '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: cents % 100 ? 2 : 0 })

interface ParsedRow { name: string; price_cents: number; per_unit: string; line: string }

/** "Name, Price[, Unit]" per line -- tolerant of a leading $ on price, extra
 *  spaces, and an unrecognized/missing unit (falls back to flat/per-job).
 *  Blank lines and unparseable lines are silently skipped, not errored --
 *  a pasted price sheet always has header rows or stray blank lines. */
function parsePriceList(raw: string): { rows: ParsedRow[]; skipped: number } {
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean)
  const rows: ParsedRow[] = []
  let skipped = 0
  for (const line of lines) {
    const parts = line.split(',').map((p) => p.trim())
    const name = parts[0]
    const priceRaw = (parts[1] || '').replace(/[$,]/g, '')
    const price = Number(priceRaw)
    if (!name || !priceRaw || !Number.isFinite(price)) { skipped++; continue }
    const unitRaw = (parts[2] || '').toLowerCase()
    const per_unit = UNIT_VALUES.has(unitRaw) ? unitRaw : 'job'
    rows.push({ name, price_cents: Math.round(price * 100), per_unit, line })
  }
  return { rows, skipped }
}

export default function OnboardingCatalog({ token, industry }: { token?: string; industry?: string }) {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [itemType, setItemType] = useState<(typeof TYPES)[number]>('service')
  const [perUnit, setPerUnit] = useState('job')
  const [price, setPrice] = useState('')
  const [isStarting, setIsStarting] = useState(false)

  const [presetChecked, setPresetChecked] = useState<Set<string>>(new Set())
  const [presetLoading, setPresetLoading] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkResult, setBulkResult] = useState<{ added: number; skipped: number } | null>(null)

  const withToken = (url: string) => (token ? `${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}` : url)

  const load = () => {
    fetch(withToken('/api/catalog'))
      .then((r) => r.json())
      .then((d) => setItems(d.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }
  useEffect(load, [token])

  const industryKey: IndustryKey = (industry && industry in SERVICE_PRESETS ? industry : 'general') as IndustryKey
  const existingNames = useMemo(() => new Set(items.map((i) => i.name.trim().toLowerCase())), [items])
  const presets = useMemo(
    () => SERVICE_PRESETS[industryKey].filter((p) => !existingNames.has(p.name.trim().toLowerCase())),
    [industryKey, existingNames],
  )
  // Default every not-yet-added preset to checked whenever the available set changes.
  useEffect(() => { setPresetChecked(new Set(presets.map((p) => p.name))) }, [presets.map((p) => p.name).join('|')]) // eslint-disable-line react-hooks/exhaustive-deps

  const postItem = (body: Record<string, unknown>) =>
    fetch('/api/catalog', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, ...body }) })

  const addItem = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      const res = await postItem({
        name: name.trim(),
        item_type: itemType,
        per_unit: perUnit,
        price_cents: Math.round((Number(price) || 0) * 100),
        price_is_starting: isStarting,
      })
      if (res.ok) {
        setName(''); setPrice(''); setIsStarting(false)
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

  const togglePreset = (n: string) => {
    setPresetChecked((prev) => {
      const next = new Set(prev)
      next.has(n) ? next.delete(n) : next.add(n)
      return next
    })
  }

  const addSelectedPresets = async () => {
    const shape = pricingShapeFor(industryKey)
    const selected = presets.filter((p) => presetChecked.has(p.name))
    if (!selected.length) return
    setPresetLoading(true)
    try {
      await Promise.all(selected.map((p: DefaultService) =>
        postItem({
          name: p.name,
          item_type: 'service',
          per_unit: shape.per_unit,
          price_cents: Math.round(p.default_hourly_rate * 100),
          description: p.description,
          autoDescribe: false,
          default_duration_hours: p.default_duration_hours,
          sort_order: p.sort_order,
        }),
      ))
      load()
    } finally {
      setPresetLoading(false)
    }
  }

  const importBulk = async () => {
    const { rows, skipped } = parsePriceList(bulkText)
    if (!rows.length) { setBulkResult({ added: 0, skipped }); return }
    setBulkLoading(true)
    try {
      const results = await Promise.all(rows.map((r) =>
        postItem({ name: r.name, item_type: 'service', per_unit: r.per_unit, price_cents: r.price_cents, autoDescribe: false })
          .then((res) => res.ok),
      ))
      const added = results.filter(Boolean).length
      setBulkResult({ added, skipped: skipped + (rows.length - added) })
      if (added > 0) { setBulkText(''); load() }
    } finally {
      setBulkLoading(false)
    }
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
                <span className="text-slate-600">
                  {it.price_is_starting ? 'Starting at ' : ''}{money(it.price_cents)} {it.per_unit !== 'job' ? `/ ${it.per_unit}` : ''}
                </span>
                <button type="button" onClick={() => removeItem(it.id)} className="text-xs text-slate-400 hover:text-red-500">Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && presets.length > 0 && (
        <div className="mb-4 rounded-lg border border-teal-200 bg-teal-50/50 p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wide text-teal-700">
              Starter services for {labelForIndustry(industryKey)}
            </div>
            <button
              type="button"
              onClick={addSelectedPresets}
              disabled={presetLoading || presetChecked.size === 0}
              className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {presetLoading ? 'Adding…' : `+ Add ${presetChecked.size} selected`}
            </button>
          </div>
          <p className="mb-2 text-xs text-slate-500">
            Common {labelForIndustry(industryKey).toLowerCase()} services with typical pricing — uncheck what doesn&apos;t apply, edit prices after adding.
          </p>
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {presets.map((p) => (
              <label key={p.name} className="flex items-start gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-white/60">
                <input type="checkbox" checked={presetChecked.has(p.name)} onChange={() => togglePreset(p.name)} className="mt-0.5" />
                <span className="min-w-0">
                  <span className="font-medium text-slate-800">{p.name}</span>{' '}
                  <span className="text-slate-500">— ${p.default_hourly_rate}{pricingShapeFor(industryKey).per_unit === 'hour' ? '/hr' : ` /${pricingShapeFor(industryKey).per_unit}`}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="mb-4">
        <button type="button" onClick={() => setBulkOpen((v) => !v)} className="text-xs font-medium text-teal-700 hover:underline">
          {bulkOpen ? '− Hide bulk import' : '+ Already have a price sheet? Paste a list instead'}
        </button>
        {bulkOpen && (
          <div className="mt-2 rounded-lg border border-slate-200 p-3">
            <p className="mb-2 text-xs text-slate-500">
              One item per line: <code className="rounded bg-slate-100 px-1 py-0.5">Name, Price</code> or <code className="rounded bg-slate-100 px-1 py-0.5">Name, Price, Unit</code> (hour / job / unit / sqft / visit — defaults to flat/job). Paste straight from a spreadsheet or price sheet.
            </p>
            <textarea
              value={bulkText}
              onChange={(e) => { setBulkText(e.target.value); setBulkResult(null) }}
              placeholder={'Standard Cleaning, 129\nDeep Clean, 199, job\nHourly Handyman, 85, hour'}
              rows={5}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
            />
            <div className="mt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={importBulk}
                disabled={bulkLoading || !bulkText.trim()}
                className="rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
              >
                {bulkLoading ? 'Importing…' : 'Import list'}
              </button>
              {bulkResult && (
                <span className="text-xs text-slate-500">
                  Added {bulkResult.added}{bulkResult.skipped > 0 ? `, skipped ${bulkResult.skipped} (couldn't read the price)` : ''}.
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2 rounded-lg border border-dashed border-slate-300 p-3 sm:grid-cols-[1fr_auto_auto_auto_auto_auto]">
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
        <label className="flex items-center gap-1.5 whitespace-nowrap px-1 text-xs text-slate-600" title="Show this as a minimum/starting price instead of a fixed price — e.g. &quot;Starting at $99&quot;">
          <input type="checkbox" checked={isStarting} onChange={(e) => setIsStarting(e.target.checked)} />
          Starting at
        </label>
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
