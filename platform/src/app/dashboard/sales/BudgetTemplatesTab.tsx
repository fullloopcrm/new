'use client'

import { useEffect, useRef, useState } from 'react'
import HelpTip from '../_components/HelpTip'

// Budget Templates — standalone, named, reusable budget packages. Not tied
// to a quote or customer: build "Basic Lawn Care Package" once (its own
// line items, its own target margin), apply it to specific quotes later
// from the Budgets tab. Distinct from a per-quote budget, which has
// actuals -- a template never does, it's a costing pattern, not a job.

type LineItem = { id?: string; service_type_id: string | null; category_id: string | null; label: string; kind: 'labor' | 'materials' | 'other'; qty: number; budgeted_cents: number }
type Template = { id: string; name: string; description: string | null; target_margin_bps: number | null; active: boolean; budgeted_cents: number }
type Category = { id: string; name: string }
type CatalogItem = { id: string; name: string; item_type: string; category_id: string | null; cost_cents: number | null }

const KIND_LABELS: Record<string, string> = { labor: 'Labor', materials: 'Materials', other: 'Other' }
// Catalog item_type -> budget line kind, so kind is derived, not hand-picked.
const KIND_FROM_ITEM_TYPE: Record<string, LineItem['kind']> = { service: 'labor', project: 'labor', product: 'materials', equipment: 'other' }
const ADD_NEW_VALUE = '__add_new__'

function money(cents: number): string {
  return '$' + Math.round((cents || 0) / 100).toLocaleString('en-US')
}
function toCents(v: string): number {
  const n = Number(v.replace(/[^\d.]/g, ''))
  return Number.isFinite(n) ? Math.round(n * 100) : 0
}
function emptyLine(): LineItem {
  return { service_type_id: null, category_id: null, label: '', kind: 'other', qty: 1, budgeted_cents: 0 }
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
  const [form, setForm] = useState<{ name: string; description: string; target_margin: string; line_items: LineItem[] }>({ name: '', description: '', target_margin: '', line_items: [] })
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

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
      window.open('/dashboard/catalog', '_blank')
      return
    }
    const item = catalogItems.find((i) => i.id === serviceTypeId)
    if (!item) return
    updateLine(idx, {
      service_type_id: item.id,
      label: item.name,
      category_id: item.category_id,
      kind: KIND_FROM_ITEM_TYPE[item.item_type] || 'other',
      qty: 1,
      budgeted_cents: item.cost_cents || 0,
    })
  }

  function updateQty(idx: number, qtyStr: string) {
    const qty = Number(qtyStr)
    const safeQty = Number.isFinite(qty) && qty > 0 ? qty : 1
    const li = form.line_items[idx]
    const item = li.service_type_id ? catalogItems.find((i) => i.id === li.service_type_id) : null
    updateLine(idx, { qty: safeQty, budgeted_cents: item ? Math.round((item.cost_cents || 0) * safeQty) : li.budgeted_cents })
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
      target_margin: t?.target_margin_bps != null ? String(t.target_margin_bps / 100) : '',
      line_items: t?.line_items?.length ? t.line_items : [emptyLine()],
    })
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
          target_margin_bps: form.target_margin.trim() ? Math.round(Number(form.target_margin) * 100) : null,
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
                  Every line is a real Catalog item — its Kind and Category come from the catalog automatically, so nothing ends up an untracked &quot;Other&quot; a bookkeeper can&apos;t reconcile.
                  <HelpTip text="Don't see the item you need? Pick '+ Add new item to catalog...' at the top of the list — it opens the Catalog page in a new tab. Add it there, then come back and pick it here." />
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ flex: '2 1 0', ...label }}>Catalog Item</div>
                  <div style={{ flex: '1 1 0', ...label }}>Kind</div>
                  <div style={{ flex: '1.2 1 0', ...label }}>Category</div>
                  <div style={{ width: 60, ...label }}>Qty</div>
                  <div style={{ width: 100, ...label }}>Budgeted $</div>
                  <div style={{ width: 24 }} />
                </div>
                {form.line_items.map((li, idx) => (
                  <div key={li.id || idx} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                    <select style={{ ...inp, flex: '2 1 0' }} value={li.service_type_id || ''} onChange={(e) => pickCatalogItem(idx, e.target.value)}>
                      <option value="">{li.label || 'Select a catalog item…'}</option>
                      <option value={ADD_NEW_VALUE}>+ Add new item to catalog…</option>
                      {catalogItems.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <div style={{ ...inp, flex: '1 1 0', background: 'var(--sl-canvas,#fafaf8)', color: 'var(--sl-muted)' }}>{KIND_LABELS[li.kind]}</div>
                    <div style={{ ...inp, flex: '1.2 1 0', background: 'var(--sl-canvas,#fafaf8)', color: 'var(--sl-muted)' }}>{categories.find((c) => c.id === li.category_id)?.name || 'No category'}</div>
                    <input style={{ ...inp, width: 60 }} type="number" step="1" min="0" value={li.qty} onChange={(e) => updateQty(idx, e.target.value)} />
                    <input style={{ ...inp, width: 100 }} value={(li.budgeted_cents / 100).toString()} onChange={(e) => updateLine(idx, { budgeted_cents: toCents(e.target.value) })} placeholder="0" />
                    <button type="button" onClick={() => removeLine(idx)} style={{ width: 24, background: 'none', border: 'none', color: '#c0392b', cursor: 'pointer', fontSize: 16 }}>×</button>
                  </div>
                ))}
                <button type="button" onClick={addLine} style={{ fontSize: 12, background: 'none', border: '1px solid var(--sl-line,#ddd)', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', marginTop: 4, marginBottom: 12 }}>
                  + Add line item
                </button>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <label style={label}>Target Gross Margin % <HelpTip text="Gross margin = revenue minus direct job costs (labor, materials, equipment) — not net profit, which also subtracts company overhead. This is the goal shown on the Budgets tab once this template is applied." /></label>
                    <input style={{ ...inp, width: 140 }} value={form.target_margin} onChange={(e) => setForm({ ...form, target_margin: e.target.value.replace(/[^\d.]/g, '') })} placeholder="e.g. 35" />
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
    </div>
  )
}
