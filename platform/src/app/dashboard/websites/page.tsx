'use client'

import { useEffect, useState } from 'react'
import { useUserPrefs } from '@/lib/use-user-prefs'

type Period = 'today' | 'week' | 'month'

interface VisitsResponse {
  stats: {
    pageViews: number
    sessions: number
    visitors: number
    ctas: number
    avgTime: number
    avgScroll: number
    bounceRate: number
    convRate: number
  }
  devices: Record<string, number>
  ctaBreakdown: Record<string, number>
  topPages: { page: string; count: number }[]
  topDomains: { domain: string; visits: number; ctas: number }[]
  sources: { source: string; count: number }[]
  feed: {
    id: string
    action: string
    cta_type: string | null
    page_url: string | null
    device: string | null
    referrer: string | null
    created_at: string
  }[]
}

const PERIODS: { key: Period; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: '7 Days' },
  { key: 'month', label: '30 Days' },
]

export default function WebsitesPage() {
  const [period, setPeriod] = useState<Period>('week')

  const websitesPrefs = useUserPrefs('websites', { default_period: 'week' })
  useEffect(() => {
    if (websitesPrefs.loaded) setPeriod(websitesPrefs.prefs.default_period as Period)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [websitesPrefs.loaded])
  const [data, setData] = useState<VisitsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/leads/visits?period=${period}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [period])

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d) => setTenantId(d.tenant?.id || null))
      .catch(() => {})
  }, [])

  // Built from the browser's own origin, not a hardcoded host — the dashboard
  // is served on the tenant's own live domain, so this is guaranteed to
  // resolve. (t.js's own header comment and fallback endpoint hardcode
  // app.fullloopcrm.com, which does not resolve at all — do not copy that.)
  const snippet = tenantId && typeof window !== 'undefined'
    ? `<script src="${window.location.origin}/t.js" data-tenant="${tenantId}"></script>`
    : null

  const copySnippet = () => {
    if (!snippet) return
    navigator.clipboard.writeText(snippet).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  const totalDevices = data ? Object.values(data.devices).reduce((s, n) => s + n, 0) : 0

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-slate-900">Websites</h1>
        <div className="flex gap-1 rounded-lg border border-slate-200 p-1">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                period === p.key ? 'bg-teal-600 text-white' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tracking code */}
      <div className="mb-6 rounded-lg border border-slate-200 p-4">
        <p className="mb-2 text-sm font-heading font-semibold text-slate-900">Tracking Code</p>
        <p className="mb-3 text-xs text-slate-500">
          Every page on your site is measured by this snippet. It records visits, devices, scroll depth, time on
          page, and call/text/book clicks — all scoped to your account only.
        </p>
        {snippet ? (
          <div className="flex items-center gap-2">
            <code className="flex-1 overflow-x-auto whitespace-nowrap rounded-md bg-slate-900 px-3 py-2 text-xs text-teal-300">
              {snippet}
            </code>
            <button
              onClick={copySnippet}
              className="shrink-0 rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        ) : (
          <p className="text-xs text-slate-400">Loading…</p>
        )}
      </div>

      {loading && <p className="py-8 text-center text-slate-400">Loading analytics…</p>}
      {!loading && !data && <p className="py-8 text-center text-slate-400">No analytics data yet.</p>}

      {!loading && data && (
        <>
          {/* Overview */}
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { label: 'Page Views', value: data.stats.pageViews, color: 'border-l-teal-500' },
              { label: 'Unique Visitors', value: data.stats.visitors, color: 'border-l-blue-500' },
              { label: 'Sessions', value: data.stats.sessions, color: 'border-l-indigo-500' },
              { label: 'CTA Clicks', value: data.stats.ctas, color: 'border-l-purple-500' },
              { label: 'Avg Time on Page', value: `${data.stats.avgTime}s`, color: 'border-l-teal-500' },
              { label: 'Avg Scroll Depth', value: `${data.stats.avgScroll}%`, color: 'border-l-blue-500' },
              { label: 'Bounce Rate', value: `${data.stats.bounceRate}%`, color: 'border-l-amber-500' },
              { label: 'CTA Conversion', value: `${data.stats.convRate}%`, color: 'border-l-green-500' },
            ].map((s) => (
              <div key={s.label} className={`border-l-4 ${s.color} py-2 pl-3`}>
                <p className="text-[10px] uppercase tracking-wide text-slate-500">{s.label}</p>
                <p className="font-mono text-xl font-bold text-slate-900">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* CTA breakdown */}
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="mb-3 text-xs uppercase tracking-wide text-slate-400">CTA Breakdown</p>
              {Object.keys(data.ctaBreakdown).length === 0 && <p className="text-sm text-slate-400">No CTA clicks yet.</p>}
              <div className="space-y-2">
                {Object.entries(data.ctaBreakdown)
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-sm capitalize text-slate-700">{type}</span>
                      <span className="font-mono text-sm font-medium text-slate-900">{count}</span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Device breakdown */}
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="mb-3 text-xs uppercase tracking-wide text-slate-400">Device Breakdown</p>
              <div className="space-y-2">
                {Object.entries(data.devices).map(([device, count]) => {
                  const pct = totalDevices > 0 ? Math.round((count / totalDevices) * 100) : 0
                  return (
                    <div key={device}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="capitalize text-slate-600">{device}</span>
                        <span className="text-slate-400">{pct}%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-teal-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Top domains — the SEO satellite network */}
          <div className="mb-6 rounded-lg border border-slate-200 p-4">
            <p className="mb-3 text-xs uppercase tracking-wide text-slate-400">Top Domains by Traffic</p>
            {data.topDomains.length === 0 ? (
              <p className="text-sm text-slate-400">No domain data yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="py-2 pr-3">Domain</th>
                      <th className="py-2 pr-3 text-right">Visits</th>
                      <th className="py-2 text-right">CTA Clicks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topDomains.map((d) => (
                      <tr key={d.domain} className="border-b border-slate-50">
                        <td className="py-2 pr-3 font-mono text-xs text-slate-700">{d.domain}</td>
                        <td className="py-2 pr-3 text-right font-mono font-medium text-slate-900">{d.visits}</td>
                        <td className="py-2 text-right font-mono text-slate-600">{d.ctas}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Top pages */}
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="mb-3 text-xs uppercase tracking-wide text-slate-400">Top Pages</p>
              {data.topPages.length === 0 && <p className="text-sm text-slate-400">No page views yet.</p>}
              <div className="space-y-2">
                {data.topPages.map((p) => (
                  <div key={p.page} className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm text-slate-700">{p.page}</span>
                    <span className="shrink-0 font-mono text-sm font-medium text-slate-900">{p.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Referrer sources */}
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="mb-3 text-xs uppercase tracking-wide text-slate-400">Traffic Sources</p>
              {data.sources.length === 0 && <p className="text-sm text-slate-400">No referrer data yet.</p>}
              <div className="space-y-2">
                {data.sources.map((s) => (
                  <div key={s.source} className="flex items-center justify-between">
                    <span className="text-sm text-slate-700">{s.source}</span>
                    <span className="font-mono text-sm font-medium text-slate-900">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent feed */}
          <div className="rounded-lg border border-slate-200 p-4">
            <p className="mb-3 text-xs uppercase tracking-wide text-slate-400">Recent Activity</p>
            {data.feed.length === 0 ? (
              <p className="text-sm text-slate-400">No visits recorded for this period.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="py-2 pr-3">Time</th>
                      <th className="py-2 pr-3">Action</th>
                      <th className="py-2 pr-3">Page</th>
                      <th className="py-2 pr-3">Device</th>
                      <th className="py-2">Referrer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.feed.map((v) => (
                      <tr key={v.id} className="border-b border-slate-50">
                        <td className="py-2 pr-3 text-slate-500">{new Date(v.created_at).toLocaleString()}</td>
                        <td className="py-2 pr-3 capitalize text-slate-700">{v.cta_type || v.action}</td>
                        <td className="max-w-[200px] truncate py-2 pr-3 text-slate-700">{v.page_url || '—'}</td>
                        <td className="py-2 pr-3 capitalize text-slate-500">{v.device || '—'}</td>
                        <td className="py-2 text-slate-500">{v.referrer || 'Direct'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
