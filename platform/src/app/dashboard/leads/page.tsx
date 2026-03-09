'use client'

import { useEffect, useState, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { usePageSettings, PageSettingsGear, PageSettingsPanel } from '@/components/page-settings'

type Stats = {
  pageViews: number
  sessions: number
  visitors: number
  ctas: number
  avgTime: number
  avgScroll: number
  bounceRate: number
  convRate: number
}

type FeedItem = {
  id: string
  action: string
  referrer: string | null
  device: string | null
  page_url: string | null
  cta_type: string | null
  session_id: string | null
  scroll_depth: number | null
  time_on_page: number | null
  utm_source: string | null
  created_at: string
}

type Source = { source: string; count: number }
type TopPage = { page: string; count: number }

export default function LeadsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [devices, setDevices] = useState<Record<string, number>>({})
  const [ctaBreakdown, setCtaBreakdown] = useState<Record<string, number>>({})
  const [sources, setSources] = useState<Source[]>([])
  const [topPages, setTopPages] = useState<TopPage[]>([])
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [period, setPeriod] = useState('week')
  const [dailyVisits, setDailyVisits] = useState<{ date: string; visits: number; ctas: number }[]>([])
  const [copied, setCopied] = useState(false)
  const [tenantId, setTenantId] = useState('')

  const leadsSettings = usePageSettings('leads')

  const fetchData = useCallback(() => {
    fetch(`/api/leads/visits?period=${period}`)
      .then((r) => r.json())
      .then((d) => {
        setStats(d.stats || null)
        setDevices(d.devices || {})
        setCtaBreakdown(d.ctaBreakdown || {})
        setSources(d.sources || [])
        setTopPages(d.topPages || [])
        setFeed(d.feed || [])

        // Compute daily visit counts from raw visits
        const dayMap: Record<string, { visits: number; ctas: number }> = {}
        for (const v of (d.feed || [])) {
          const day = new Date(v.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          if (!dayMap[day]) dayMap[day] = { visits: 0, ctas: 0 }
          dayMap[day].visits++
          if (v.cta_type) dayMap[day].ctas++
        }
        setDailyVisits(Object.entries(dayMap).map(([date, counts]) => ({ date, ...counts })))
      })
  }, [period])

  useEffect(() => { fetchData() }, [fetchData])

  // Get tenant ID for tracking code
  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d) => { if (d.tenant?.id) setTenantId(d.tenant.id) })
      .catch(() => {})
  }, [])

  const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://app.fullloopcrm.com'
  const trackingCode = `<script src="${appUrl}/t.js" data-tenant="${tenantId || 'YOUR_TENANT_ID'}"></script>`

  function copyCode() {
    navigator.clipboard.writeText(trackingCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const totalCTAs = stats?.ctas || 0

  const ctaLabels: Record<string, { label: string; color: string }> = {
    call: { label: 'Calls', color: 'bg-green-500' },
    text: { label: 'Texts', color: 'bg-teal-600' },
    book: { label: 'Bookings', color: 'bg-purple-500' },
    pay: { label: 'Payments', color: 'bg-yellow-500' },
    directions: { label: 'Directions', color: 'bg-orange-500' },
  }

  const sourceIcons: Record<string, string> = {
    Google: '🔍', Bing: '🔎', ChatGPT: '🤖', Facebook: '📘',
    Instagram: '📸', Yelp: '⭐', TikTok: '🎵', 'X/Twitter': '🐦',
    Nextdoor: '🏡', Direct: '🔗',
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-white">Leads & Analytics</h2>
          <PageSettingsGear open={leadsSettings.open} setOpen={leadsSettings.setOpen} title="Leads" />
        </div>
        <div className="flex gap-1 bg-slate-700 rounded-lg p-0.5">
          {(['today', 'week', 'month'] as const).map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                period === p ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}>
              {p === 'today' ? 'Today' : p === 'week' ? '7 Days' : '30 Days'}
            </button>
          ))}
        </div>
      </div>

      <PageSettingsPanel
        {...leadsSettings}
        title="Leads"
        tips={[
          'Track website visitors and see which domains drive the most business',
          'Monitor traffic sources: Google, Bing, ChatGPT, social media',
          'Set up tracking pixels on your business websites to capture visitor data',
          'Click any time slot on the Bookings calendar to instantly create a booking — no page switching needed',
        ]}
      >
        {({ config, updateConfig }) => (
          <div className="space-y-5">
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wide mb-2 block">Lead Scoring Threshold</label>
              <div className="grid grid-cols-3 gap-3 max-w-md">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Hot (min score)</label>
                  <input
                    type="number"
                    min="0"
                    value={(config.hot_threshold as number) ?? 80}
                    onChange={(e) => updateConfig('hot_threshold', parseInt(e.target.value) || 80)}
                    className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm w-full"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Warm (min score)</label>
                  <input
                    type="number"
                    min="0"
                    value={(config.warm_threshold as number) ?? 40}
                    onChange={(e) => updateConfig('warm_threshold', parseInt(e.target.value) || 40)}
                    className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm w-full"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Cold (below)</label>
                  <input
                    type="number"
                    min="0"
                    value={(config.warm_threshold as number) ?? 40}
                    disabled
                    className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm w-full opacity-50"
                  />
                </div>
              </div>
            </div>
            <div className="border-t border-slate-700" />
            <div className="flex items-center justify-between max-w-sm">
              <label className="text-sm text-slate-300">Auto-convert lead to client</label>
              <button
                onClick={() => updateConfig('auto_convert_lead', !config.auto_convert_lead)}
                className={`relative w-10 h-5 rounded-full transition-colors ${config.auto_convert_lead ? 'bg-teal-600' : 'bg-slate-600'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${config.auto_convert_lead ? 'translate-x-5' : ''}`} />
              </button>
            </div>
            <div className="border-t border-slate-700" />
            <div className="flex items-center justify-between max-w-sm">
              <label className="text-sm text-slate-300">Lead notification email</label>
              <button
                onClick={() => updateConfig('lead_notification_email', !config.lead_notification_email)}
                className={`relative w-10 h-5 rounded-full transition-colors ${config.lead_notification_email ? 'bg-teal-600' : 'bg-slate-600'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${config.lead_notification_email ? 'translate-x-5' : ''}`} />
              </button>
            </div>
          </div>
        )}
      </PageSettingsPanel>

      {/* TRACKING CODE — prominent at top */}
      <div className="bg-slate-800 text-white rounded-xl p-5 mb-6">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-sm">Website Tracking Code</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Add this to your website&apos;s {'<head>'} or before {'</body>'} to track visitors, CTAs, and conversions.
            </p>
          </div>
          <button onClick={copyCode}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              copied ? 'bg-green-600 text-white' : 'bg-white/10 text-white hover:bg-white/20'
            }`}>
            {copied ? 'Copied!' : 'Copy Code'}
          </button>
        </div>
        <div className="bg-black/40 rounded-lg p-3 font-mono text-xs text-green-400 overflow-x-auto">
          <code>{trackingCode}</code>
        </div>
        <div className="flex gap-4 mt-3 text-[11px] text-slate-400">
          <span>Tracks: page views, scroll depth, time on page, CTA clicks (calls, texts, bookings)</span>
          <span>&middot;</span>
          <span>No cookies, GDPR-friendly, &lt;2KB</span>
        </div>
      </div>

      {/* STATS GRID */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Page Views', value: stats.pageViews, sub: `${stats.sessions} sessions` },
            { label: 'Unique Visitors', value: stats.visitors, sub: `${stats.bounceRate}% bounce` },
            { label: 'CTA Clicks', value: stats.ctas, sub: `${stats.convRate}% conversion` },
            { label: 'Avg. Engagement', value: `${stats.avgTime}s`, sub: `${stats.avgScroll}% scroll` },
          ].map((s) => (
            <div key={s.label} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-[11px] text-slate-400 uppercase tracking-wide">{s.label}</p>
              <p className="text-2xl font-bold text-white mt-1">{s.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* TRAFFIC TREND CHART */}
      {dailyVisits.length > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 mb-6">
          <h3 className="text-sm font-semibold text-white mb-4">Visit Trend</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyVisits}>
                <XAxis dataKey="date" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', fontSize: '12px' }}
                  labelStyle={{ color: '#9ca3af' }}
                />
                <Line type="monotone" dataKey="visits" stroke="#3b82f6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="ctas" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 mt-2 text-xs text-slate-400">
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-teal-600 inline-block" /> Visits</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-green-500 inline-block" /> CTAs</span>
          </div>
        </div>
      )}

      {/* CTA BREAKDOWN */}
      {Object.keys(ctaBreakdown).length > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 mb-6">
          <h3 className="font-semibold text-white text-sm mb-4">CTA Breakdown</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Object.entries(ctaBreakdown).map(([type, count]) => {
              const info = ctaLabels[type] || { label: type, color: 'bg-slate-500' }
              const pct = totalCTAs > 0 ? Math.round((count / totalCTAs) * 100) : 0
              return (
                <div key={type} className="text-center">
                  <div className={`w-10 h-10 ${info.color} rounded-full flex items-center justify-center mx-auto mb-2`}>
                    <span className="text-white text-lg font-bold">{count}</span>
                  </div>
                  <p className="text-sm font-medium text-white">{info.label}</p>
                  <p className="text-xs text-slate-400">{pct}%</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* TRAFFIC SOURCES */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <h3 className="font-semibold text-white text-sm mb-4">Traffic Sources</h3>
          {sources.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">No traffic data yet</p>
          ) : (
            <div className="space-y-2.5">
              {sources.map((s) => {
                const total = sources.reduce((sum, x) => sum + x.count, 0)
                const pct = total > 0 ? (s.count / total * 100) : 0
                return (
                  <div key={s.source}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium text-slate-300">
                        {sourceIcons[s.source] || '🌐'} {s.source}
                      </span>
                      <span className="text-slate-400">{s.count} <span className="text-[10px]">({Math.round(pct)}%)</span></span>
                    </div>
                    <div className="h-1.5 bg-slate-700 rounded-full">
                      <div className="h-1.5 bg-teal-600 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* TOP PAGES */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <h3 className="font-semibold text-white text-sm mb-4">Top Pages</h3>
          {topPages.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">No page data yet</p>
          ) : (
            <div className="space-y-2">
              {topPages.map((p, i) => (
                <div key={p.page} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] text-slate-400 w-4 text-right">{i + 1}</span>
                    <span className="text-sm text-slate-300 truncate">{p.page}</span>
                  </div>
                  <span className="text-sm text-slate-400 font-medium ml-2">{p.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* DEVICE BREAKDOWN CHART */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <h3 className="font-semibold text-white text-sm mb-4">Device Breakdown</h3>
          {Object.keys(devices).length === 0 ? (
            <p className="text-sm text-slate-400">No data</p>
          ) : (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={Object.entries(devices).filter(([, c]) => c > 0).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }))} layout="vertical">
                  <XAxis type="number" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} width={80} />
                  <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', fontSize: '12px' }} />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* UTM CAMPAIGNS */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 lg:col-span-2">
          <h3 className="font-semibold text-white text-sm mb-4">Recent Activity</h3>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {feed.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">
                No visits recorded yet. Add the tracking code to your website to start collecting data.
              </p>
            ) : feed.map((v) => (
              <div key={v.id} className="flex items-center justify-between py-1.5 border-b border-slate-700/50 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  {v.cta_type ? (
                    <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs text-white ${
                      v.cta_type === 'call' ? 'bg-green-500' :
                      v.cta_type === 'text' ? 'bg-teal-600' :
                      v.cta_type === 'book' ? 'bg-purple-500' : 'bg-slate-500'
                    }`}>
                      {v.cta_type === 'call' ? '📞' : v.cta_type === 'text' ? '💬' : v.cta_type === 'book' ? '📅' : '🔗'}
                    </span>
                  ) : (
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs">
                      {v.device === 'mobile' ? '📱' : '💻'}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="text-slate-300 truncate">
                      {v.cta_type ? (
                        <span className="font-medium capitalize">{v.cta_type}</span>
                      ) : (
                        <span>{v.page_url || '/'}</span>
                      )}
                      {v.cta_type && v.page_url && <span className="text-slate-400"> on {v.page_url}</span>}
                    </p>
                    <p className="text-xs text-slate-400">
                      {v.referrer || 'Direct'}
                      {v.utm_source && ` · utm: ${v.utm_source}`}
                      {v.time_on_page ? ` · ${v.time_on_page}s` : ''}
                      {v.scroll_depth ? ` · ${v.scroll_depth}% scroll` : ''}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-slate-400 flex-shrink-0 ml-2">
                  {new Date(v.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
