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
  const [newApiKey, setNewApiKey] = useState('')
  const [newShopId, setNewShopId] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editApiKey, setEditApiKey] = useState('')
  const [editShopId, setEditShopId] = useState('')

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
      const config: Record<string, unknown> = {}
      if (newAdapter !== 'manual') {
        if (newApiKey.trim()) config.apiKey = newApiKey.trim()
        if (newShopId.trim()) config.shopId = newShopId.trim()
      }
      const res = await fetch('/api/dropship/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), adapter_key: newAdapter, config }),
      })
      if (res.ok) {
        setNewName('')
        setNewAdapter('manual')
        setNewApiKey('')
        setNewShopId('')
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

  function openEditConfig(s: Supplier) {
    setEditingId(s.id)
    setEditApiKey('')
    setEditShopId(typeof s.config.shopId === 'string' ? s.config.shopId : '')
  }

  async function saveConfig(s: Supplier) {
    setSaving(true)
    try {
      const config: Record<string, unknown> = { shopId: editShopId.trim() }
      if (editApiKey.trim()) config.apiKey = editApiKey.trim() // omit = keep existing key (route only overwrites config.apiKey when present in the request)
      const res = await fetch('/api/dropship/suppliers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: s.id, config: { ...s.config, ...config } }),
      })
      if (res.ok) {
        setEditingId(null)
        load()
      }
    } finally {
      setSaving(false)
    }
  }

  const newAdapterNeedsConfig = newAdapter !== 'manual'

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

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12, alignItems: 'center' }}>
        <input style={inputCls} placeholder="Supplier name" value={newName} onChange={(e) => setNewName(e.target.value)} />
        <select style={inputCls} value={newAdapter} onChange={(e) => setNewAdapter(e.target.value)}>
          {(adapters.length ? adapters : [{ key: 'manual', label: 'Manual (no API)' }]).map((a) => (
            <option key={a.key} value={a.key}>{a.label}</option>
          ))}
        </select>
        {newAdapterNeedsConfig && (
          <>
            <input style={inputCls} placeholder="API key" type="password" value={newApiKey} onChange={(e) => setNewApiKey(e.target.value)} />
            <input style={inputCls} placeholder="Shop ID" value={newShopId} onChange={(e) => setNewShopId(e.target.value)} />
          </>
        )}
        <button type="button" style={linkBtnCls} disabled={saving || !newName.trim()} onClick={addSupplier}>{saving ? 'Adding…' : 'Add supplier'}</button>
      </div>

      {loading && <div className="sl-empty" style={{ marginTop: 12 }}>Loading…</div>}
      {!loading && suppliers.length === 0 && <div className="sl-empty" style={{ marginTop: 12 }}>No suppliers yet.</div>}

      <div style={{ marginTop: 12 }}>
        {suppliers.map((s) => (
          <div key={s.id} style={{ background: 'var(--sl-canvas,#fff)', border: '1px solid var(--sl-line,#e6e6e0)', borderRadius: 12, padding: 14, marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--sl-ink)', margin: 0 }}>{s.name}</p>
                <p style={{ fontSize: 12, color: 'var(--sl-muted)', margin: '2px 0 0' }}>
                  {adapters.find((a) => a.key === s.adapter_key)?.label || s.adapter_key} · {s.active ? 'Active' : 'Inactive'}
                  {s.adapter_key !== 'manual' && <> · {s.config.hasApiKey ? 'API key set' : 'API key missing'}</>}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                {s.adapter_key !== 'manual' && <button type="button" style={linkBtnCls} onClick={() => openEditConfig(s)}>Credentials</button>}
                <button type="button" style={linkBtnCls} onClick={() => toggleActive(s)}>{s.active ? 'Deactivate' : 'Activate'}</button>
                <button type="button" style={{ ...linkBtnCls, color: '#c0392b' }} onClick={() => remove(s.id)}>Delete</button>
              </div>
            </div>

            {s.adapter_key !== 'manual' && (
              <p style={{ fontSize: 11, color: 'var(--sl-muted)', marginTop: 6, marginBottom: 0 }}>
                Webhook URL: <code>/api/webhooks/dropship/{s.id}</code>
              </p>
            )}

            {editingId === s.id && (
              <div style={{ display: 'flex', gap: 8, marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--sl-line,#eee)' }}>
                <input style={inputCls} placeholder="New API key (leave blank to keep current)" type="password" value={editApiKey} onChange={(e) => setEditApiKey(e.target.value)} />
                <input style={inputCls} placeholder="Shop ID" value={editShopId} onChange={(e) => setEditShopId(e.target.value)} />
                <button type="button" style={linkBtnCls} disabled={saving} onClick={() => saveConfig(s)}>{saving ? 'Saving…' : 'Save'}</button>
                <button type="button" style={{ ...linkBtnCls, color: 'var(--sl-muted)' }} onClick={() => setEditingId(null)}>Cancel</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
