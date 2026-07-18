'use client'

import { useEffect, useState } from 'react'
import HelpTip from '../_components/HelpTip'

/**
 * Master Catalog — every item the business sells. Each item is a
 * service | project | product and carries everything a SKU needs to cover all
 * trades: a real unit of measure (+ custom label), price, minimum charge,
 * taxable flag, cost (for margin), default duration, and a category.
 * Talks to /api/catalog (the service_types table). Proposals pick from here.
 */

type Item = {
  id: string
  name: string
  description: string | null
  item_type: 'service' | 'project' | 'product' | string
  per_unit: string
  unit_label: string | null
  price_cents: number
  min_charge_cents: number | null
  cost_cents: number | null
  taxable: boolean
  category: string | null
  default_duration_hours: number | null
  active: boolean
}

const TYPES = ['service', 'project', 'product'] as const
const UNITS: Array<{ v: string; l: string }> = [
  { v: 'hour', l: 'per hour' },
  { v: 'job', l: 'flat / per job' },
  { v: 'unit', l: 'per unit (each)' },
  { v: 'sqft', l: 'per sq ft' },
  { v: 'linear_ft', l: 'per linear ft' },
  { v: 'visit', l: 'per visit' },
  { v: 'day', l: 'per day' },
  { v: 'custom', l: 'custom…' },
]
const UNIT_SHORT: Record<string, string> = { hour: 'hr', job: 'job', unit: 'ea', sqft: 'sqft', linear_ft: 'ln ft', visit: 'visit', day: 'day' }

function money(cents: number | null | undefined): string {
  return '$' + Math.round((cents || 0) / 100).toLocaleString('en-US')
}
function unitShort(u: string, label: string | null): string {
  return u === 'custom' ? (label || 'custom') : (UNIT_SHORT[u] || u)
}
function toCents(v: string): number | undefined {
  if (!v.trim()) return undefined
  const n = Number(v)
  return Number.isFinite(n) ? Math.round(n * 100) : undefined
}

const empty = {
  item_type: 'service', name: '', category: '', description: '',
  per_unit: 'hour', unit_label: '', price: '', min_charge: '', cost: '',
  taxable: true, default_duration_hours: '',
}

type EditForm = {
  item_type: string
  name: string
  category: string
  description: string
  per_unit: string
  unit_label: string
  price: string
  min_charge: string
  cost: string
  taxable: boolean
  default_duration_hours: string
}

function toEditForm(it: Item): EditForm {
  return {
    item_type: it.item_type,
    name: it.name,
    category: it.category || '',
    description: it.description || '',
    per_unit: it.per_unit,
    unit_label: it.unit_label || '',
    price: it.price_cents != null ? String(it.price_cents / 100) : '',
    min_charge: it.min_charge_cents != null ? String(it.min_charge_cents / 100) : '',
    cost: it.cost_cents != null ? String(it.cost_cents / 100) : '',
    taxable: it.taxable,
    default_duration_hours: it.default_duration_hours != null ? String(it.default_duration_hours) : '',
  }
}

