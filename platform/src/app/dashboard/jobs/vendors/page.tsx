'use client'

import { useEffect, useState } from 'react'
import '../../sales/sales.css'

// Vendors — a basic directory of suppliers/subcontractors the business orders
// from or hires. Supply-linking + auto-ordering off vendors is a later feature;
// this is just the record store (name, contact, category, address, notes).
type Vendor = {
  id: string
  name: string
  phone: string | null
  email: string | null
  category: string | null
  address: string | null
  notes: string | null
  active: boolean
}

type Draft = { name: string; phone: string; email: string; category: string; address: string; notes: string }
const EMPTY_DRAFT: Draft = { name: '', phone: '', email: '', category: '', address: '', notes: '' }

type InventoryItem = { id: string; name: string; unit_label: string }
type VendorItemLink = {
  id: string; inventory_item_id: string; unit_cost_cents: number; lead_time_days: number | null
  is_preferred: boolean; inventory_items: { id: string; name: string; unit_label: string } | null
}

function money(cents: number): string {
  return '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Draft>(EMPTY_DRAFT)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [vendorItems, setVendorItems] = useState<Record<string, VendorItemLink[]>>({})
  const [linkDraft, setLinkDraft] = useState({ inventory_item_id: '', unit_cost: '' })

  function load() {
    setLoading(true)
    Promise.all([
      fetch('/api/vendors').then((r) => r.json()).catch(() => ({ vendors: [] })),
      fetch('/api/inventory').then((r) => r.json()).catch(() => ({ items: [] })),
    ])
      .then(([v, i]) => {
        setVendors(v?.vendors || [])
        setInventoryItems(i?.items || [])
      })
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  function toggleExpand(id: string) {
    if (expandedId === id) { setExpandedId(null); return }
    setExpandedId(id)
    fetch(`/api/vendors/${id}/items`).then((r) => r.json()).then((d) => setVendorItems((prev) => ({ ...prev, [id]: d?.items || [] })))
  }

  async function linkItem(vendorId: string) {
    if (!linkDraft.inventory_item_id) return
    const res = await fetch(`/api/vendors/${vendorId}/items`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inventory_item_id: linkDraft.inventory_item_id,
        unit_cost_cents: Math.round((Number(linkDraft.unit_cost) || 0) * 100),
      }),
    })
    if (res.ok) {
      setLinkDraft({ inventory_item_id: '', unit_cost: '' })
      fetch(`/api/vendors/${vendorId}/items`).then((r) => r.json()).then((d) => setVendorItems((prev) => ({ ...prev, [vendorId]: d?.items || [] })))
    }
  }

  async function unlinkItem(vendorId: string, linkId: string) {
    await fetch(`/api/vendors/${vendorId}/items?id=${linkId}`, { method: 'DELETE' })
    fetch(`/api/vendors/${vendorId}/items`).then((r) => r.json()).then((d) => setVendorItems((prev) => ({ ...prev, [vendorId]: d?.items || [] })))
  }

  async function createVendor() {
    setErr('')
    if (!draft.name.trim()) { setErr('Name the vendor.'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/vendors', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      if (!res.ok) { const d = await res.json().catch(() => null); setErr((d && d.error) || 'Could not create vendor.'); return }
      setDraft(EMPTY_DRAFT); load()
    } finally { setSaving(false) }
  }

  function startEdit(v: Vendor) {
    setEditingId(v.id)
    setEditDraft({
      name: v.name, phone: v.phone || '', email: v.email || '',
      category: v.category || '', address: v.address || '', notes: v.notes || '',
    })
  }

  async function saveEdit(id: string) {
    await fetch('/api/vendors', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...editDraft }),
    })
    setEditingId(null)
    load()
  }

  async function removeVendor(id: string) {
    await fetch(`/api/vendors?id=${id}`, { method: 'DELETE' })
    load()
  }

  const inp: React.CSSProperties = { padding: '9px 11px', border: '1px solid var(--sl-line,#e6e6e0)', borderRadius: 8, fontSize: 14, width: '100%', background: '#fff', color: 'var(--sl-ink)' }
  const label: React.CSSProperties = { fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--sl-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }
  const grid2: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }

  return (
    <div className="sl-scope">
      <div className="sl-section-head" style={{ marginTop: 6 }}>
        <h2 className="sl-section-title">Vendors<em>.</em></h2>
        <span className="sl-section-meta">{vendors.length} vendor{vendors.length === 1 ? '' : 's'}</span>
      </div>
      <p style={{ fontSize: 12, color: 'var(--sl-muted)', margin: '0 0 16px' }}>
        Suppliers and subcontractors the business orders from or hires. Supply-linking and auto-ordering come later — this is the vendor directory.
      </p>

      {/* CREATE */}
      <div style={{ background: 'var(--sl-canvas,#fff)', border: '1px solid var(--sl-line,#e6e6e0)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
        <div style={{ ...grid2, marginBottom: 12 }}>
          <div>
            <label style={label}>Vendor name</label>
            <input style={inp} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. ABC Supply Co." />
          </div>
          <div>
            <label style={label}>Category / supplies type</label>
            <input style={inp} value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} placeholder="e.g. Cleaning supplies" />
          </div>
        </div>
        <div style={{ ...grid2, marginBottom: 12 }}>
          <div>
            <label style={label}>Phone</label>
            <input style={inp} value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} placeholder="(555) 555-5555" />
          </div>
          <div>
            <label style={label}>Email</label>
            <input style={inp} value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} placeholder="orders@vendor.com" />
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={label}>Address</label>
          <input style={inp} value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} placeholder="Street, city, state" />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={label}>Notes</label>
          <input style={inp} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Account #, lead time, terms…" />
        </div>
        {err && <div style={{ color: '#c0392b', fontSize: 13, marginBottom: 10 }}>{err}</div>}
        <button type="button" className="sl-newlead-btn" disabled={saving} onClick={createVendor}>{saving ? 'Adding…' : '+ Add vendor'}</button>
      </div>

      {/* LIST */}
      {loading && <div className="sl-empty">Loading…</div>}
      {!loading && vendors.length === 0 && <div className="sl-empty">No vendors yet — add your first above.</div>}
      {vendors.map((v) => (
        <div key={v.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--sl-line,#eee)' }}>
          {editingId === v.id ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={grid2}>
                <input style={inp} value={editDraft.name} onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })} placeholder="Name" />
                <input style={inp} value={editDraft.category} onChange={(e) => setEditDraft({ ...editDraft, category: e.target.value })} placeholder="Category" />
              </div>
              <div style={grid2}>
                <input style={inp} value={editDraft.phone} onChange={(e) => setEditDraft({ ...editDraft, phone: e.target.value })} placeholder="Phone" />
                <input style={inp} value={editDraft.email} onChange={(e) => setEditDraft({ ...editDraft, email: e.target.value })} placeholder="Email" />
              </div>
              <input style={inp} value={editDraft.address} onChange={(e) => setEditDraft({ ...editDraft, address: e.target.value })} placeholder="Address" />
              <input style={inp} value={editDraft.notes} onChange={(e) => setEditDraft({ ...editDraft, notes: e.target.value })} placeholder="Notes" />
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="sl-newlead-btn" onClick={() => saveEdit(v.id)}>Save</button>
                <button type="button" onClick={() => setEditingId(null)} style={{ fontSize: 12, background: 'none', border: 'none', color: 'var(--sl-muted)', cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontFamily: 'var(--sl-display)', fontSize: 16, fontWeight: 600, color: 'var(--sl-ink)', minWidth: 160 }}>{v.name}</span>
                <span style={{ flex: 1, fontSize: 13, color: 'var(--sl-muted)' }}>
                  {[v.category, v.phone, v.email, v.address].filter(Boolean).join(' · ') || 'No details'}
                </span>
                <button type="button" onClick={() => toggleExpand(v.id)} style={{ fontSize: 11, background: 'none', border: 'none', color: 'var(--sl-ink)', cursor: 'pointer' }}>
                  {expandedId === v.id ? 'Hide items' : 'Items supplied'}
                </button>
                <button type="button" onClick={() => startEdit(v)} style={{ fontSize: 11, background: 'none', border: 'none', color: 'var(--sl-ink)', cursor: 'pointer' }}>Edit</button>
                <button type="button" onClick={() => removeVendor(v.id)} style={{ fontSize: 11, background: 'none', border: 'none', color: '#c0392b', cursor: 'pointer' }}>Delete</button>
              </div>
              {expandedId === v.id && (
                <div style={{ marginTop: 12, paddingLeft: 16, borderLeft: '2px solid var(--sl-line,#eee)' }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'end' }}>
                    <div style={{ flex: 1 }}>
                      <label style={label}>Inventory item</label>
                      <select style={inp} value={linkDraft.inventory_item_id} onChange={(e) => setLinkDraft({ ...linkDraft, inventory_item_id: e.target.value })}>
                        <option value="">Select item…</option>
                        {inventoryItems.map((it) => <option key={it.id} value={it.id}>{it.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={label}>Cost ($)</label>
                      <input style={inp} type="number" step="0.01" value={linkDraft.unit_cost} onChange={(e) => setLinkDraft({ ...linkDraft, unit_cost: e.target.value })} placeholder="0.00" />
                    </div>
                    <button type="button" className="sl-newlead-btn" onClick={() => linkItem(v.id)}>Link</button>
                  </div>
                  {(vendorItems[v.id] || []).length === 0 && <div style={{ fontSize: 12, color: 'var(--sl-muted)' }}>No items linked yet.</div>}
                  {(vendorItems[v.id] || []).map((link) => (
                    <div key={link.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, padding: '6px 0' }}>
                      <span>{link.inventory_items?.name || 'Unknown item'}</span>
                      <span style={{ color: 'var(--sl-muted)' }}>{money(link.unit_cost_cents)}/{link.inventory_items?.unit_label || 'unit'}</span>
                      {link.is_preferred && <span style={{ fontSize: 10, fontWeight: 700, color: '#15803d' }}>PREFERRED</span>}
                      <button type="button" onClick={() => unlinkItem(v.id, link.id)} style={{ fontSize: 11, background: 'none', border: 'none', color: '#c0392b', cursor: 'pointer' }}>Unlink</button>
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
