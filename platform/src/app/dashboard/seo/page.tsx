'use client'

// Tenant-facing SEO summary. Deliberately minimal: a plain up/down health
// status and a plain-language weekly activity feed. No scores, no competitor
// names, no backend mechanics — see src/app/api/dashboard/seo/route.ts, which
// translates everything before it reaches this page.
import { useEffect, useState } from 'react'

interface HealthSummary {
  status: 'up' | 'down'
  lastChecked: string | null
}

interface ActivityItem {
  id: string
  text: string
  date: string
}

interface SeoSummary {
  health: HealthSummary
  activity: ActivityItem[]
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

export default function SeoPage() {
  const [data, setData] = useState<SeoSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch('/api/dashboard/seo')
      .then((r) => {
        if (!r.ok) throw new Error('failed')
        return r.json()
      })
      .then((d) => setData(d))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-slate-400 py-8 text-center">Loading...</p>
  if (error || !data) return <p className="text-slate-400 py-8 text-center">Failed to load SEO status</p>

  const up = data.health.status === 'up'

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-slate-900 mb-4">SEO</h1>

      {/* Health status */}
      <div className="border border-slate-200 rounded-lg p-5 mb-6">
        <h2 className="text-sm font-heading font-semibold text-slate-900 mb-3">Site Status</h2>
        <div className="flex items-center gap-3">
          <span className={`inline-block w-2.5 h-2.5 rounded-full ${up ? 'bg-green-500' : 'bg-red-500'}`} />
          <p className="text-sm font-medium text-slate-900">{up ? 'Online' : 'Down'}</p>
        </div>
        <p className="text-xs text-slate-400 mt-2">
          {data.health.lastChecked
            ? `Last checked ${fmtDate(data.health.lastChecked)}`
            : up
              ? 'No issues detected'
              : 'Check time unavailable'}
        </p>
      </div>

      {/* Weekly activity feed */}
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h2 className="text-sm font-heading font-semibold text-slate-900">This Week's Activity</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {data.activity.map((item) => (
            <div key={item.id} className="px-5 py-3 flex items-start justify-between gap-4">
              <p className="text-sm text-slate-700">{item.text}</p>
              <p className="text-xs text-slate-400 flex-shrink-0 whitespace-nowrap">{fmtDate(item.date)}</p>
            </div>
          ))}
          {data.activity.length === 0 && (
            <div className="px-5 py-12 text-center text-slate-400 text-sm">No SEO activity this week</div>
          )}
        </div>
      </div>
    </div>
  )
}
