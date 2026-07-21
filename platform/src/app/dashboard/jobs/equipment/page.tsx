'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import '../../sales/sales.css'

// Equipment — depreciable physical assets (dumpsters, generators,
// skid-steers) that get checked out and returned rather than consumed.
// Depreciation itself posts to Finance on its own schedule; this page is
// asset tracking + booking, not the depreciation run.
type ServiceType = { id: string; name: string; item_type: string }
type Equipment = {
  id: string
  service_type_id: string | null
  name: string
  asset_tag: string | null
  acquisition_cost_cents: number
  acquisition_date: string | null
  useful_life_months: number | null
  salvage_value_cents: number
  accumulated_depreciation_cents: number
  status: string
  notes: string | null
}
type Booking = {
  id: string; equipment_id: string; job_id: string | null; start_date: string; end_date: string | null
  status: string; rate_cents: number; notes: string | null
}

type Draft = {
  name: string; service_type_id: string; asset_tag: string; acquisition_cost: string
  acquisition_date: string; useful_life_months: string; salvage_value: string; notes: string
}
const EMPTY_DRAFT: Draft = { name: '', service_type_id: '', asset_tag: '', acquisition_cost: '', acquisition_date: '', useful_life_months: '', salvage_value: '', notes: '' }

function money(cents: number): string {
  return '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function toCents(dollars: string): number {
  const n = Number(dollars)
  return Number.isFinite(n) ? Math.round(n * 100) : 0
}
function bookValue(e: Equipment): number {
  return Math.max(e.acquisition_cost_cents - e.accumulated_depreciation_cents, e.salvage_value_cents)
}

const STATUS_STYLES: Record<string, React.CSSProperties> = {
  available: { background: '#dcfce7', color: '#15803d' },
  out: { background: '#dbeafe', color: '#1d4ed8' },
  maintenance: { background: '#fef3c7', color: '#b45309' },
  retired: { background: '#f1f5f9', color: '#64748b' },
}

