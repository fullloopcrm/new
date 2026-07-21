'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import '../../sales/sales.css'

// Inventory — physical stock (materials, supplies, consumables). Distinct
// from Catalog (sellable service_types); an inventory item is what a
// catalog item's bill of materials consumes and what a vendor supplies.
type Category = { id: string; name: string }
type InventoryItem = {
  id: string
  name: string
  sku: string | null
  category_id: string | null
  unit_label: string
  quantity_on_hand: number
  unit_cost_cents: number
  reorder_threshold: number | null
  notes: string | null
  active: boolean
}

type Draft = {
  name: string; sku: string; category_id: string; unit_label: string
  quantity_on_hand: string; unit_cost: string; reorder_threshold: string; notes: string
}
const EMPTY_DRAFT: Draft = { name: '', sku: '', category_id: '', unit_label: 'unit', quantity_on_hand: '0', unit_cost: '', reorder_threshold: '', notes: '' }

function money(cents: number): string {
  return '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function toCents(dollars: string): number {
  const n = Number(dollars)
  return Number.isFinite(n) ? Math.round(n * 100) : 0
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Draft>(EMPTY_DRAFT)

  function load() {
    setLoading(true)
    Promise.all([
      fetch('/api/inventory').then((r) => r.json()).catch(() => ({ items: [] })),
      fetch('/api/categories').then((r) => r.json()).catch(() => ({ categories: [] })),
    ])
      .then(([i, c]) => {
        setItems(i?.items || [])
        setCategories(c?.categories || [])
      })
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const categoryName = (id: string | null) => categories.find((c) => c.id === id)?.name || null

  async function createItem() {
    setErr('')
    if (!draft.name.trim()) { setErr('Name the item.'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: draft.name, sku: draft.sku || null, category_id: draft.category_id || null,
          unit_label: draft.unit_label || 'unit',
          quantity_on_hand: Number(draft.quantity_on_hand) || 0,
          unit_cost_cents: toCents(draft.unit_cost),
          reorder_threshold: draft.reorder_threshold ? Number(draft.reorder_threshold) : null,
          notes: draft.notes || null,
        }),
      })
      if (!res.ok) { const d = await res.json().catch(() => null); setErr((d && d.error) || 'Could not create item.'); return }
      setDraft(EMPTY_DRAFT); load()
    } finally { setSaving(false) }
  }

  function startEdit(it: InventoryItem) {
    setEditingId(it.id)
    setEditDraft({
      name: it.name, sku: it.sku || '', category_id: it.category_id || '', unit_label: it.unit_label,
      quantity_on_hand: String(it.quantity_on_hand), unit_cost: (it.unit_cost_cents / 100).toFixed(2),
      reorder_threshold: it.reorder_threshold != null ? String(it.reorder_threshold) : '', notes: it.notes || '',
    })
  }

  async function saveEdit(id: string) {
    await fetch('/api/inventory', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id, name: editDraft.name, sku: editDraft.sku || null, category_id: editDraft.category_id || null,
        unit_label: editDraft.unit_label || 'unit',
        quantity_on_hand: Number(editDraft.quantity_on_hand) || 0,
        unit_cost_cents: toCents(editDraft.unit_cost),
        reorder_threshold: editDraft.reorder_threshold ? Number(editDraft.reorder_threshold) : null,
        notes: editDraft.notes || null,
      }),
    })
    setEditingId(null)
    load()
  }

  async function removeItem(id: string) {
    await fetch(`/api/inventory?id=${id}`, { method: 'DELETE' })
    load()
  }

  const inp: React.CSSProperties = { padding: '9px 11px', border: '1px solid var(--sl-line,#e6e6e0)', borderRadius: 8, fontSize: 14, width: '100%', background: '#fff', color: 'var(--sl-ink)' }
  const label: React.CSSProperties = { fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--sl-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }
  const grid4: React.CSSProperties = { display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 12 }

  return (
    <div className="sl-scope">
      <Link href="/dashboard/jobs" className="text-xs text-slate-500 hover:underline">← Production</Link>

      <div className="sl-section-head" style={{ marginTop: 6 }}>
        <h2 className="sl-section-title">Inventory<em>.</em></h2>
        <span className="sl-section-meta">{items.length} item{items.length === 1 ? '' : 's'}</span>
      </div>
      <p style={{ fontSize: 12, color: 'var(--sl-muted)', margin: '0 0 16px' }}>
        Physical stock — materials, supplies, consumables. Link items to vendors on the Vendors page, and to catalog services as a bill of materials on the Services Catalog page.
      </p>

      {/* CREATE */}
      <div style={{ background: 'var(--sl-canvas,#fff)', border: '1px solid var(--sl-line,#e6e6e0)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
        <div style={{ ...grid4, marginBottom: 12 }}>
          <div>
            <label style={label}>Item name</label>
            <input style={inp} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Premium Mulch" />
          </div>
          <div>
            <label style={label}>SKU</label>
            <input style={inp} value={draft.sku} onChange={(e) => setDraft({ ...draft, sku: e.target.value })} placeholder="Optional" />
          </div>
          <div>
            <label style={label}>Category</label>
            <select style={inp} value={draft.category_id} onChange={(e) => setDraft({ ...draft, category_id: e.target.value })}>
              <option value="">No category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={label}>Unit</label>
            <input style={inp} value={draft.unit_label} onChange={(e) => setDraft({ ...draft, unit_label: e.target.value })} placeholder="bag, yard, gallon…" />
          </div>
        </div>
        <div style={{ ...grid4, marginBottom: 12 }}>
          <div>
            <label style={label}>Quantity on hand</label>
            <input style={inp} type="number" value={draft.quantity_on_hand} onChange={(e) => setDraft({ ...draft, quantity_on_hand: e.target.value })} />
          </div>
          <div>
            <label style={label}>Unit cost ($)</label>
            <input style={inp} type="number" step="0.01" value={draft.unit_cost} onChange={(e) => setDraft({ ...draft, unit_cost: e.target.value })} placeholder="0.00" />
          </div>
          <div>
            <label style={label}>Reorder threshold</label>
            <input style={inp} type="number" value={draft.reorder_threshold} onChange={(e) => setDraft({ ...draft, reorder_threshold: e.target.value })} placeholder="Optional" />
          </div>
          <div>
            <label style={label}>Notes</label>
            <input style={inp} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
          </div>
        </div>
        {err && <div style={{ color: '#c0392b', fontSize: 13, marginBottom: 10 }}>{err}</div>}
        <button type="button" className="sl-newlead-btn" disabled={saving} onClick={createItem}>{saving ? 'Adding…' : '+ Add item'}</button>
      </div>

      {/* LIST */}
      {loading && <div className="sl-empty">Loading…</div>}
      {!loading && items.length === 0 && <div className="sl-empty">No inventory yet — add your first item above.</div>}
      {items.map((it) => {
        const low = it.reorder_threshold != null && it.quantity_on_hand <= it.reorder_threshold
        const over = it.quantity_on_hand < 0
        return (
          <div key={it.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--sl-line,#eee)' }}>
            {editingId === it.id ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={grid4}>
                  <input style={inp} value={editDraft.name} onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })} placeholder="Name" />
                  <input style={inp} value={editDraft.sku} onChange={(e) => setEditDraft({ ...editDraft, sku: e.target.value })} placeholder="SKU" />
                  <select style={inp} value={editDraft.category_id} onChange={(e) => setEditDraft({ ...editDraft, category_id: e.target.value })}>
                    <option value="">No category</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <input style={inp} value={editDraft.unit_label} onChange={(e) => setEditDraft({ ...editDraft, unit_label: e.target.value })} placeholder="Unit" />
                </div>
                <div style={grid4}>
                  <input style={inp} type="number" value={editDraft.quantity_on_hand} onChange={(e) => setEditDraft({ ...editDraft, quantity_on_hand: e.target.value })} />
                  <input style={inp} type="number" step="0.01" value={editDraft.unit_cost} onChange={(e) => setEditDraft({ ...editDraft, unit_cost: e.target.value })} />
                  <input style={inp} type="number" value={editDraft.reorder_threshold} onChange={(e) => setEditDraft({ ...editDraft, reorder_threshold: e.target.value })} />
                  <input style={inp} value={editDraft.notes} onChange={(e) => setEditDraft({ ...editDraft, notes: e.target.value })} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="sl-newlead-btn" onClick={() => saveEdit(it.id)}>Save</button>
                  <button type="button" onClick={() => setEditingId(null)} style={{ fontSize: 12, background: 'none', border: 'none', color: 'var(--sl-muted)', cursor: 'pointer' }}>Cancel</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontFamily: 'var(--sl-display)', fontSize: 16, fontWeight: 600, color: 'var(--sl-ink)', minWidth: 160 }}>{it.name}</span>
                <span style={{ flex: 1, fontSize: 13, color: 'var(--sl-muted)' }}>
                  {[categoryName(it.category_id), it.sku, `${it.quantity_on_hand} ${it.unit_label} on hand`, money(it.unit_cost_cents) + '/' + it.unit_label].filter(Boolean).join(' · ')}
                </span>
                {low && <span style={{ fontSize: 10, fontWeight: 700, color: '#b45309', background: '#fef3c7', padding: '2px 8px', borderRadius: 999 }}>LOW STOCK</span>}
                {over && <span style={{ fontSize: 10, fontWeight: 700, color: '#b91c1c', background: '#fee2e2', padding: '2px 8px', borderRadius: 999 }}>OVER-DRAWN</span>}
                <button type="button" onClick={() => startEdit(it)} style={{ fontSize: 11, background: 'none', border: 'none', color: 'var(--sl-ink)', cursor: 'pointer' }}>Edit</button>
                <button type="button" onClick={() => removeItem(it.id)} style={{ fontSize: 11, background: 'none', border: 'none', color: '#c0392b', cursor: 'pointer' }}>Delete</button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