export default function CatalogTab() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ ...empty })
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditForm | null>(null)
  const [editErr, setEditErr] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [query, setQuery] = useState('')

  function load() {
    setLoading(true)
    fetch('/api/catalog')
      .then((r) => r.json())
      .then((d) => setItems(d?.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const filteredItems = query.trim()
    ? items.filter((it) => it.name.toLowerCase().includes(query.trim().toLowerCase()))
    : items

  async function addItem() {
    setErr('')
    if (!form.name.trim()) { setErr('Name is required.'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_type: form.item_type,
          name: form.name.trim(),
          category: form.category.trim() || undefined,
          description: form.description.trim() || undefined,
          per_unit: form.per_unit,
          unit_label: form.per_unit === 'custom' ? (form.unit_label.trim() || undefined) : undefined,
          price_cents: toCents(form.price) ?? 0,
          min_charge_cents: toCents(form.min_charge),
          cost_cents: toCents(form.cost),
          taxable: form.taxable,
          default_duration_hours: form.default_duration_hours ? Number(form.default_duration_hours) : undefined,
        }),
      })
      if (!res.ok) { const d = await res.json().catch(() => null); setErr((d && d.error) || 'Could not add item.'); return }
      setForm({ ...empty })
      load()
    } finally { setSaving(false) }
  }

  async function toggleActive(id: string, active: boolean) {
    await fetch('/api/catalog', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, active: !active }) })
    load()
  }
  async function remove(id: string) {
    await fetch(`/api/catalog?id=${id}`, { method: 'DELETE' })
    load()
  }

  function startEdit(it: Item) {
    setEditingId(it.id)
    setEditForm(toEditForm(it))
    setEditErr('')
  }
  function cancelEdit() {
    setEditingId(null)
    setEditForm(null)
    setEditErr('')
  }
  async function saveEdit(id: string) {
    if (!editForm) return
    setEditErr('')
    if (!editForm.name.trim()) { setEditErr('Name is required.'); return }
    setEditSaving(true)
    try {
      const res = await fetch('/api/catalog', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          item_type: editForm.item_type,
          name: editForm.name.trim(),
          category: editForm.category.trim() || undefined,
          description: editForm.description.trim() || undefined,
          per_unit: editForm.per_unit,
          unit_label: editForm.per_unit === 'custom' ? (editForm.unit_label.trim() || undefined) : undefined,
          price_cents: toCents(editForm.price) ?? 0,
          min_charge_cents: toCents(editForm.min_charge),
          cost_cents: toCents(editForm.cost),
          taxable: editForm.taxable,
          default_duration_hours: editForm.default_duration_hours ? Number(editForm.default_duration_hours) : undefined,
        }),
      })
      if (!res.ok) { const d = await res.json().catch(() => null); setEditErr((d && d.error) || 'Could not save changes.'); return }
      cancelEdit()
      load()
    } finally { setEditSaving(false) }
  }

  const inp: React.CSSProperties = { padding: '8px 10px', border: '1px solid var(--sl-line,#e6e6e0)', borderRadius: 8, fontSize: 13, color: 'var(--sl-ink)', width: '100%', background: '#fff' }
  const lbl: React.CSSProperties = { fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--sl-muted)', fontWeight: 600, marginBottom: 3, display: 'block' }

  return (
    <div style={{ paddingTop: 12 }}>
      {err && <div style={{ background: '#fdecea', color: '#c0392b', padding: '8px 12px', borderRadius: 8, fontSize: 13, marginBottom: 12 }}>{err}</div>}

      <div className="sl-section-head">
        <h2 className="sl-section-title">Master Catalog<em>.</em></h2>
        <span className="sl-section-meta">
          {query.trim() ? `${filteredItems.length} of ${items.length} item${items.length === 1 ? '' : 's'}` : `${items.length} item${items.length === 1 ? '' : 's'}`}
        </span>
      </div>
      <p style={{ fontSize: 12, color: 'var(--sl-muted)', margin: '0 0 14px' }}>
        Every item you sell — a <strong>service</strong>, <strong>project</strong>, or <strong>product</strong>. Proposals build their line items from this list.
      </p>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search catalog by name…"
        style={{ ...inp, marginBottom: 14 }}
        aria-label="Search catalog"
      />

      {/* ADD FORM */}
      <div style={{ background: 'var(--sl-canvas,#fff)', border: '1px solid var(--sl-line,#e6e6e0)', borderRadius: 12, padding: 14, marginBottom: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '0.8fr 1.6fr 1fr', gap: 10, marginBottom: 10 }}>
          <div><label style={lbl}>Type <HelpTip text="Service = labor you perform. Project = a larger, multi-visit job. Product = a physical thing you sell." /></label>
            <select style={inp} value={form.item_type} onChange={(e) => setForm({ ...form, item_type: e.target.value })}>{TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select>
          </div>
          <div><label style={lbl}>Name <HelpTip text="What shows on the proposal line. Keep it clear and customer-facing." /></label><input style={inp} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Deep Clean / Kitchen Remodel / HEPA Filter" /></div>
          <div><label style={lbl}>Category <HelpTip text="Optional grouping (e.g. Add-ons, Materials) to organize the catalog picker." /></label><input style={inp} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Add-ons" /></div>
        </div>

        <div style={{ marginBottom: 10 }}><label style={lbl}>Description <HelpTip text="Optional detail shown under the line on the proposal — scope, what's included." /></label><input style={inp} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional — shown on the proposal" /></div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr 0.9fr 0.9fr 0.9fr', gap: 10, alignItems: 'end' }}>
          <div><label style={lbl}>Unit <HelpTip text="How this item is priced — per hour, flat per job, each, per sq ft, etc. Pick 'custom' to name your own unit." /></label>
            <select style={inp} value={form.per_unit} onChange={(e) => setForm({ ...form, per_unit: e.target.value })}>{UNITS.map((u) => <option key={u.v} value={u.v}>{u.l}</option>)}</select>
          </div>
          {form.per_unit === 'custom'
            ? <div><label style={lbl}>Unit label <HelpTip text="Your own unit name, shown on the proposal — e.g. 'per window', 'per pallet'." /></label><input style={inp} value={form.unit_label} onChange={(e) => setForm({ ...form, unit_label: e.target.value })} placeholder="per window" /></div>
            : <div><label style={lbl}>Price $ / {unitShort(form.per_unit, null)} <HelpTip text="The rate per unit above. Leave blank for quote-priced items." /></label><input style={inp} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value.replace(/[^\d.]/g, '') })} placeholder="0" /></div>}
          {form.per_unit === 'custom' && <div><label style={lbl}>Price $ <HelpTip text="The rate per your custom unit." /></label><input style={inp} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value.replace(/[^\d.]/g, '') })} placeholder="0" /></div>}
          <div><label style={lbl}>Min charge $ <HelpTip text="A floor / trip fee — e.g. a 2-hour minimum. Optional." /></label><input style={inp} value={form.min_charge} onChange={(e) => setForm({ ...form, min_charge: e.target.value.replace(/[^\d.]/g, '') })} placeholder="—" /></div>
          <div><label style={lbl}>Cost $ <HelpTip text="Your cost for this item. Only you see it — used to show your margin. Optional." /></label><input style={inp} value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value.replace(/[^\d.]/g, '') })} placeholder="—" /></div>
          {form.per_unit !== 'custom' && <div><label style={lbl}>Est. hrs <HelpTip text="Typical duration — used to pre-fill the schedule window when this becomes a job. Optional." /></label><input style={inp} value={form.default_duration_hours} onChange={(e) => setForm({ ...form, default_duration_hours: e.target.value.replace(/[^\d.]/g, '') })} placeholder="—" /></div>}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
          <label style={{ fontSize: 13, color: 'var(--sl-ink)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={form.taxable} onChange={(e) => setForm({ ...form, taxable: e.target.checked })} /> Taxable
            <HelpTip text="Whether this item gets sales tax. The tax RATE is set once in Settings; this just says if this item is taxed." />
          </label>
          <button type="button" className="sl-newlead-btn" disabled={saving} onClick={addItem}>{saving ? 'Adding…' : '+ Add item'}</button>
        </div>
      </div>

      {/* LIST */}
      <div>
        {loading && <div className="sl-empty">Loading…</div>}
        {!loading && items.length === 0 && <div className="sl-empty">No items yet — add your first above.</div>}
        {!loading && items.length > 0 && filteredItems.length === 0 && <div className="sl-empty">No items match "{query}".</div>}
        {filteredItems.map((it) => {
          const margin = it.cost_cents != null && it.price_cents ? Math.round(((it.price_cents - it.cost_cents) / it.price_cents) * 100) : null

          if (editingId === it.id && editForm) {
            return (
              <div key={it.id} style={{ background: 'var(--sl-canvas,#fff)', border: '1px solid var(--sl-line,#e6e6e0)', borderRadius: 12, padding: 14, marginBottom: 4 }}>
                {editErr && <div style={{ background: '#fdecea', color: '#c0392b', padding: '6px 10px', borderRadius: 8, fontSize: 12, marginBottom: 10 }}>{editErr}</div>}
                <div style={{ display: 'grid', gridTemplateColumns: '0.8fr 1.6fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div><label style={lbl}>Type</label>
                    <select style={inp} value={editForm.item_type} onChange={(e) => setEditForm({ ...editForm, item_type: e.target.value })}>{TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select>
                  </div>
                  <div><label style={lbl}>Name</label><input style={inp} value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></div>
                  <div><label style={lbl}>Category</label><input style={inp} value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} /></div>
                </div>
                <div style={{ marginBottom: 10 }}><label style={lbl}>Description</label><input style={inp} value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr 0.9fr 0.9fr 0.9fr', gap: 10, alignItems: 'end' }}>
                  <div><label style={lbl}>Unit</label>
                    <select style={inp} value={editForm.per_unit} onChange={(e) => setEditForm({ ...editForm, per_unit: e.target.value })}>{UNITS.map((u) => <option key={u.v} value={u.v}>{u.l}</option>)}</select>
                  </div>
                  {editForm.per_unit === 'custom'
                    ? <div><label style={lbl}>Unit label</label><input style={inp} value={editForm.unit_label} onChange={(e) => setEditForm({ ...editForm, unit_label: e.target.value })} /></div>
                    : <div><label style={lbl}>Price $ / {unitShort(editForm.per_unit, null)}</label><input style={inp} value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value.replace(/[^\d.]/g, '') })} /></div>}
                  {editForm.per_unit === 'custom' && <div><label style={lbl}>Price $</label><input style={inp} value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value.replace(/[^\d.]/g, '') })} /></div>}
                  <div><label style={lbl}>Min charge $</label><input style={inp} value={editForm.min_charge} onChange={(e) => setEditForm({ ...editForm, min_charge: e.target.value.replace(/[^\d.]/g, '') })} /></div>
                  <div><label style={lbl}>Cost $</label><input style={inp} value={editForm.cost} onChange={(e) => setEditForm({ ...editForm, cost: e.target.value.replace(/[^\d.]/g, '') })} /></div>
                  {editForm.per_unit !== 'custom' && <div><label style={lbl}>Est. hrs</label><input style={inp} value={editForm.default_duration_hours} onChange={(e) => setEditForm({ ...editForm, default_duration_hours: e.target.value.replace(/[^\d.]/g, '') })} /></div>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
                  <label style={{ fontSize: 13, color: 'var(--sl-ink)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input type="checkbox" checked={editForm.taxable} onChange={(e) => setEditForm({ ...editForm, taxable: e.target.checked })} /> Taxable
                  </label>
                  <span style={{ display: 'flex', gap: 8 }}>
                    <button type="button" onClick={cancelEdit} style={{ fontSize: 12, background: 'none', border: '1px solid var(--sl-line,#ddd)', borderRadius: 6, padding: '6px 12px', cursor: 'pointer' }}>Cancel</button>
                    <button type="button" className="sl-newlead-btn" disabled={editSaving} onClick={() => saveEdit(it.id)}>{editSaving ? 'Saving…' : 'Save'}</button>
                  </span>
                </div>
              </div>
            )
          }

          return (
            <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--sl-line,#eee)', opacity: it.active ? 1 : 0.5 }}>
              <span className={`sl-deal-status ${it.item_type === 'product' ? 'sold' : it.item_type === 'project' ? 'pending' : 'lost'}`} style={{ minWidth: 62, textAlign: 'center' }}>{it.item_type}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--sl-ink)' }}>{it.name}</span>
                {it.category && <span style={{ fontSize: 10, marginLeft: 8, color: 'var(--sl-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{it.category}</span>}
                {it.description && <span style={{ display: 'block', fontSize: 12, color: 'var(--sl-muted)' }}>{it.description}</span>}
                <span style={{ display: 'block', fontSize: 11, color: 'var(--sl-muted)', marginTop: 2 }}>
                  {it.min_charge_cents ? `min ${money(it.min_charge_cents)} · ` : ''}
                  {it.default_duration_hours ? `${it.default_duration_hours}h · ` : ''}
                  {it.taxable ? 'taxable' : 'no tax'}
                  {margin != null ? ` · ${margin}% margin` : ''}
                </span>
              </span>
              <span style={{ fontSize: 14, color: 'var(--sl-ink)', minWidth: 120, textAlign: 'right' }}>
                {money(it.price_cents)} <span style={{ color: 'var(--sl-muted)', fontSize: 11 }}>/ {unitShort(it.per_unit, it.unit_label)}</span>
              </span>
              <button type="button" onClick={() => startEdit(it)} style={{ fontSize: 11, background: 'none', border: '1px solid var(--sl-line,#ddd)', borderRadius: 6, padding: '3px 8px', cursor: 'pointer' }}>Edit</button>
              <button type="button" onClick={() => toggleActive(it.id, it.active)} style={{ fontSize: 11, background: 'none', border: '1px solid var(--sl-line,#ddd)', borderRadius: 6, padding: '3px 8px', cursor: 'pointer' }}>{it.active ? 'Active' : 'Off'}</button>
              <button type="button" onClick={() => remove(it.id)} style={{ fontSize: 11, background: 'none', border: 'none', color: '#c0392b', cursor: 'pointer' }}>Delete</button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
