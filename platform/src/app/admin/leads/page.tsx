'use client'

import { useEffect, useState } from 'react'

interface FeedItem {
  id: string
  tenant_id: string
  device: string
  referrer: string | null
  page_url: string
  scroll_depth: number
  time_on_page: number
  active_time: number
  cta_clicked: boolean
  cta_type: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  created_at: string
}

interface CtaDetail {
  session_id: string
  action: string
  referrer: string | null
  device: string
  tenant_id: string
  created_at: string
}

interface TenantRow {
  id: string
  name: string
  visits: number
  ctas: number
}

type DrilldownType =
  | 'today' | 'week' | 'month' | 'year' | 'all'
  | 'texts' | 'calls' | 'bookings'
  | 'totalCtas' | 'conversionPct'

const DASH_DEFAULT = {
  today: 0, thisWeek: 0, thisMonth: 0, thisYear: 0, allTime: 0,
  conversionPct: 0, totalTexts: 0, totalCalls: 0, totalBooks: 0, totalCtas: 0,
}

export default function AdminLeadsPage() {
  const [dashboard, setDashboard] = useState(DASH_DEFAULT)
  const [liveFeed, setLiveFeed] = useState<FeedItem[]>([])
  const [ctaDetails, setCtaDetails] = useState<CtaDetail[]>([])
  const [tenants, setTenants] = useState<TenantRow[]>([])
  const [drilldown, setDrilldown] = useState<DrilldownType | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/leads')
      .then(r => r.json())
      .then(d => {
        setDashboard(d.dashboard || DASH_DEFAULT)
        setLiveFeed(d.liveFeed || [])
        setCtaDetails(d.ctaDetails || [])
        setTenants(d.tenants || [])
      })
      .finally(() => setLoading(false))
  }, [])

  const getDrilldownData = (): { label: string; kind: 'visitors' | 'cta'; data: any[] } | null => {
    if (!drilldown) return null

    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const dayOfWeek = now.getDay() || 7
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + 1).getTime()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
    const startOfYear = new Date(now.getFullYear(), 0, 1).getTime()

    switch (drilldown) {
      case 'today':
        return { label: 'Today', kind: 'visitors', data: liveFeed.filter(e => new Date(e.created_at).getTime() >= startOfToday) }
      case 'week':
        return { label: 'This Week', kind: 'visitors', data: liveFeed.filter(e => new Date(e.created_at).getTime() >= startOfWeek) }
      case 'month':
        return { label: 'This Month', kind: 'visitors', data: liveFeed.filter(e => new Date(e.created_at).getTime() >= startOfMonth) }
      case 'year':
        return { label: 'This Year', kind: 'visitors', data: liveFeed.filter(e => new Date(e.created_at).getTime() >= startOfYear) }
      case 'all':
        return { label: 'All Time', kind: 'visitors', data: liveFeed }
      case 'texts':
        return { label: 'Texts', kind: 'cta', data: ctaDetails.filter(c => c.action === 'text') }
      case 'calls':
        return { label: 'Calls', kind: 'cta', data: ctaDetails.filter(c => c.action === 'call') }
      case 'bookings':
        return { label: 'Bookings', kind: 'cta', data: ctaDetails.filter(c => c.action === 'book') }
      case 'totalCtas':
        return { label: 'Total CTAs', kind: 'cta', data: ctaDetails }
      case 'conversionPct':
        return { label: 'Conversion %', kind: 'cta', data: ctaDetails }
      default:
        return null
    }
  }

  if (loading) return <div className="text-center py-12 text-slate-400">Loading...</div>

  const v = (n: number) => n > 0 ? n : '—'
  const drill = getDrilldownData()

  const row1Cards: { label: string; value: number; type: DrilldownType }[] = [
    { label: 'Today', value: dashboard.today, type: 'today' },
    { label: 'This Week', value: dashboard.thisWeek, type: 'week' },
    { label: 'This Month', value: dashboard.thisMonth, type: 'month' },
    { label: 'This Year', value: dashboard.thisYear, type: 'year' },
    { label: 'All Time', value: dashboard.allTime, type: 'all' },
  ]

  const row2Cards: { label: string; value: string | number; type: DrilldownType }[] = [
    { label: 'Conversion %', value: `${dashboard.conversionPct}%`, type: 'conversionPct' },
    { label: 'Texts', value: dashboard.totalTexts, type: 'texts' },
    { label: 'Calls', value: dashboard.totalCalls, type: 'calls' },
    { label: 'Bookings', value: dashboard.totalBooks, type: 'bookings' },
    { label: 'Total CTAs', value: dashboard.totalCtas, type: 'totalCtas' },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-heading">Leads</h1>
        <p className="text-sm text-slate-400">Website visitor tracking across all businesses</p>
      </div>

      {/* Row 1 — Visitors */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        {row1Cards.map(s => (
          <button
            key={s.label}
            onClick={() => setDrilldown(s.type)}
            className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center transition-all hover:border-teal-500/50 hover:shadow-md hover:shadow-teal-500/5 cursor-pointer"
          >
            <p className="text-2xl font-bold font-mono text-white">{s.value.toLocaleString()}</p>
            <p className="text-[10px] font-semibold tracking-widest text-slate-400 uppercase mt-1">{s.label}</p>
          </button>
        ))}
      </div>

      {/* Row 2 — Conversions */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {row2Cards.map(s => (
          <button
            key={s.label}
            onClick={() => setDrilldown(s.type)}
            className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center transition-all hover:border-teal-500/50 hover:shadow-md hover:shadow-teal-500/5 cursor-pointer"
          >
            <p className="text-2xl font-bold font-mono text-white">{typeof s.value === 'number' ? s.value.toLocaleString() : s.value}</p>
            <p className="text-[10px] font-semibold tracking-widest text-slate-400 uppercase mt-1">{s.label}</p>
          </button>
        ))}
      </div>

      {/* Drill-down Modal */}
      {drill && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={() => setDrilldown(null)}>
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="relative bg-slate-800 w-full md:max-w-4xl md:rounded-xl rounded-t-xl shadow-2xl max-h-[85vh] flex flex-col border border-slate-700"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700 shrink-0">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-widest">{drill.label}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{drill.data.length} records</p>
              </div>
              <button onClick={() => setDrilldown(null)} className="text-slate-400 hover:text-white text-xl leading-none">&times;</button>
            </div>

            {/* Table */}
            <div className="overflow-auto flex-1 p-5">
              {drill.data.length === 0 ? (
                <p className="text-sm text-slate-400 py-4">No records.</p>
              ) : drill.kind === 'visitors' ? (
                <table className="w-full text-sm">
                  <thead className="bg-slate-700/50 border-b border-slate-700 text-left text-[10px] font-semibold tracking-wider uppercase text-slate-400 whitespace-nowrap">
                    <tr>
                      <th className="px-3 py-2.5 w-10">#</th>
                      <th className="px-3 py-2.5">Page</th>
                      <th className="px-3 py-2.5">Source</th>
                      <th className="px-3 py-2.5 text-center">Device</th>
                      <th className="px-3 py-2.5 text-right">Scroll</th>
                      <th className="px-3 py-2.5 text-right">Time</th>
                      <th className="px-3 py-2.5 text-right">When</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {(drill.data as FeedItem[]).map((e, i) => (
                      <tr key={e.id} className="hover:bg-slate-700/30 transition-colors whitespace-nowrap">
                        <td className="px-3 py-2 text-xs text-slate-500">{i + 1}</td>
                        <td className="px-3 py-2 text-white font-medium max-w-[200px] truncate">{e.page_url}</td>
                        <td className="px-3 py-2 text-slate-400 max-w-[200px] truncate">{e.referrer || 'Direct'}</td>
                        <td className="px-3 py-2 text-center text-slate-400">{e.device}</td>
                        <td className="px-3 py-2 text-right text-slate-400">{e.scroll_depth > 0 ? `${e.scroll_depth}%` : '—'}</td>
                        <td className="px-3 py-2 text-right text-slate-400">{e.time_on_page > 0 ? `${e.time_on_page}s` : '—'}</td>
                        <td className="px-3 py-2 text-right text-slate-400">{timeAgo(e.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-700/50 border-b border-slate-700 text-left text-[10px] font-semibold tracking-wider uppercase text-slate-400 whitespace-nowrap">
                    <tr>
                      <th className="px-3 py-2.5 w-10">#</th>
                      <th className="px-3 py-2.5">Action</th>
                      <th className="px-3 py-2.5">Source</th>
                      <th className="px-3 py-2.5 text-center">Device</th>
                      <th className="px-3 py-2.5 text-right">When</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {(drill.data as CtaDetail[]).map((e, i) => (
                      <tr key={i} className="hover:bg-slate-700/30 transition-colors whitespace-nowrap">
                        <td className="px-3 py-2 text-xs text-slate-500">{i + 1}</td>
                        <td className="px-3 py-2 font-medium capitalize text-teal-400">{e.action}</td>
                        <td className="px-3 py-2 text-slate-400 max-w-[200px] truncate">{e.referrer || 'Direct'}</td>
                        <td className="px-3 py-2 text-center text-slate-400">{e.device}</td>
                        <td className="px-3 py-2 text-right text-slate-400">{timeAgo(e.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Live Feed */}
      <Section title={`Live Feed — ${liveFeed.length} Visitors`}>
        {liveFeed.length === 0 ? (
          <p className="text-sm text-slate-400 py-4">No visitors recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-700/50 border-b border-slate-700 text-left text-[10px] font-semibold tracking-wider uppercase text-slate-400 whitespace-nowrap">
                <tr>
                  <th className="px-3 py-2.5 w-10">#</th>
                  <th className="px-3 py-2.5">Page</th>
                  <th className="px-3 py-2.5">Source</th>
                  <th className="px-3 py-2.5 text-center">Device</th>
                  <th className="px-3 py-2.5 text-center">CTA</th>
                  <th className="px-3 py-2.5 text-right">Scroll</th>
                  <th className="px-3 py-2.5 text-right">Time</th>
                  <th className="px-3 py-2.5 text-right">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {liveFeed.map((e, i) => (
                  <tr key={e.id} className="hover:bg-slate-700/30 transition-colors whitespace-nowrap">
                    <td className="px-3 py-2 text-xs text-slate-500">{i + 1}</td>
                    <td className="px-3 py-2 text-white font-medium max-w-[200px] truncate">{e.page_url}</td>
                    <td className="px-3 py-2 text-slate-400 max-w-[200px] truncate">{e.referrer || 'Direct'}</td>
                    <td className="px-3 py-2 text-center text-slate-400">{e.device}</td>
                    <td className="px-3 py-2 text-center text-teal-400 font-medium">{e.cta_clicked ? (e.cta_type || 'Y') : '—'}</td>
                    <td className="px-3 py-2 text-right text-slate-400">{e.scroll_depth > 0 ? `${e.scroll_depth}%` : '—'}</td>
                    <td className="px-3 py-2 text-right text-slate-400">{e.time_on_page > 0 ? `${e.time_on_page}s` : '—'}</td>
                    <td className="px-3 py-2 text-right text-slate-400">{timeAgo(e.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Tenant Breakdown */}
      <div className="mt-6">
        <Section title={`Businesses — ${tenants.length}`}>
          {tenants.length === 0 ? (
            <p className="text-sm text-slate-400 py-4">No business data yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-700/50 border-b border-slate-700 text-left text-[10px] font-semibold tracking-wider uppercase text-slate-400 whitespace-nowrap">
                  <tr>
                    <th className="px-3 py-2.5 w-10">#</th>
                    <th className="px-3 py-2.5">Business</th>
                    <th className="px-3 py-2.5 text-center">Visits</th>
                    <th className="px-3 py-2.5 text-center">CTAs</th>
                    <th className="px-3 py-2.5 text-right">Conv %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {tenants.map((t, i) => (
                    <tr key={t.id} className="hover:bg-slate-700/30 transition-colors whitespace-nowrap">
                      <td className="px-3 py-2 text-xs text-slate-500">{i + 1}</td>
                      <td className="px-3 py-2 text-white font-medium">{t.name}</td>
                      <td className="px-3 py-2 text-center text-slate-400">{v(t.visits)}</td>
                      <td className="px-3 py-2 text-center text-teal-400 font-medium">{v(t.ctas)}</td>
                      <td className="px-3 py-2 text-right text-slate-400">{t.visits > 0 ? `${((t.ctas / t.visits) * 100).toFixed(1)}%` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl">
      <div className="px-5 py-4 border-b border-slate-700">
        <h3 className="text-xs font-semibold tracking-widest text-slate-400 uppercase">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
