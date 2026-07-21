'use client'

import { useState } from 'react'
import Breadcrumb from '../_components/Breadcrumb'
import CatalogTab from '../sales/CatalogTab'
import BudgetTab from '../sales/BudgetTab'
import BudgetTemplatesTab from '../sales/BudgetTemplatesTab'
import VendorsPage from '../jobs/vendors/page'
import CategoriesPage from '../sales/categories/page'
import InventoryPage from '../jobs/inventory/page'
import EquipmentPage from '../jobs/equipment/page'
import '../sales/sales.css'

// Catalog — one page, one nav entry, for the whole pricing/costing system.
// Used to be 6 scattered menu items (Services Catalog + Budgets + Categories
// under Sales, Vendors + Inventory + Equipment under Production) for one
// interconnected system: what you sell, what it costs, who you buy it from,
// how it rolls into a proposal's budget. Consolidated into tabs, same
// pattern as the Budgets/Templates split already used here.
type Tab = 'services' | 'budgets' | 'vendors' | 'categories' | 'inventory' | 'equipment'
const TABS: { key: Tab; label: string }[] = [
  { key: 'services', label: 'Services' },
  { key: 'budgets', label: 'Budgets' },
  { key: 'vendors', label: 'Vendors' },
  { key: 'categories', label: 'Categories' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'equipment', label: 'Equipment' },
]

export default function CatalogPage() {
  const [tab, setTab] = useState<Tab>('services')
  const [budgetSubTab, setBudgetSubTab] = useState<'budgets' | 'templates'>('budgets')

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
  const subTabBtn = (active: boolean): React.CSSProperties => ({
    fontSize: 12,
    fontWeight: 600,
    padding: '5px 12px',
    marginRight: 8,
    borderRadius: 6,
    border: '1px solid var(--sl-line,#e6e6e0)',
    background: active ? 'var(--sl-ink)' : '#fff',
    color: active ? '#fff' : 'var(--sl-muted)',
    cursor: 'pointer',
  })

  return (
    <div className="sl-scope">
      <Breadcrumb items={[{ label: 'Sales', href: '/dashboard/sales' }, { label: 'Catalog' }]} />

      <div style={{ display: 'flex', borderBottom: '1px solid var(--sl-line,#e6e6e0)', marginTop: 14 }}>
        {TABS.map((t) => (
          <button key={t.key} type="button" style={tabBtn(tab === t.key)} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {tab === 'services' && <div style={{ paddingTop: 12 }}><CatalogTab /></div>}

      {tab === 'budgets' && (
        <div style={{ paddingTop: 12 }}>
          <div style={{ marginBottom: 10 }}>
            <button type="button" style={subTabBtn(budgetSubTab === 'budgets')} onClick={() => setBudgetSubTab('budgets')}>Budgets</button>
            <button type="button" style={subTabBtn(budgetSubTab === 'templates')} onClick={() => setBudgetSubTab('templates')}>Templates</button>
          </div>
          {budgetSubTab === 'budgets' ? <BudgetTab onSwitchToTemplates={() => setBudgetSubTab('templates')} /> : <BudgetTemplatesTab />}
        </div>
      )}

      {tab === 'vendors' && <div style={{ paddingTop: 12 }}><VendorsPage /></div>}
      {tab === 'categories' && <div style={{ paddingTop: 12 }}><CategoriesPage /></div>}
      {tab === 'inventory' && <div style={{ paddingTop: 12 }}><InventoryPage /></div>}
      {tab === 'equipment' && <div style={{ paddingTop: 12 }}><EquipmentPage /></div>}
    </div>
  )
}
