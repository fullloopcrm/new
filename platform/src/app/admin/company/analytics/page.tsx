'use client'

import { useEffect, useState } from 'react'
import { StatCard, Panel, EmptyState } from '../../finance/finance-ui'

type Period = 'today' | 'week' | 'month'

interface AnalyticsData {
  period: Period
  truncated: boolean
  stats: { pageViews: number; sessions: number }
  topPages: { key: string; count: number }[]
  topReferrers: { key: string; count: number }[]
  devices: Record<string, number>
  utmSources: { key: string; count: number }[]
}

const PERIODS: { key: Period; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: '7 Days' },
  { key: 'month', label: '30 Days' },
]

function RankedList({ items, empty }: { items: { key: string; count: number }[]; empty: string }) {
  if (items.length === 0) return <EmptyState>{empty}</EmptyState>
  return (
    <div className="divide-y divide-gray-50">
      {items.map((i) => (
        <div key={i.key} className="flex items-center justify-between px-5 py-2.5 text-sm">
          <span className="text-slate-700 truncate pr-3">{i.key}</span>
          <span className="text-slate-500 font-mono shrink-0">{i.count}</span>
        </div>
      ))}
    </div>
  )
}

export default function CompanyAnalyticsPage() {
  useEffect(() => { document.title = 'Company Analytics | FullLoop Admin' }, [])

  const [period, setPeriod] = useState<Period>('week')
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`/api/admin/company/analytics?period=${period}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => { if (!cancelled) setData(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [period])

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-slate-900 font-heading text-2xl font-bold">Company Analytics</h1>
          <p className="text-sm text-slate-500">Traffic on Full Loop&rsquo;s own marketing site — not tenant sites.</p>
        </div>
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${period === p.key ? 'bg-white text-slate-900 shadow-sm' : 'text-gray-500 hover:text-slate-900'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading || !data ? (
        <p className="text-slate-500">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <StatCard label="Page Views" value={String(data.stats.pageViews)} />
            <StatCard label="Sessions" value={String(data.stats.sessions)} />
          </div>

          {data.truncated && (
            <p className="mb-4 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Showing a capped sample — traffic in this period exceeds the row limit.
            </p>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Panel title="Top Pages">
              <RankedList items={data.topPages} empty="No page views in this period" />
            </Panel>
            <Panel title="Top Referrers">
              <RankedList items={data.topReferrers} empty="No referrer data" />
            </Panel>
            <Panel title="UTM Sources">
              <RankedList items={data.utmSources} empty="No UTM-tagged traffic" />
            </Panel>
            <Panel title="Devices">
              <RankedList
                items={Object.entries(data.devices).map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count)}
                empty="No device data"
              />
            </Panel>
          </div>
        </>
      )}
    </div>
  )
}
