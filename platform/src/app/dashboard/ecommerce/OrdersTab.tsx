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
  created_at: string
  items: OrderItem[]
}

const STATUSES = ['paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'] as const
const STATUS_LABELS: Record<string, string> = { paid: 'Paid', processing: 'Processing', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled', refunded: 'Refunded' }

function money(cents: number): string {
  return '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function OrdersTab() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

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

  const selectCls: React.CSSProperties = { padding: '5px 8px', border: '1px solid var(--sl-line,#e6e6e0)', borderRadius: 6, fontSize: 12, color: 'var(--sl-ink)', background: '#fff' }

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
          </div>
        ))}
      </div>
    </div>
  )
}
