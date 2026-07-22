'use client'

import { useEffect, useRef, useState } from 'react'
import HelpTip from '../_components/HelpTip'
import AddCatalogItemModal, { type NewCatalogItem } from './AddCatalogItemModal'

// Budget Templates — standalone, named, reusable budget packages. Not tied
// to a quote or customer: build "Basic Lawn Care Package" once (its own
// line items, its own target margin), apply it to specific quotes later
// from the Budgets tab. Distinct from a per-quote budget, which has
// actuals -- a template never does, it's a costing pattern, not a job.

type LineItem = {
  id?: string
  service_type_id: string | null
  category_id: string | null
  label: string
  description: string
  kind: 'labor' | 'materials' | 'equipment' | 'other'
  labor_cents: number
  supplies_cents: number
  budgeted_cents: number
  margin_bps: number | null
}
type Template = { id: string; name: string; description: string | null; target_margin_bps: number | null; active: boolean; budgeted_cents: number }
type Category = { id: string; name: string }
type CatalogItem = { id: string; name: string; description: string | null; item_type: string; category_id: string | null; cost_cents: number | null }

const KIND_LABELS: Record<string, string> = { labor: 'Labor', materials: 'Materials', equipment: 'Equipment', other: 'Other' }
// Catalog item_type -> starting kind guess when a catalog item is picked.
// A line's real cost split lives in labor_cents/supplies_cents now (a line
// can carry both at once -- "Paint Living Room" is labor AND materials
// under one scope) so kind is just a legacy/reporting tag, not hand-picked.
const KIND_FROM_ITEM_TYPE: Record<string, LineItem['kind']> = { service: 'labor', project: 'labor', product: 'materials', equipment: 'equipment' }
const ADD_NEW_VALUE = '__add_new__'
const DEFAULT_MARGIN_BPS = 5000 // 50% -- a sane starting point per line, not zero

function money(cents: number): string {
  return '$' + Math.round((cents || 0) / 100).toLocaleString('en-US')
}
function toCents(v: string): number {
  const n = Number(v.replace(/[^\d.]/g, ''))
  return Number.isFinite(n) ? Math.round(n * 100) : 0
}
function emptyLine(): LineItem {
  return { service_type_id: null, category_id: null, label: '', description: '', kind: 'other', labor_cents: 0, supplies_cents: 0, budgeted_cents: 0, margin_bps: DEFAULT_MARGIN_BPS }
}
// Whichever cost component is larger drives the legacy kind tag.
function deriveKind(laborCents: number, suppliesCents: number, fallback: LineItem['kind']): LineItem['kind'] {
  if (laborCents === 0 && suppliesCents === 0) return fallback
  return laborCents >= suppliesCents ? 'labor' : 'materials'
}
// Sale price = what to charge to hit the line's target gross margin:
// margin% = (price - cost) / price  =>  price = cost / (1 - margin%).
function salePriceCents(li: LineItem): number {
  if (li.margin_bps == null || li.margin_bps >= 10000) return li.budgeted_cents
  return Math.round(li.budgeted_cents / (1 - li.margin_bps / 10000))
}