export default function EquipmentPage() {
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Draft>(EMPTY_DRAFT)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [bookings, setBookings] = useState<Record<string, Booking[]>>({})
  const [bookDraft, setBookDraft] = useState({ start_date: '', end_date: '', rate: '' })

  function load() {
    setLoading(true)
    Promise.all([
      fetch('/api/equipment').then((r) => r.json()).catch(() => ({ equipment: [] })),
      fetch('/api/catalog').then((r) => r.json()).catch(() => ({ items: [] })),
    ])
      .then(([e, c]) => {
        setEquipment(e?.equipment || [])
        setServiceTypes((c?.items || []).filter((i: ServiceType) => i.item_type === 'equipment'))
      })
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const catalogName = (id: string | null) => serviceTypes.find((s) => s.id === id)?.name || null

  async function createEquipment() {
    setErr('')
    if (!draft.name.trim()) { setErr('Name the equipment.'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/equipment', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: draft.name, service_type_id: draft.service_type_id || null, asset_tag: draft.asset_tag || null,
          acquisition_cost_cents: toCents(draft.acquisition_cost), acquisition_date: draft.acquisition_date || null,
          useful_life_months: draft.useful_life_months ? Number(draft.useful_life_months) : null,
          salvage_value_cents: toCents(draft.salvage_value), notes: draft.notes || null,
        }),
      })
      if (!res.ok) { const d = await res.json().catch(() => null); setErr((d && d.error) || 'Could not create equipment.'); return }
      setDraft(EMPTY_DRAFT); load()
    } finally { setSaving(false) }
  }

  function startEdit(e: Equipment) {
    setEditingId(e.id)
    setEditDraft({
      name: e.name, service_type_id: e.service_type_id || '', asset_tag: e.asset_tag || '',
      acquisition_cost: (e.acquisition_cost_cents / 100).toFixed(2), acquisition_date: e.acquisition_date || '',
      useful_life_months: e.useful_life_months != null ? String(e.useful_life_months) : '',
      salvage_value: (e.salvage_value_cents / 100).toFixed(2), notes: e.notes || '',
    })
  }

  async function saveEdit(id: string) {
    await fetch('/api/equipment', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id, name: editDraft.name, service_type_id: editDraft.service_type_id || null, asset_tag: editDraft.asset_tag || null,
        acquisition_cost_cents: toCents(editDraft.acquisition_cost), acquisition_date: editDraft.acquisition_date || null,
        useful_life_months: editDraft.useful_life_months ? Number(editDraft.useful_life_months) : null,
        salvage_value_cents: toCents(editDraft.salvage_value), notes: editDraft.notes || null,
      }),
    })
    setEditingId(null)
    load()
  }

  async function removeEquipment(id: string) {
    await fetch(`/api/equipment?id=${id}`, { method: 'DELETE' })
    load()
  }

  function toggleExpand(id: string) {
    if (expandedId === id) { setExpandedId(null); return }
    setExpandedId(id)
    fetch(`/api/equipment/${id}/bookings`).then((r) => r.json()).then((d) => setBookings((prev) => ({ ...prev, [id]: d?.bookings || [] })))
  }

  async function createBooking(equipmentId: string) {
    if (!bookDraft.start_date) return
    const res = await fetch(`/api/equipment/${equipmentId}/bookings`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ start_date: bookDraft.start_date, end_date: bookDraft.end_date || null, rate_cents: toCents(bookDraft.rate), status: 'scheduled' }),
    })
    if (res.ok) {
      setBookDraft({ start_date: '', end_date: '', rate: '' })
      fetch(`/api/equipment/${equipmentId}/bookings`).then((r) => r.json()).then((d) => setBookings((prev) => ({ ...prev, [equipmentId]: d?.bookings || [] })))
      load()
    } else {
      const d = await res.json().catch(() => null)
      alert((d && d.error) || 'Could not create booking')
    }
  }

  async function markReturned(equipmentId: string, bookingId: string) {
    await fetch(`/api/equipment/${equipmentId}/bookings`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: bookingId, status: 'returned', end_date: new Date().toISOString().slice(0, 10) }),
    })
    fetch(`/api/equipment/${equipmentId}/bookings`).then((r) => r.json()).then((d) => setBookings((prev) => ({ ...prev, [equipmentId]: d?.bookings || [] })))
    load()
  }

  const inp: React.CSSProperties = { padding: '9px 11px', border: '1px solid var(--sl-line,#e6e6e0)', borderRadius: 8, fontSize: 14, width: '100%', background: '#fff', color: 'var(--sl-ink)' }
  const label: React.CSSProperties = { fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--sl-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }
  const grid4: React.CSSProperties = { display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 12 }

  return (
    <div className="sl-scope">
      <Link href="/dashboard/jobs" className="text-xs text-slate-500 hover:underline">← Production</Link>

      <div className="sl-section-head" style={{ marginTop: 6 }}>
        <h2 className="sl-section-title">Equipment<em>.</em></h2>
        <span className="sl-section-meta">{equipment.length} unit{equipment.length === 1 ? '' : 's'}</span>
      </div>
      <p style={{ fontSize: 12, color: 'var(--sl-muted)', margin: '0 0 16px' }}>
        Depreciable assets that get checked out and returned — dumpsters, generators, equipment rentals. Optionally tied to a Services Catalog item (item type "equipment") for billing. Depreciation posts to Finance separately.
      </p>

      {/* CREATE */}
      <div style={{ background: 'var(--sl-canvas,#fff)', border: '1px solid var(--sl-line,#e6e6e0)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
        <div style={{ ...grid4, marginBottom: 12 }}>
          <div>
            <label style={label}>Unit name</label>
            <input style={inp} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. 10-Yard Dumpster #3" />
          </div>
          <div>
            <label style={label}>Asset tag</label>
            <input style={inp} value={draft.asset_tag} onChange={(e) => setDraft({ ...draft, asset_tag: e.target.value })} placeholder="Optional" />
          </div>
          <div>
            <label style={label}>Catalog item (billing)</label>
            <select style={inp} value={draft.service_type_id} onChange={(e) => setDraft({ ...draft, service_type_id: e.target.value })}>
              <option value="">Internal use only</option>
              {serviceTypes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label style={label}>Acquisition date</label>
            <input style={inp} type="date" value={draft.acquisition_date} onChange={(e) => setDraft({ ...draft, acquisition_date: e.target.value })} />
          </div>
        </div>
        <div style={{ ...grid4, marginBottom: 12 }}>
          <div>
            <label style={label}>Acquisition cost ($)</label>
            <input style={inp} type="number" step="0.01" value={draft.acquisition_cost} onChange={(e) => setDraft({ ...draft, acquisition_cost: e.target.value })} placeholder="0.00" />
          </div>
          <div>
            <label style={label}>Useful life (months)</label>
            <input style={inp} type="number" value={draft.useful_life_months} onChange={(e) => setDraft({ ...draft, useful_life_months: e.target.value })} placeholder="e.g. 60" />
          </div>
          <div>
            <label style={label}>Salvage value ($)</label>
            <input style={inp} type="number" step="0.01" value={draft.salvage_value} onChange={(e) => setDraft({ ...draft, salvage_value: e.target.value })} placeholder="0.00" />
          </div>
          <div>
            <label style={label}>Notes</label>
            <input style={inp} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
          </div>
        </div>
        {err && <div style={{ color: '#c0392b', fontSize: 13, marginBottom: 10 }}>{err}</div>}
        <button type="button" className="sl-newlead-btn" disabled={saving} onClick={createEquipment}>{saving ? 'Adding…' : '+ Add equipment'}</button>
      </div>

      {/* LIST */}
      {loading && <div className="sl-empty">Loading…</div>}
      {!loading && equipment.length === 0 && <div className="sl-empty">No equipment yet — add your first unit above.</div>}
      {equipment.map((e) => (
        <div key={e.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--sl-line,#eee)' }}>
          {editingId === e.id ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={grid4}>
                <input style={inp} value={editDraft.name} onChange={(ev) => setEditDraft({ ...editDraft, name: ev.target.value })} placeholder="Name" />
                <input style={inp} value={editDraft.asset_tag} onChange={(ev) => setEditDraft({ ...editDraft, asset_tag: ev.target.value })} placeholder="Asset tag" />
                <input style={inp} type="number" step="0.01" value={editDraft.acquisition_cost} onChange={(ev) => setEditDraft({ ...editDraft, acquisition_cost: ev.target.value })} placeholder="Cost" />
                <input style={inp} type="number" value={editDraft.useful_life_months} onChange={(ev) => setEditDraft({ ...editDraft, useful_life_months: ev.target.value })} placeholder="Useful life (mo)" />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="sl-newlead-btn" onClick={() => saveEdit(e.id)}>Save</button>
                <button type="button" onClick={() => setEditingId(null)} style={{ fontSize: 12, background: 'none', border: 'none', color: 'var(--sl-muted)', cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontFamily: 'var(--sl-display)', fontSize: 16, fontWeight: 600, color: 'var(--sl-ink)', minWidth: 200 }}>{e.name}</span>
                <span style={{ flex: 1, fontSize: 13, color: 'var(--sl-muted)' }}>
                  {[catalogName(e.service_type_id), e.asset_tag, `book value ${money(bookValue(e))}`].filter(Boolean).join(' · ')}
                </span>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, ...(STATUS_STYLES[e.status] || {}) }}>
                  {e.status.toUpperCase()}
                </span>
                <button type="button" onClick={() => toggleExpand(e.id)} style={{ fontSize: 11, background: 'none', border: 'none', color: 'var(--sl-ink)', cursor: 'pointer' }}>
                  {expandedId === e.id ? 'Hide bookings' : 'Bookings'}
                </button>
                <button type="button" onClick={() => startEdit(e)} style={{ fontSize: 11, background: 'none', border: 'none', color: 'var(--sl-ink)', cursor: 'pointer' }}>Edit</button>
                <button type="button" onClick={() => removeEquipment(e.id)} style={{ fontSize: 11, background: 'none', border: 'none', color: '#c0392b', cursor: 'pointer' }}>Delete</button>
              </div>
              {expandedId === e.id && (
                <div style={{ marginTop: 12, paddingLeft: 16, borderLeft: '2px solid var(--sl-line,#eee)' }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'end' }}>
                    <div>
                      <label style={label}>Start date</label>
                      <input style={inp} type="date" value={bookDraft.start_date} onChange={(ev) => setBookDraft({ ...bookDraft, start_date: ev.target.value })} />
                    </div>
                    <div>
                      <label style={label}>End date</label>
                      <input style={inp} type="date" value={bookDraft.end_date} onChange={(ev) => setBookDraft({ ...bookDraft, end_date: ev.target.value })} />
                    </div>
                    <div>
                      <label style={label}>Rate ($)</label>
                      <input style={inp} type="number" step="0.01" value={bookDraft.rate} onChange={(ev) => setBookDraft({ ...bookDraft, rate: ev.target.value })} />
                    </div>
                    <button type="button" className="sl-newlead-btn" onClick={() => createBooking(e.id)}>Book</button>
                  </div>
                  {(bookings[e.id] || []).length === 0 && <div style={{ fontSize: 12, color: 'var(--sl-muted)' }}>No bookings yet.</div>}
                  {(bookings[e.id] || []).map((b) => (
                    <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, padding: '6px 0' }}>
                      <span>{b.start_date} → {b.end_date || 'open'}</span>
                      <span style={{ color: 'var(--sl-muted)' }}>{money(b.rate_cents)}</span>
                      <span style={{ textTransform: 'uppercase', fontSize: 10, fontWeight: 700, color: 'var(--sl-muted)' }}>{b.status}</span>
                      {(b.status === 'scheduled' || b.status === 'out') && (
                        <button type="button" onClick={() => markReturned(e.id, b.id)} style={{ fontSize: 11, background: 'none', border: 'none', color: 'var(--sl-ink)', cursor: 'pointer' }}>Mark returned</button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  )
}
