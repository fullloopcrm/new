'use client'

import { useEffect, useState } from 'react'

type OrderItem = { name: string; price_cents: number; qty: number; is_digital: boolean }
type Order = {
  id: string
  customer_email: string | null
  customer_name: string | null
  shipping_address: { name?: string | null; address?: Record<string, string | null> } | null
  subtotal_cents: number
  status: string
  fulfillment_type: string
  supplier_name: string | null
  external_order_id: string | null
  tracking_number: string | null
  carrier: string | null
  tracking_url: string | null
  created_at: string
  items: OrderItem[]
}

type FulfillmentDraft = {
  supplier_name: string
  external_order_id: string
  tracking_number: string
  carrier: string
  tracking_url: string
}

const STATUSES = ['paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'] as const
const STATUS_LABELS: Record<string, string> = { paid: 'Paid', processing: 'Processing', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled', refunded: 'Refunded' }

function fulfillmentDraft(o: Order): FulfillmentDraft {
  return {
    supplier_name: o.supplier_name || '',
    external_order_id: o.external_order_id || '',
    tracking_number: o.tracking_number || '',
    carrier: o.carrier || '',
    tracking_url: o.tracking_url || '',
  }
}

function money(cents: number): string {
  return '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function OrdersTab() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<FulfillmentDraft | null>(null)
  const [saving, setSaving] = useState(false)

  function load() {
    setLoading(true)
    fetch('/api/shop/orders')
      .then((r) => r.json())
      .then((d) => setOrders(d?.orders || []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  async function updateStatus(id: string, status: string) {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)))
    await fetch('/api/shop/orders', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) })
  }

  function openFulfillment(o: Order) {
    setEditingId(o.id)
    setDraft(fulfillmentDraft(o))
  }

  async function saveFulfillment(id: string) {
    if (!draft) return
    setSaving(true)
    try {
      const res = await fetch('/api/shop/orders', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...draft }) })
      const d = await res.json().catch(() => null)
      if (res.ok && d?.order) {
        setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...d.order } : o)))
        setEditingId(null)
        setDraft(null)
      }
    } finally {
      setSaving(false)
    }
  }

  const selectCls: React.CSSProperties = { padding: '5px 8px', border: '1px solid var(--sl-line,#e6e6e0)', borderRadius: 6, fontSize: 12, color: 'var(--sl-ink)', background: '#fff' }
  const inputCls: React.CSSProperties = { padding: '6px 8px', border: '1px solid var(--sl-line,#e6e6e0)', borderRadius: 6, fontSize: 12, color: 'var(--sl-ink)', background: '#fff', width: '100%' }
  const linkBtnCls: React.CSSProperties = { fontSize: 12, color: 'var(--sl-accent, #2f6fed)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }

  return (
    <div style={{ paddingTop: 12 }}>
      <div className="sl-section-head">
        <h2 className="sl-section-title">Orders<em>.</em></h2>
        <span className="sl-section-meta">{orders.length} order{orders.length === 1 ? '' : 's'}</span>
      </div>

      {loading && <div className="sl-empty">Loading…</div>}
      {!loading && orders.length === 0 && <div className="sl-empty">No orders yet.</div>}

      <div style={{ marginTop: 12 }}>
        {orders.map((o) => (
          <div key={o.id} style={{ background: 'var(--sl-canvas,#fff)', border: '1px solid var(--sl-line,#e6e6e0)', borderRadius: 12, padding: 14, marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--sl-ink)', margin: 0 }}>{o.customer_name || o.customer_email || 'Customer'}</p>
                <p style={{ fontSize: 12, color: 'var(--sl-muted)', margin: '2px 0 0' }}>{new Date(o.created_at).toLocaleString('en-US')} · {o.fulfillment_type}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--sl-ink)' }}>{money(o.subtotal_cents)}</span>
                <select style={selectCls} value={o.status} onChange={(e) => updateStatus(o.id, e.target.value)}>
                  {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
              </div>
            </div>
            <div style={{ borderTop: '1px solid var(--sl-line,#eee)', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
              {o.items.map((item, i) => (
                <span key={i} style={{ fontSize: 12, color: 'var(--sl-muted)' }}>
                  {item.name} × {item.qty}{item.is_digital ? ' (digital)' : ''} — {money(item.price_cents * item.qty)}
                </span>
              ))}
            </div>
            {o.shipping_address?.address && (
              <p style={{ fontSize: 12, color: 'var(--sl-muted)', marginTop: 8, marginBottom: 0 }}>
                Ship to: {[o.shipping_address.address.line1, o.shipping_address.address.city, o.shipping_address.address.state, o.shipping_address.address.postal_code].filter(Boolean).join(', ')}
              </p>
            )}

            <div style={{ borderTop: '1px solid var(--sl-line,#eee)', marginTop: 8, paddingTop: 8 }}>
              {editingId === o.id && draft ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <input style={inputCls} placeholder="Supplier" value={draft.supplier_name} onChange={(e) => setDraft({ ...draft, supplier_name: e.target.value })} />
                  <input style={inputCls} placeholder="Supplier order ID" value={draft.external_order_id} onChange={(e) => setDraft({ ...draft, external_order_id: e.target.value })} />
                  <input style={inputCls} placeholder="Tracking number" value={draft.tracking_number} onChange={(e) => setDraft({ ...draft, tracking_number: e.target.value })} />
                  <input style={inputCls} placeholder="Carrier" value={draft.carrier} onChange={(e) => setDraft({ ...draft, carrier: e.target.value })} />
                  <input style={{ ...inputCls, gridColumn: '1 / -1' }} placeholder="Tracking URL" value={draft.tracking_url} onChange={(e) => setDraft({ ...draft, tracking_url: e.target.value })} />
                  <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 12 }}>
                    <button type="button" style={linkBtnCls} disabled={saving} onClick={() => saveFulfillment(o.id)}>{saving ? 'Saving…' : 'Save'}</button>
                    <button type="button" style={{ ...linkBtnCls, color: 'var(--sl-muted)' }} onClick={() => { setEditingId(null); setDraft(null) }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <p style={{ fontSize: 12, color: 'var(--sl-muted)', margin: 0 }}>
                    {o.supplier_name || o.tracking_number ? (
                      <>
                        {o.supplier_name && <>Supplier: {o.supplier_name}</>}
                        {o.tracking_number && <>{o.supplier_name ? ' · ' : ''}Tracking: {o.carrier ? `${o.carrier} ` : ''}{o.tracking_url ? <a href={o.tracking_url} target="_blank" rel="noreferrer">{o.tracking_number}</a> : o.tracking_number}</>}
                      </>
                    ) : 'No fulfillment info yet'}
                  </p>
                  <button type="button" style={linkBtnCls} onClick={() => openFulfillment(o)}>{o.supplier_name || o.tracking_number ? 'Edit' : 'Add fulfillment info'}</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
