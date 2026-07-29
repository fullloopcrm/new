'use client'

import ServiceAreaEditor from '@/components/ServiceAreaEditor'

// Service Area tab: team-page coverage map (local zones or national states).
// Extracted verbatim from settings/page.tsx (previously the 'Service Area'
// tab === branch). No props -- ServiceAreaEditor manages its own data.
export function ServiceAreaTab() {
  return (
    <div className="border border-slate-200 rounded-lg p-6 max-w-2xl">
      <p className="text-xs text-slate-400 mb-4">
        Sets your team-page coverage map. Local = one metro with zones; National = the states you serve.
        The map shows where your team lives so you can see where to recruit.
      </p>
      <ServiceAreaEditor />
    </div>
  )
}
