'use client'

import { useState } from 'react'
import Link from 'next/link'
import CatalogTab from '../sales/CatalogTab'
import PackagesTab from '../sales/PackagesTab'
import '../sales/sales.css'

// Master Catalog — its own page under Sales in the main menu. Every service,
// project, and product the business sells lives here (Items), plus bundles
// of those items for one-click proposal building (Packages).
export default function CatalogPage() {
  const [tab, setTab] = useState<'items' | 'packages'>('items')

  return (
    <div className="sl-scope">
      <Link href="/dashboard/sales" className="text-xs text-slate-500 hover:underline">← Sales</Link>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button
          type="button"
          onClick={() => setTab('items')}
          className={tab === 'items' ? 'sl-newlead-btn' : ''}
          style={tab === 'items' ? undefined : { fontSize: 13, background: 'none', border: '1px solid var(--sl-line,#ddd)', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', color: 'var(--sl-ink)' }}
        >
          Items
        </button>
        <button
          type="button"
          onClick={() => setTab('packages')}
          className={tab === 'packages' ? 'sl-newlead-btn' : ''}
          style={tab === 'packages' ? undefined : { fontSize: 13, background: 'none', border: '1px solid var(--sl-line,#ddd)', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', color: 'var(--sl-ink)' }}
        >
          Packages
        </button>
      </div>
      {tab === 'items' ? <CatalogTab /> : <PackagesTab />}
    </div>
  )
}
