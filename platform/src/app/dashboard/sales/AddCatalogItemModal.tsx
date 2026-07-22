'use client'

import { useState } from 'react'

// Quick-add popup for creating a new Catalog item without leaving the
// budget line-item row. Mirrors the minimum fields /api/catalog needs
// (name + item_type) plus what a budget line actually cares about (cost,
// category) -- full editing (price, notes, images, etc.) still happens on
// the Catalog page itself.

export type NewCatalogItem = {
  id: string
  name: string
  item_type: string
  category_id: string | null
  cost_cents: number | null
}

type Category = { id: string; name: string }

const ITEM_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'service', label: 'Service (labor)' },
  { value: 'product', label: 'Product (materials)' },
  { value: 'equipment', label: 'Equipment (rental)' },
  { value: 'project', label: 'Project (labor)' },
]

interface AddCatalogItemModalProps {
  categories: Category[]
  onClose: () => void
  onCreated: (item: NewCatalogItem) => void
}

export default function AddCatalogItemModal({ categories, onClose, onCreated }: AddCatalogItemModalProps) {
  const [name, setName] = useState('')
  const [itemType, setItemType] = useState('service')
  const [cost, setCost] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const inp: React.CSSProperties = { padding: '9px 11px', border: '1px solid var(--sl-line,#e6e6e0)', borderRadius: 8, fontSize: 14, width: '100%', background: '#fff', color: 'var(--sl-ink)' }
  const lbl: React.CSSProperties = { fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--sl-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }

  async function submit() {
    setErr('')
    if (!name.trim()) { setErr('Name it.'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          item_type: itemType,
          cost_cents: cost.trim() ? Math.round(Number(cost) * 100) : 0,
          category_id: categoryId || null,
        }),
      })
      const d = await res.json().catch(() => null)
      if (!res.ok) { setErr((d && d.error) || 'Could not create item.'); return }
      onCreated(d.item)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={onClose}
    >
      <div
        style={{ background: '#fff', borderRadius: 12, padding: 20, width: 380, maxWidth: '90vw', border: '1px solid var(--sl-line,#e6e6e0)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 14px', color: 'var(--sl-ink)' }}>Add catalog item</h3>

        <div style={{ marginBottom: 10 }}>
          <label style={lbl}>Name</label>
          <input style={inp} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mulch (per yard)" autoFocus onKeyDown={(e) => e.key === 'Enter' && submit()} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div>
            <label style={lbl}>Type</label>
            <select style={inp} value={itemType} onChange={(e) => setItemType(e.target.value)}>
              {ITEM_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Cost $</label>
            <input style={inp} value={cost} onChange={(e) => setCost(e.target.value.replace(/[^\d.]/g, ''))} placeholder="0.00" />
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>Category</label>
          <select style={inp} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">No category</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {err && <div style={{ color: '#c0392b', fontSize: 13, marginBottom: 10 }}>{err}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" onClick={onClose} style={{ fontSize: 13, background: 'none', border: '1px solid var(--sl-line,#ddd)', borderRadius: 8, padding: '8px 14px', cursor: 'pointer' }}>Cancel</button>
          <button type="button" className="sl-newlead-btn" disabled={saving} onClick={submit}>{saving ? 'Adding…' : 'Add item'}</button>
        </div>
      </div>
    </div>
  )
}
