'use client'

import { useState } from 'react'
import CatalogTab from '../sales/CatalogTab'
import OrdersTab from './OrdersTab'
import EcommerceSettings from './ecommerce-settings'
import '../sales/sales.css'

// E-commerce home — Items (the storefront-facing slice of the Catalog,
// item_type='product' from the same service_types rows /dashboard/catalog
// manages — no separate product table, see the GLOBAL rule in CLAUDE.md)
// and Orders (shop_orders, populated by the Stripe webhook on checkout
// completion). Settings live in the shared top-right gear drawer, same
// pattern as every other tabbed dashboard page.
type Tab = 'items' | 'orders'
const TABS: { key: Tab; label: string }[] = [
  { key: 'items', label: 'Items' },
  { key: 'orders', label: 'Orders' },
]

export default function EcommercePage() {
  const [tab, setTab] = useState<Tab>('items')

  const tabBtn = (active: boolean): React.CSSProperties => ({
    fontSize: 13,
    fontWeight: 600,
    padding: '8px 4px',
    marginRight: 20,
    background: 'none',
    border: 'none',
    borderBottom: active ? '2px solid var(--sl-ink)' : '2px solid transparent',
    color: active ? 'var(--sl-ink)' : 'var(--sl-muted)',
    cursor: 'pointer',
  })

  return (
    <div className="sl-scope">
      <EcommerceSettings />

      <div style={{ display: 'flex', borderBottom: '1px solid var(--sl-line,#e6e6e0)' }}>
        {TABS.map((t) => (
          <button key={t.key} type="button" style={tabBtn(tab === t.key)} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {tab === 'items' && (
        <CatalogTab
          defaultType="product"
          lockType
          title="Items"
          subtitle="Physical and digital items for sale on your Shop page. Managed here, priced here, sold there — same list, one source of truth."
        />
      )}
      {tab === 'orders' && <OrdersTab />}
    </div>
  )
}
