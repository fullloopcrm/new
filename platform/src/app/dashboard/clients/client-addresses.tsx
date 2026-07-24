'use client'

import { useEffect, useState, useCallback } from 'react'
import AddressAutocomplete from '@/components/AddressAutocomplete'

interface Property {
  id: string
  label: string | null
  address: string
  unit: string | null
  is_primary: boolean
}

interface ChangeRow {
  id: string
  action: string
  old_value: { address?: string } | null
  new_value: { address?: string } | null
  changed_by: string | null
  source: string | null
  created_at: string
}

const fieldStyle = { padding: '10px 12px', border: '1px solid var(--clients-line)', borderRadius: 4, fontSize: 14, width: '100%' }
const labelStyle = { fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: 0.5, color: 'var(--clients-muted)' }

export default function ClientAddresses({ clientId, showHistory = false }: { clientId: string; showHistory?: boolean }) {
  const [properties, setProperties] = useState<Property[]>([])
  const [history, setHistory] = useState<ChangeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newAddress, setNewAddress] = useState('')
  const [newUnit, setNewUnit] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editAddress, setEditAddress] = useState('')

  const load = useCallback(async () => {
    if (!clientId) return
    const res = await fetch(`/api/clients/${clientId}/properties${showHistory ? '?include_history=true' : ''}`)
    const data = await res.json().catch(() => ({}))
    setProperties(data.properties || [])
    if (showHistory) setHistory(data.history || [])
    setLoading(false)
  }, [clientId, showHistory])

  useEffect(() => { setLoading(true); load() }, [load])

  async function add() {
    if (newAddress.trim().length < 5) { setError('Enter a full address.'); return }
    setBusy(true); setError('')
    const res = await fetch(`/api/clients/${clientId}/properties`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: newAddress.trim(), unit: newUnit.trim() || null }),
    })
    setBusy(false)
    if (!res.ok) { setError((await res.json().catch(() => ({}))).error || 'Failed to add'); return }
    setNewAddress(''); setNewUnit(''); setAdding(false)
    load()
  }

  async function saveEdit(id: string) {
    if (editAddress.trim().length < 5) { setError('Enter a full address.'); return }
    setBusy(true); setError('')
    const res = await fetch(`/api/clients/${clientId}/properties`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ property_id: id, address: editAddress.trim() }),
    })
    setBusy(false)
    if (!res.ok) { setError((await res.json().catch(() => ({}))).error || 'Failed to save'); return }
    setEditingId(null)
    load()
  }

  async function patch(propertyId: string, action: 'set_primary' | 'deactivate') {
    setBusy(true)
    await fetch(`/api/clients/${clientId}/properties`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ property_id: propertyId, action }),
    })
    setBusy(false)
    load()
  }

  if (loading) return null

  return (
    <div className="clients-section">
      <div className="clients-section-head">
        <span className="clients-section-label">Addresses</span>
        {!adding && (
          <span className="clients-section-action" role="button" tabIndex={0} onClick={() => { setAdding(true); setError('') }}>
            + Add address
          </span>
        )}
      </div>

      {properties.length === 0 && !adding ? (
        <div className="clients-empty">No addresses on file.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {properties.map((p) => (
            <div key={p.id} style={{ border: '1px solid var(--clients-line)', borderRadius: 4, padding: 12 }}>
              {editingId === p.id ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <AddressAutocomplete
                    value={editAddress}
                    onChange={(val) => setEditAddress(val)}
                    placeholder="Street, city, state, ZIP, unit"
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" disabled={busy} className="clients-btn clients-btn-primary" onClick={() => saveEdit(p.id)}>
                      {busy ? 'Saving…' : 'Save'}
                    </button>
                    <button type="button" className="clients-btn clients-btn-ghost" onClick={() => setEditingId(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: 13, color: 'var(--clients-ink)' }}>
                    {p.address}
                    {p.is_primary && (
                      <span style={{ marginLeft: 8, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, padding: '2px 6px', borderRadius: 3, background: 'var(--clients-bg)', color: 'var(--clients-muted)' }}>
                        Primary
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
                    {!p.is_primary && (
                      <span className="clients-section-action" role="button" tabIndex={0} onClick={() => patch(p.id, 'set_primary')}>Make primary</span>
                    )}
                    <span
                      className="clients-section-action"
                      role="button"
                      tabIndex={0}
                      onClick={() => { setEditingId(p.id); setEditAddress(p.address); setError('') }}
                    >
                      Edit
                    </span>
                    {!p.is_primary && properties.length > 1 && (
                      <span className="clients-section-action" style={{ color: 'var(--clients-danger)' }} role="button" tabIndex={0} onClick={() => patch(p.id, 'deactivate')}>
                        Remove
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {adding && (
        <div style={{ marginTop: 8, border: '1px solid var(--clients-line)', borderRadius: 4, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={labelStyle}>Address</span>
            <AddressAutocomplete value={newAddress} onChange={(val) => setNewAddress(val)} placeholder="Street, city, state, ZIP" />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={labelStyle}>Apt / unit (optional)</span>
            <input value={newUnit} onChange={(e) => setNewUnit(e.target.value)} style={fieldStyle} />
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" disabled={busy} className="clients-btn clients-btn-primary" onClick={add}>{busy ? 'Adding…' : 'Add'}</button>
            <button type="button" className="clients-btn clients-btn-ghost" onClick={() => { setAdding(false); setError('') }}>Cancel</button>
          </div>
        </div>
      )}

      {error && <div style={{ marginTop: 8, fontSize: 12, color: '#dc2626' }}>{error}</div>}

      {showHistory && history.length > 0 && (
        <div style={{ marginTop: 16, borderTop: '1px solid var(--clients-line-soft)', paddingTop: 12 }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--clients-muted)', marginBottom: 8 }}>Address history</div>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: 6, listStyle: 'none', margin: 0, padding: 0 }}>
            {history.map((h) => (
              <li key={h.id} style={{ fontSize: 12, color: 'var(--clients-muted)' }}>
                <span style={{ fontWeight: 500, color: 'var(--clients-ink)' }}>{h.action}</span>
                {h.new_value?.address ? ` → ${h.new_value.address}` : ''}
                {h.action === 'edit' && h.old_value?.address ? ` (was ${h.old_value.address})` : ''}
                {' · '}{h.changed_by || 'system'}{h.source ? `/${h.source}` : ''}{' · '}
                {new Date(h.created_at).toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