export default function BudgetTemplatesTab() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [err, setErr] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [form, setForm] = useState<{ name: string; description: string; line_items: LineItem[] }>({ name: '', description: '', line_items: [] })
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [addCatalogForIdx, setAddCatalogForIdx] = useState<number | null>(null)

  function load() {
    setLoading(true)
    Promise.all([
      fetch('/api/budget-templates').then((r) => r.json()).catch(() => ({ templates: [] })),
      fetch('/api/categories').then((r) => r.json()).catch(() => ({ categories: [] })),
      fetch('/api/catalog').then((r) => r.json()).catch(() => ({ items: [] })),
    ]).then(([t, c, cat]) => {
      setTemplates(t?.templates || [])
      setCategories(c?.categories || [])
      setCatalogItems(cat?.items || [])
    }).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  function pickCatalogItem(idx: number, serviceTypeId: string) {
    if (serviceTypeId === ADD_NEW_VALUE) {
      setAddCatalogForIdx(idx)
      return
    }
    const item = catalogItems.find((i) => i.id === serviceTypeId)
    if (!item) return
    const li = form.line_items[idx]
    const kind = KIND_FROM_ITEM_TYPE[item.item_type] || 'other'
    // A catalog item is typed as either labor OR materials/equipment, never
    // both -- its own cost only ever seeds a starting default for whichever
    // field matches its type. The other field stays whatever was already
    // typed on this line (a labor service can still ride alongside
    // separately-entered supplies cost on the same scope line).
    const laborCents = kind === 'labor' ? (item.cost_cents || 0) : li.labor_cents
    const suppliesCents = kind !== 'labor' ? (item.cost_cents || 0) : li.supplies_cents
    updateLine(idx, {
      service_type_id: item.id,
      label: item.name,
      description: item.description || '',
      category_id: item.category_id,
      kind,
      labor_cents: laborCents,
      supplies_cents: suppliesCents,
      budgeted_cents: laborCents + suppliesCents,
      margin_bps: li.margin_bps ?? DEFAULT_MARGIN_BPS,
    })
  }

  function onCatalogItemCreated(idx: number, item: NewCatalogItem) {
    setCatalogItems((prev) => [...prev, { id: item.id, name: item.name, description: null, item_type: item.item_type, category_id: item.category_id, cost_cents: item.cost_cents }])
    setAddCatalogForIdx(null)
    const li = form.line_items[idx]
    const kind = KIND_FROM_ITEM_TYPE[item.item_type] || 'other'
    const laborCents = kind === 'labor' ? (item.cost_cents || 0) : li.labor_cents
    const suppliesCents = kind !== 'labor' ? (item.cost_cents || 0) : li.supplies_cents
    updateLine(idx, {
      service_type_id: item.id,
      label: item.name,
      category_id: item.category_id,
      kind,
      labor_cents: laborCents,
      supplies_cents: suppliesCents,
      budgeted_cents: laborCents + suppliesCents,
      margin_bps: li.margin_bps ?? DEFAULT_MARGIN_BPS,
    })
  }

  function updateLaborRate(idx: number, priceStr: string) {
    const laborCents = toCents(priceStr)
    const li = form.line_items[idx]
    // Only re-derive kind for lines with no catalog link -- a catalog pick's
    // kind (esp. equipment) is a real fact from the catalog, not a guess.
    const kind = li.service_type_id ? li.kind : deriveKind(laborCents, li.supplies_cents, li.kind)
    updateLine(idx, { labor_cents: laborCents, budgeted_cents: laborCents + li.supplies_cents, kind })
  }

  function updateSuppliesCost(idx: number, priceStr: string) {
    const suppliesCents = toCents(priceStr)
    const li = form.line_items[idx]
    const kind = li.service_type_id ? li.kind : deriveKind(li.labor_cents, suppliesCents, li.kind)
    updateLine(idx, { supplies_cents: suppliesCents, budgeted_cents: li.labor_cents + suppliesCents, kind })
  }

  function updateMargin(idx: number, marginStr: string) {
    const cleaned = marginStr.replace(/[^\d.]/g, '')
    updateLine(idx, { margin_bps: cleaned.trim() ? Math.round(Number(cleaned) * 100) : null })
  }

  async function createTemplate() {
    setErr('')
    if (!newName.trim()) { setErr('Name the template.'); return }
    setCreating(true)
    try {
      const res = await fetch('/api/budget-templates', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      })
      const d = await res.json().catch(() => null)
      if (!res.ok) { setErr((d && d.error) || 'Could not create template.'); return }
      setNewName('')
      load()
      openTemplate(d.template.id)
    } finally { setCreating(false) }
  }

  const skipNextAutoSave = useRef(false)
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function openTemplate(id: string) {
    setOpenId(id)
    skipNextAutoSave.current = true
    const res = await fetch(`/api/budget-templates/${id}`)
    const d = await res.json().catch(() => null)
    const t = d?.template
    setForm({
      name: t?.name || '',
      description: t?.description || '',
      line_items: t?.line_items?.length ? t.line_items : [emptyLine()],
    })
  }

  // Overall target margin isn't typed in separately anymore -- it's the
  // budgeted-$-weighted average of each line's own "margin wanted", so
  // materials-thin/labor-rich mixes roll up honestly instead of one
  // guessed blanket number.
  function weightedTargetMarginBps(lineItems: LineItem[]): number | null {
    const withMargin = lineItems.filter((li) => li.margin_bps != null && li.budgeted_cents > 0)
    const totalCost = withMargin.reduce((s, li) => s + li.budgeted_cents, 0)
    if (!totalCost) return null
    const weightedSum = withMargin.reduce((s, li) => s + (li.margin_bps as number) * li.budgeted_cents, 0)
    return Math.round(weightedSum / totalCost)
  }

  useEffect(() => {
    if (!openId) return
    if (skipNextAutoSave.current) { skipNextAutoSave.current = false; return }
    setAutoSaveStatus('saving')
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => save(openId, { silent: true }), 800)
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, openId])

  async function save(id: string, opts?: { silent?: boolean }) {
    try {
      const res = await fetch(`/api/budget-templates/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          description: form.description || null,
          target_margin_bps: weightedTargetMarginBps(form.line_items),
          line_items: form.line_items.filter((li) => li.label.trim()),
        }),
      })
      if (!res.ok) { if (opts?.silent) setAutoSaveStatus('idle'); return }
      if (opts?.silent) { setAutoSaveStatus('saved'); load() } else { setOpenId(null); load() }
    } catch { if (opts?.silent) setAutoSaveStatus('idle') }
  }

  async function removeTemplate(id: string) {
    await fetch(`/api/budget-templates/${id}`, { method: 'DELETE' })
    if (openId === id) setOpenId(null)
    load()
  }

  function updateLine(idx: number, patch: Partial<LineItem>) {
    setForm((f) => ({ ...f, line_items: f.line_items.map((li, i) => (i === idx ? { ...li, ...patch } : li)) }))
  }
  function addLine() { setForm((f) => ({ ...f, line_items: [...f.line_items, emptyLine()] })) }
  function removeLine(idx: number) { setForm((f) => ({ ...f, line_items: f.line_items.filter((_, i) => i !== idx) })) }

  const inp: React.CSSProperties = { padding: '9px 11px', border: '1px solid var(--sl-line,#e6e6e0)', borderRadius: 8, fontSize: 14, width: '100%', background: '#fff', color: 'var(--sl-ink)' }
  const label: React.CSSProperties = { fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--sl-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }
  const formTotal = form.line_items.reduce((s, li) => s + li.budgeted_cents, 0)

  return (
    <div style={{ paddingTop: 12 }}>
      <div className="sl-section-head">
        <h2 className="sl-section-title">Templates<em>.</em></h2>
        <span className="sl-section-meta">{templates.length} template{templates.length === 1 ? '' : 's'}</span>
      </div>
      <p style={{ fontSize: 12, color: 'var(--sl-muted)', margin: '0 0 16px' }}>
        Standalone, reusable budget packages — not tied to any quote or customer. Build a package once, apply it to specific quotes from the Budgets tab.
        <HelpTip text="Think of a template as a costed version of one of your service packages — e.g. a standard lawn care visit. Build it once here with realistic labor, materials, and overhead numbers, then apply it to any matching proposal instead of re-entering the same numbers every time." />
      </p>

      <div style={{ background: 'var(--sl-canvas,#fff)', border: '1px solid var(--sl-line,#e6e6e0)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
        <label style={label}>New template name <HelpTip text="Name it after what you sell, not a customer — e.g. Basic Lawn Care Package or 10-Yard Dumpster Rental — so it is obvious which proposals it fits." /></label>
        <div style={{ display: 'flex', gap: 10 }}>
          <input style={inp} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Basic Lawn Care Package" onKeyDown={(e) => e.key === 'Enter' && createTemplate()} />
          <button type="button" className="sl-newlead-btn" disabled={creating} onClick={createTemplate} style={{ whiteSpace: 'nowrap' }}>{creating ? 'Creating…' : '+ New Template'}</button>
        </div>
        {err && <div style={{ color: '#c0392b', fontSize: 13, marginTop: 10 }}>{err}</div>}
      </div>

      {loading && <div className="sl-empty">Loading…</div>}
      {!loading && templates.length === 0 && <div className="sl-empty">No templates yet — name your first package above.</div>}

      {templates.map((t) => {
        const isOpen = openId === t.id
        return (
          <div key={t.id} style={{ border: '1px solid var(--sl-line,#e6e6e0)', borderRadius: 10, marginBottom: 10, overflow: 'hidden' }}>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', cursor: 'pointer', background: isOpen ? 'var(--sl-canvas,#fafaf8)' : '#fff' }}
              onClick={() => (isOpen ? setOpenId(null) : openTemplate(t.id))}
            >
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--sl-ink)' }}>{t.name}</span>
                {t.description && <span style={{ display: 'block', fontSize: 12, color: 'var(--sl-muted)' }}>{t.description}</span>}
              </span>
              <span style={{ fontSize: 13, color: 'var(--sl-ink)' }}>{money(t.budgeted_cents)}</span>
              <button type="button" onClick={(e) => { e.stopPropagation(); removeTemplate(t.id) }} style={{ fontSize: 11, background: 'none', border: 'none', color: '#c0392b', cursor: 'pointer' }}>Delete</button>
            </div>

            {isOpen && (
              <div style={{ padding: 14, borderTop: '1px solid var(--sl-line,#e6e6e0)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                  <div><label style={label}>Name</label><input style={inp} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                  <div><label style={label}>Description</label><input style={inp} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional" /></div>
                </div>

                <div style={{ fontSize: 11, color: 'var(--sl-muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                  Pick a real Catalog item for its Category (ties to your bookkeeping) — then split what this line actually costs you into Labor Rate and Supplies Cost, since one scope of work is often both.
                  <HelpTip text="Don't see the item you need? Pick '+ Add new item to catalog...' at the top of the list — a popup lets you create it without leaving this page." />
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ flex: '1.6 1 0', ...label }}>Line Item</div>
                  <div style={{ flex: '1.3 1 0', ...label }}>Description</div>
                  <div style={{ width: 90, ...label }}>Labor Rate</div>
                  <div style={{ width: 90, ...label }}>Supplies Cost</div>
                  <div style={{ width: 90, ...label }}>Total</div>
                  <div style={{ width: 90, ...label }}>Margin Wanted</div>
                  <div style={{ width: 90, ...label }}>Sale Price</div>
                  <div style={{ width: 24 }} />
                </div>
                {form.line_items.map((li, idx) => (
                  <div key={li.id || idx} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
                    <div style={{ flex: '1.6 1 0' }}>
                      <select style={inp} value={li.service_type_id || ''} onChange={(e) => pickCatalogItem(idx, e.target.value)}>
                        <option value="">{li.label || 'Select a catalog item…'}</option>
                        <option value={ADD_NEW_VALUE}>+ Add new item to catalog…</option>
                        {catalogItems.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <div style={{ fontSize: 10.5, color: 'var(--sl-muted)', marginTop: 3, paddingLeft: 2 }}>
                        {categories.find((c) => c.id === li.category_id)?.name || 'No category'}
                      </div>
                    </div>
                    <input style={{ ...inp, flex: '1.3 1 0' }} value={li.description} onChange={(e) => updateLine(idx, { description: e.target.value })} placeholder="Optional detail for this line" />
                    <input style={{ ...inp, width: 90 }} value={(li.labor_cents / 100).toString()} onChange={(e) => updateLaborRate(idx, e.target.value)} placeholder="0" title="What this line costs you in labor" />
                    <input style={{ ...inp, width: 90 }} value={(li.supplies_cents / 100).toString()} onChange={(e) => updateSuppliesCost(idx, e.target.value)} placeholder="0" title="What this line costs you in materials/supplies/equipment" />
                    <div style={{ ...inp, width: 90, background: 'var(--sl-canvas,#fafaf8)', color: 'var(--sl-ink)', fontWeight: 600 }}>{money(li.budgeted_cents)}</div>
                    <input style={{ ...inp, width: 90 }} value={li.margin_bps != null ? (li.margin_bps / 100).toString() : ''} onChange={(e) => updateMargin(idx, e.target.value)} placeholder="%" />
                    <div style={{ ...inp, width: 90, background: 'var(--sl-canvas,#fafaf8)', color: 'var(--sl-good,#1f4d2c)', fontWeight: 600 }} title="What to charge to hit the margin wanted">{money(salePriceCents(li))}</div>
                    <button type="button" onClick={() => removeLine(idx)} style={{ width: 24, background: 'none', border: 'none', color: '#c0392b', cursor: 'pointer', fontSize: 16 }}>×</button>
                  </div>
                ))}
                <button type="button" onClick={addLine} style={{ fontSize: 12, background: 'none', border: '1px solid var(--sl-line,#ddd)', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', marginTop: 4, marginBottom: 12 }}>
                  + Add line item
                </button>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <label style={label}>Target Gross Margin (avg) <HelpTip text="The $-weighted average of each line's Margin Wanted — not typed in separately, since a mixed labor/materials package doesn't have one honest blanket number." /></label>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--sl-ink)' }}>
                      {(() => { const m = weightedTargetMarginBps(form.line_items); return m == null ? '—' : (m / 100).toFixed(1) + '%' })()}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, color: 'var(--sl-muted)', marginBottom: 4 }}>Total: <strong style={{ color: 'var(--sl-ink)' }}>{money(formTotal)}</strong></div>
                    <div style={{ fontSize: 11, color: 'var(--sl-muted)' }}>
                      {autoSaveStatus === 'saving' && 'Saving…'}
                      {autoSaveStatus === 'saved' && 'Saved'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {addCatalogForIdx !== null && (
        <AddCatalogItemModal
          categories={categories}
          onClose={() => setAddCatalogForIdx(null)}
          onCreated={(item) => onCatalogItemCreated(addCatalogForIdx, item)}
        />
      )}
    </div>
  )
}
