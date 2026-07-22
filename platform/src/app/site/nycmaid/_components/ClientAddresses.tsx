'use client'

import { useEffect, useState, useCallback } from 'react'

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
    const res = await fetch(`/api/client/properties?client_id=${clientId}${showHistory ? '&include_history=true' : ''}`)
    const data = await res.json()
    setProperties(data.properties || [])
    if (showHistory) setHistory(data.history || [])
    setLoading(false)
  }, [clientId, showHistory])

  useEffect(() => { load() }, [load])

  const add = async () => {
    if (newAddress.trim().length < 5) { setError('Enter a full address.'); return }
    setBusy(true); setError('')
    const res = await fetch('/api/client/properties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, address: newAddress.trim(), unit: newUnit.trim() || null }),
    })
    setBusy(false)
    if (!res.ok) { setError((await res.json()).error || 'Failed to add'); return }
    setNewAddress(''); setNewUnit(''); setAdding(false)
    load()
  }

  const saveEdit = async (id: string) => {
    if (editAddress.trim().length < 5) { setError('Enter a full address.'); return }
    setBusy(true); setError('')
    const res = await fetch('/api/client/properties', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, property_id: id, address: editAddress.trim() }),
    })
    setBusy(false)
    if (!res.ok) { setError((await res.json()).error || 'Failed to save'); return }
    setEditingId(null)
    load()
  }

  const patch = async (property_id: string, action: 'set_primary' | 'deactivate') => {
    setBusy(true)
    await fetch('/api/client/properties', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, property_id, action }),
    })
    setBusy(false)
    load()
  }

  if (loading) return null

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-[#1E2A4A]">Your Addresses</h3>
        {!adding && (
          <button onClick={() => { setAdding(true); setError('') }} className="text-sm font-medium text-[#1E2A4A] underline">
            + Add address
          </button>
        )}
      </div>

      <div className="space-y-2">
        {properties.map((p) => (
          <div key={p.id} className="border border-gray-200 rounded-lg p-3">
            {editingId === p.id ? (
              <div className="space-y-2">
                <input
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm text-[#1E2A4A]"
                  placeholder="Street, city, state, ZIP, unit"
                />
                <div className="flex gap-2">
                  <button disabled={busy} onClick={() => saveEdit(p.id)} className="px-3 py-1.5 bg-[#1E2A4A] text-white rounded-lg text-sm font-medium">Save</button>
                  <button onClick={() => setEditingId(null)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-3">
                <div className="text-sm text-[#1E2A4A]">
                  <span>{p.address}</span>
                  {p.is_primary && (
                    <span className="ml-2 align-middle text-[10px] font-semibold uppercase tracking-wide bg-[#A8F0DC]/40 text-[#1E2A4A] px-1.5 py-0.5 rounded">Primary</span>
                  )}
                </div>
                <div className="flex gap-2 shrink-0 text-xs">
                  {!p.is_primary && (
                    <button disabled={busy} onClick={() => patch(p.id, 'set_primary')} className="text-[#1E2A4A] underline">Make primary</button>
                  )}
                  <button onClick={() => { setEditingId(p.id); setEditAddress(p.address); setError('') }} className="text-gray-600 underline">Edit</button>
                  {!p.is_primary && properties.length > 1 && (
                    <button disabled={busy} onClick={() => patch(p.id, 'deactivate')} className="text-red-500 underline">Remove</button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {adding && (
        <div className="mt-3 border border-gray-200 rounded-lg p-3 space-y-2">
          <input
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-2 text-sm text-[#1E2A4A]"
            placeholder="Street, city, state, ZIP"
          />
          <input
            value={newUnit}
            onChange={(e) => setNewUnit(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-2 text-sm text-[#1E2A4A]"
            placeholder="Apt / unit (optional)"
          />
          <div className="flex gap-2">
            <button disabled={busy} onClick={add} className="px-3 py-1.5 bg-[#1E2A4A] text-white rounded-lg text-sm font-medium">{busy ? 'Adding…' : 'Add'}</button>
            <button onClick={() => { setAdding(false); setError('') }} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {showHistory && history.length > 0 && (
        <div className="mt-4 border-t border-gray-100 pt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Address history</p>
          <ul className="space-y-1.5">
            {history.map((h) => (
              <li key={h.id} className="text-xs text-gray-600">
                <span className="font-medium text-[#1E2A4A]">{h.action}</span>
                {h.new_value?.address ? ` → ${h.new_value.address}` : ''}
                {h.action === 'edit' && h.old_value?.address ? ` (was ${h.old_value.address})` : ''}
                <span className="text-gray-400"> · {h.changed_by || 'system'}{h.source ? `/${h.source}` : ''} · {new Date(h.created_at).toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!showHistory && (
        <p className="mt-3 text-xs text-gray-500">Adding an address here keeps it on your account — we never create a duplicate profile.</p>
      )}
    </div>
  )
}
