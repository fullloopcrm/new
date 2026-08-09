'use client'

import { useEffect, useState } from 'react'

type Supplier = {
  id: string
  name: string
  adapter_key: string
  config: Record<string, unknown>
  active: boolean
  created_at: string
}

type Adapter = { key: string; label: string }

const inputCls: React.CSSProperties = { padding: '6px 8px', border: '1px solid var(--sl-line,#e6e6e0)', borderRadius: 6, fontSize: 12, color: 'var(--sl-ink)', background: '#fff' }
const linkBtnCls: React.CSSProperties = { fontSize: 12, color: 'var(--sl-accent, #2f6fed)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }

export default function SuppliersTab() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [adapters, setAdapters] = useState<Adapter[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [newAdapter, setNewAdapter] = useState('manual')
  const [saving, setSaving] = useState(false)

  function load() {
    setLoading(true)
    fetch('/api/dropship/suppliers')
      .then((r) => r.json())
      .then((d) => {
        setSuppliers(d?.suppliers || [])
        setAdapters(d?.adapters || [])
      })
      .catch(() => { setSuppliers([]); setAdapters([]) })
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  async function addSupplier() {
    if (!newName.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/dropship/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), adapter_key: newAdapter }),
      })
      if (res.ok) {
        setNewName('')
        setNewAdapter('manual')
        load()
      }
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(s: Supplier) {
    setSuppliers((prev) => prev.map((x) => (x.id === s.id ? { ...x, active: !x.active } : x)))
    await fetch('/api/dropship/suppliers', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: s.id, active: !s.active }) })
  }

  async function remove(id: string) {
    setSuppliers((prev) => prev.filter((x) => x.id !== id))
    await fetch(`/api/dropship/suppliers?id=${id}`, { method: 'DELETE' })
  }

  return (
    <div style={{ paddingTop: 12 }}>
      <div className="sl-section-head">
        <h2 className="sl-section-title">Suppliers<em>.</em></h2>
        <span className="sl-section-meta">{suppliers.length} supplier{suppliers.length === 1 ? '' : 's'}</span>
      </div>

      <p style={{ fontSize: 12, color: 'var(--sl-muted)', marginTop: 4 }}>
        Who fulfills your products. "Manual" means no API — you enter tracking info by hand on each order.
        Give a supplier&apos;s webhook URL as <code>/api/webhooks/dropship/&#123;supplier id&#125;</code> if their integration supports pushing tracking updates back.
      </p>

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <input style={inputCls} placeholder="Supplier name" value={newName} onChange={(e) => setNewName(e.target.value)} />
        <select style={inputCls} value={newAdapter} onChange={(e) => setNewAdapter(e.target.value)}>
          {(adapters.length ? adapters : [{ key: 'manual', label: 'Manual (no API)' }]).map((a) => (
            <option key={a.key} value={a.key}>{a.label}</option>
          ))}
        </select>
        <button type="button" style={linkBtnCls} disabled={saving || !newName.trim()} onClick={addSupplier}>{saving ? 'Adding…' : 'Add supplier'}</button>
      </div>

      {loading && <div className="sl-empty" style={{ marginTop: 12 }}>Loading…</div>}
      {!loading && suppliers.length === 0 && <div className="sl-empty" style={{ marginTop: 12 }}>No suppliers yet.</div>}

      <div style={{ marginTop: 12 }}>
        {suppliers.map((s) => (
          <div key={s.id} style={{ background: 'var(--sl-canvas,#fff)', border: '1px solid var(--sl-line,#e6e6e0)', borderRadius: 12, padding: 14, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--sl-ink)', margin: 0 }}>{s.name}</p>
              <p style={{ fontSize: 12, color: 'var(--sl-muted)', margin: '2px 0 0' }}>
                {adapters.find((a) => a.key === s.adapter_key)?.label || s.adapter_key} · {s.active ? 'Active' : 'Inactive'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button type="button" style={linkBtnCls} onClick={() => toggleActive(s)}>{s.active ? 'Deactivate' : 'Activate'}</button>
              <button type="button" style={{ ...linkBtnCls, color: '#c0392b' }} onClick={() => remove(s.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
