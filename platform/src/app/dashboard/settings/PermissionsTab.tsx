'use client'

import { useState } from 'react'
import PermissionsPanel from './PermissionsPanel'

type View = 'dashboard' | 'portal'

export default function PermissionsTab() {
  const [view, setView] = useState<View>('dashboard')

  return (
    <div className="space-y-5">
      <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
        <button
          onClick={() => setView('dashboard')}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            view === 'dashboard' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          Dashboard users
        </button>
        <button
          onClick={() => setView('portal')}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            view === 'portal' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          Field staff (portal)
        </button>
      </div>

      {view === 'dashboard' ? (
        <PermissionsPanel
          endpoint="/api/settings/permissions"
          intro="Office / operator roles for people who log into the dashboard. Owner always has full access. Re-tune Admin, Manager, and Staff — changes apply to everyone with that role."
        />
      ) : (
        <PermissionsPanel
          endpoint="/api/settings/portal-permissions"
          intro="Field-staff tiers for people who log into the /team portal with a PIN. Set what Workers, Leads, and Managers can see and do. Role changes take effect the next time they sign in."
        />
      )}
    </div>
  )
}
