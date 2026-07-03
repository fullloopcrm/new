'use client'

import { useEffect, useState } from 'react'

/**
 * Catalog tab — the master list of items. Every item has a type
 * (service | project | product) and is priced per hour or per job. This is
 * where all items live; deals/quotes pick from it. Talks to /api/catalog.
 */

type Item = {
  id: string
  name: string
  description: string | null
  item_type: 'service' | 'project' | 'product' | string
  per_unit: 'hour' | 'job' | string
  price_cents: number
  active: boolean
}

const TYPES = ['service', 'project', 'product'] as const
const PER = ['hour', 'job'] as const

function money(cents: number | null | undefined): string {
  return '$' + Math.round((cents || 0) / 100).toLocaleString('en-US')
}

const empty = { item_type: 'service', name: '', description: '', price_cents: '', per_unit: 'hour' }

export default function CatalogTab() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ ...empty })
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)

  function load() {
    setLoading(true)
    fetch('/api/catalog')
      .then((r) => r.json())
      .then((d) => setItems(d?.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

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
          description: form.description.trim() || undefined,
          price_cents: form.price_cents ? Math.round(Number(form.price_cents) * 100) : 0,
          per_unit: form.per_unit,
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

  const inputStyle: React.CSSProperties = { padding: '8px 10px', border: '1px solid var(--sl-line,#e6e6e0)', borderRadius: 8, fontSize: 13, color: 'var(--sl-ink)', width: '100%' }

  return (
    <div style={{ paddingTop: 12 }}>
      {err && <div style={{ background: '#fdecea', color: '#c0392b', padding: '8px 12px', borderRadius: 8, fontSize: 13, marginBottom: 12 }}>{err}</div>}

      <div className="sl-section-head">
        <h2 className="sl-section-title">Master Catalog<em>.</em></h2>
        <span className="sl-section-meta">{items.length} item{items.length === 1 ? '' : 's'}</span>
      </div>
      <p style={{ fontSize: 12, color: 'var(--sl-muted)', margin: '0 0 12px' }}>
        Every item you sell — a <strong>service</strong>, a <strong>project</strong>, or a <strong>product</strong> — priced per hour or per job. Deals pick from this list.
      </p>

      {/* ADD ROW */}
      <div style={{ display: 'grid', gridTemplateColumns: '0.9fr 1.5fr 0.8fr 0.8fr auto', gap: 8, alignItems: 'end', marginBottom: 16 }}>
        <div><label style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--sl-muted)' }}>Type</label>
          <select style={inputStyle} value={form.item_type} onChange={(e) => setForm({ ...form, item_type: e.target.value })}>{TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select>
        </div>
        <div><label style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--sl-muted)' }}>Name</label><input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Deep Clean / Kitchen Remodel / HEPA Filter" /></div>
        <div><label style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--sl-muted)' }}>Price $</label><input style={inputStyle} value={form.price_cents} onChange={(e) => setForm({ ...form, price_cents: e.target.value.replace(/[^\d.]/g, '') })} placeholder="0" /></div>
        <div><label style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--sl-muted)' }}>Per</label>
          <select style={inputStyle} value={form.per_unit} onChange={(e) => setForm({ ...form, per_unit: e.target.value })}>{PER.map((p) => <option key={p} value={p}>{p}</option>)}</select>
        </div>
        <button type="button" className="sl-newlead-btn" disabled={saving} onClick={addItem}>Add</button>
      </div>
      <div style={{ marginBottom: 10 }}>
        <input style={{ ...inputStyle, maxWidth: 520 }} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description (optional)" />
      </div>

      {/* LIST */}
      <div>
        {loading && <div className="sl-empty">Loading…</div>}
        {!loading && items.length === 0 && <div className="sl-empty">No items yet — add your first above.</div>}
        {items.map((it) => (
          <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--sl-line,#eee)', opacity: it.active ? 1 : 0.5 }}>
            <span className={`sl-deal-status ${it.item_type === 'product' ? 'sold' : it.item_type === 'project' ? 'pending' : 'lost'}`} style={{ minWidth: 62, textAlign: 'center' }}>{it.item_type}</span>
            <span style={{ flex: 1, fontWeight: 600, fontSize: 14, color: 'var(--sl-ink)' }}>
              {it.name}
              {it.description && <span style={{ display: 'block', fontWeight: 400, fontSize: 12, color: 'var(--sl-muted)' }}>{it.description}</span>}
            </span>
            <span style={{ fontSize: 13, color: 'var(--sl-ink)', minWidth: 110, textAlign: 'right' }}>{money(it.price_cents)} <span style={{ color: 'var(--sl-muted)', fontSize: 11 }}>/ {it.per_unit}</span></span>
            <button type="button" onClick={() => toggleActive(it.id, it.active)} style={{ fontSize: 11, background: 'none', border: '1px solid var(--sl-line,#ddd)', borderRadius: 6, padding: '3px 8px', cursor: 'pointer' }}>{it.active ? 'Active' : 'Off'}</button>
            <button type="button" onClick={() => remove(it.id)} style={{ fontSize: 11, background: 'none', border: 'none', color: '#c0392b', cursor: 'pointer' }}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  )
}
