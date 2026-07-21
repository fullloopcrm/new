'use client'

import { useState } from 'react'
import Breadcrumb from '../../_components/Breadcrumb'
import BudgetTab from '../BudgetTab'
import BudgetTemplatesTab from '../BudgetTemplatesTab'
import '../sales.css'

// Budgets — one page under Sales, two tabs: Budgets (per-proposal, applies
// a saved template + tracks actuals) and Templates (standalone, reusable
// packages, no customer/quote attached). Combined so there's one obvious
// place to manage everything budget-related instead of two separate pages.
export default function BudgetPage() {
  const [tab, setTab] = useState<'budgets' | 'templates'>('budgets')

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
      <Breadcrumb items={[{ label: 'Sales', href: '/dashboard/sales' }, { label: 'Budgets' }]} />

      <div style={{ display: 'flex', borderBottom: '1px solid var(--sl-line,#e6e6e0)', marginTop: 14 }}>
        <button type="button" style={tabBtn(tab === 'budgets')} onClick={() => setTab('budgets')}>Budgets</button>
        <button type="button" style={tabBtn(tab === 'templates')} onClick={() => setTab('templates')}>Templates</button>
      </div>

      {tab === 'budgets' ? <BudgetTab onSwitchToTemplates={() => setTab('templates')} /> : <BudgetTemplatesTab />}
    </div>
  )
}
