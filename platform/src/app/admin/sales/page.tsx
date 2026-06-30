'use client'

import { useState } from 'react'
import { LeadsPanel } from './LeadsPanel'
import { AccountsPanel } from './AccountsPanel'

type View = 'leads' | 'accounts'

const VIEWS: { key: View; label: string }[] = [
  { key: 'leads', label: 'Leads' },
  { key: 'accounts', label: 'Accounts' },
]

export default function SalesPage() {
  const [view, setView] = useState<View>('leads')

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-heading font-bold text-slate-900">Sales</h1>
        <p className="text-sm text-slate-500">Inbound lead to onboarded tenant — the full process in one place</p>
      </div>

      <div className="inline-flex gap-1 mb-6 bg-slate-100 rounded-lg p-1">
        {VIEWS.map(v => (
          <button
            key={v.key}
            onClick={() => setView(v.key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              view === v.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {view === 'leads' ? <LeadsPanel /> : <AccountsPanel />}
    </div>
  )
}
