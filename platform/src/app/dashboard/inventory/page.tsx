'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import '../sales/sales.css'

/**
 * Inventory — physical stock (supplies, materials, consumables) tracked
 * separately from the Master Catalog (sellable services/projects/products,
 * see /dashboard/catalog). Talks to /api/inventory (inventory_items table,
 * 2026_07_19_inventory_items.sql).
 *
 * Basic list/CRUD + stock-level visibility only. Not yet wired into
 * Proposals (line item picker) or Job tracking (deduct-on-use) -- see the
 * migration file header for that follow-up plan.
 */

type Item = {
  id: string
  name: string
  sku: string | null
  category: string | null
  unit_label: string
  quantity_on_hand: number
  unit_cost_cents: number
  reorder_threshold: number | null
  notes: string | null
  active: boolean
}

const empty = {
  name: '', sku: '', category: '', unit_label: 'unit',
  quantity_on_hand: '', unit_cost_cents: '', reorder_threshold: '', notes: '',
}

function money(cents: number | null | undefined): string {
  return '$' + ((cents || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function toCents(v: string): number {
  const n = Number(v)
  return Number.isFinite(n) ? Math.round(n * 100) : 0
}
function isLowStock(it: Item): boolean {
  return it.reorder_threshold != null && it.quantity_on_hand <= it.reorder_threshold
}

export default function InventoryPage() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ ...empty })
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  function load() {
    setLoading(true)
    fetch('/api/inventory')
      .then((r) => r.json())
      .then((d) => setItems(d?.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  function startEdit(it: Item) {
    setEditingId(it.id)
    setForm({
      name: it.name,
      sku: it.sku || '',
      category: it.category || '',
      unit_label: it.unit_label,
      quantity_on_hand: String(it.quantity_on_hand ?? ''),
      unit_cost_cents: it.unit_cost_cents ? (it.unit_cost_cents / 100).toString() : '',
      reorder_threshold: it.reorder_threshold != null ? String(it.reorder_threshold) : '',
      notes: it.notes || '',
    })
  }
  function cancelEdit() {
    setEditingId(null)
    setForm({ ...empty })
  }

  async function save() {
    setErr('')
    if (!form.name.trim()) { setErr('Name is required.'); return }
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        sku: form.sku.trim() || undefined,
        category: form.category.trim() || undefined,
        unit_label: form.unit_label.trim() || 'unit',
        quantity_on_hand: form.quantity_on_hand === '' ? 0 : Number(form.quantity_on_hand),
        unit_cost_cents: toCents(form.unit_cost_cents),
        reorder_threshold: form.reorder_threshold === '' ? undefined : Number(form.reorder_threshold),
        notes: form.notes.trim() || undefined,
      }
      const res = editingId
        ? await fetch('/api/inventory', {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: editingId, ...payload }),
          })
        : await fetch('/api/inventory', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
      if (!res.ok) { const d = await res.json().catch(() => null); setErr((d && d.error) || 'Could not save item.'); return }
      cancelEdit()
      load()
    } finally { setSaving(false) }
  }

  async function toggleActive(id: string, active: boolean) {
    await fetch('/api/inventory', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, active: !active }) })
    load()
  }
  async function remove(id: string) {
    await fetch(`/api/inventory?id=${id}`, { method: 'DELETE' })
    if (editingId === id) cancelEdit()
    load()
  }

  const inp: React.CSSProperties = { padding: '8px 10px', border: '1px solid var(--sl-line,#e6e6e0)', borderRadius: 8, fontSize: 13, color: 'var(--sl-ink)', width: '100%', background: '#fff' }
  const lbl: React.CSSProperties = { fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--sl-muted)', fontWeight: 600, marginBottom: 3, display: 'block' }

  const lowStockCount = items.filter(isLowStock).length

  return (
    <div className="sl-scope">
      <Link href="/dashboard/jobs" className="text-xs text-slate-500 hover:underline">← Production</Link>

      <div className="sl-section-head" style={{ marginTop: 6 }}>
        <h2 className="sl-section-title">Inventory<em>.</em></h2>
        <span className="sl-section-meta">
          {items.length} item{items.length === 1 ? '' : 's'}
          {lowStockCount > 0 ? ` · ${lowStockCount} low stock` : ''}
        </span>
      </div>
      <p style={{ fontSize: 12, color: 'var(--sl-muted)', margin: '0 0 16px' }}>
        Physical stock — supplies and materials on hand, separate from the Master Catalog's sellable services/products.
      </p>

      {err && <div style={{ background: '#fdecea', color: '#c0392b', padding: '8px 12px', borderRadius: 8, fontSize: 13, marginBottom: 12 }}>{err}</div>}

      {/* ADD / EDIT FORM */}
      <div style={{ background: 'var(--sl-canvas,#fff)', border: '1px solid var(--sl-line,#e6e6e0)', borderRadius: 12, padding: 14, marginBottom: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div><label style={lbl}>Name</label><input style={inp} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. HEPA Filter, 5-gal Bucket" /></div>
          <div><label style={lbl}>SKU</label><input style={inp} value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="Optional" /></div>
          <div><label style={lbl}>Category</label><input style={inp} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Supplies" /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '0.8fr 1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div><label style={lbl}>Unit</label><input style={inp} value={form.unit_label} onChange={(e) => setForm({ ...form, unit_label: e.target.value })} placeholder="unit / case / gal" /></div>
          <div><label style={lbl}>Qty on hand</label><input style={inp} value={form.quantity_on_hand} onChange={(e) => setForm({ ...form, quantity_on_hand: e.target.value.replace(/[^\d.]/g, '') })} placeholder="0" /></div>
          <div><label style={lbl}>Unit cost $</label><input style={inp} value={form.unit_cost_cents} onChange={(e) => setForm({ ...form, unit_cost_cents: e.target.value.replace(/[^\d.]/g, '') })} placeholder="0.00" /></div>
          <div><label style={lbl}>Reorder threshold</label><input style={inp} value={form.reorder_threshold} onChange={(e) => setForm({ ...form, reorder_threshold: e.target.value.replace(/[^\d.]/g, '') })} placeholder="Optional" /></div>
        </div>
        <div style={{ marginBottom: 10 }}><label style={lbl}>Notes</label><input style={inp} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional — internal only" /></div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
          {editingId && <button type="button" onClick={cancelEdit} style={{ fontSize: 12, background: 'none', border: '1px solid var(--sl-line,#ddd)', borderRadius: 6, padding: '6px 10px', cursor: 'pointer' }}>Cancel</button>}
          <button type="button" className="sl-newlead-btn" disabled={saving} onClick={save}>
            {saving ? 'Saving…' : editingId ? 'Save changes' : '+ Add item'}
          </button>
        </div>
      </div>

      {/* LIST */}
      <div>
        {loading && <div className="sl-empty">Loading…</div>}
        {!loading && items.length === 0 && <div className="sl-empty">No inventory yet — add your first item above.</div>}
        {items.map((it) => {
          const low = isLowStock(it)
          return (
            <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--sl-line,#eee)', opacity: it.active ? 1 : 0.5 }}>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--sl-ink)' }}>{it.name}</span>
                {it.sku && <span style={{ fontSize: 10, marginLeft: 8, color: 'var(--sl-muted)' }}>SKU {it.sku}</span>}
                {it.category && <span style={{ fontSize: 10, marginLeft: 8, color: 'var(--sl-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{it.category}</span>}
                {it.notes && <span style={{ display: 'block', fontSize: 11, color: 'var(--sl-muted)', fontStyle: 'italic' }}>{it.notes}</span>}
              </span>
              <span style={{ fontSize: 13, minWidth: 90, textAlign: 'right', color: low ? '#c0392b' : 'var(--sl-ink)', fontWeight: low ? 600 : 400 }}>
                {it.quantity_on_hand} {it.unit_label}
                {low && <span style={{ display: 'block', fontSize: 10 }}>low stock</span>}
              </span>
              <span style={{ fontSize: 13, color: 'var(--sl-ink)', minWidth: 90, textAlign: 'right' }}>{money(it.unit_cost_cents)} / {it.unit_label}</span>
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
