// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'


type TimePeriod = 'today' | '7d' | '30d' | 'all'

interface OverviewData {
  todayVisitors: number
  weekVisitors: number
  monthVisitors: number
  uniqueVisitors: number
  avgTime: number
  avgScroll: number
  bounceRate: number
  ctaRate: number
}

interface TrafficSource {
  source: string
  visits: number
  percent: number
}

interface TopPage {
  page: string
  visits: number
  avgTime: number
  avgScroll: number
}

interface DeviceBreakdown {
  mobile: number
  desktop: number
  tablet: number
}

interface PageFlow {
  from: string
  to: string
  count: number
}

interface JourneyData {
  avgPagesPerSession: number
  topFlows: PageFlow[]
}

interface HourlyTraffic {
  hour: number
  visits: number
}

interface RecentVisitor {
  time: string
  page: string
  referrer: string
  device: string
  time_on_page: number
  scroll_depth: number
}

interface FormFunnel {
  page: string
  label: string
  starts: number
  successes: number
  abandons: number
  rate: number
  steps?: { step: number; count: number }[]
}

interface AnalyticsData {
  overview: OverviewData
  trafficSources: TrafficSource[]
  topPages: TopPage[]
  devices: DeviceBreakdown
  journey: JourneyData
  hourlyTraffic: HourlyTraffic[]
  recentVisitors: RecentVisitor[]
  formFunnels: FormFunnel[]
}

export default function AnalyticsPage() {
  useEffect(() => { document.title = 'Analytics | The NYC Maid' }, [])

  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<TimePeriod>('7d')

  useEffect(() => {
    fetchData()
  }, [period])

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/analytics?period=${period}`)
      if (!res.ok) {
        throw new Error(`Failed to fetch analytics (${res.status})`)
      }
      const json = await res.json()
      setData(json)
    } catch (err) {
      console.error('Failed to fetch analytics:', err)
      setError(err instanceof Error ? err.message : 'Failed to load analytics data')
    }
    setLoading(false)
  }

  const formatTime = (seconds: number) => {
    if (!seconds || seconds === 0) return '-'
    if (seconds < 60) return `${Math.round(seconds)}s`
    const mins = Math.floor(seconds / 60)
    const secs = Math.round(seconds % 60)
    return `${mins}m ${secs}s`
  }

  const timeAgo = (dateStr: string) => {
    const then = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z')
    const estTime = then.toLocaleString('en-US', {
      timeZone: 'America/New_York',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
    const now = new Date()
    const diff = Math.floor((now.getTime() - then.getTime()) / 1000)
    if (diff < 0) return estTime
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return estTime.split(', ').pop() || estTime
    return estTime
  }

  const formatHour = (hour: number) => {
    if (hour === 0) return '12 AM'
    if (hour < 12) return `${hour} AM`
    if (hour === 12) return '12 PM'
    return `${hour - 12} PM`
  }

  const getSourceIcon = (source: string) => {
    const s = source.toLowerCase()
    if (s.includes('google')) return '🔍'
    if (s.includes('bing')) return '🔎'
    if (s.includes('duckduckgo') || s.includes('ddg')) return '🦆'
    if (s.includes('yahoo')) return '📧'
    if (s.includes('chatgpt') || s.includes('openai')) return '🤖'
    if (s.includes('claude') || s.includes('anthropic')) return '🧠'
    if (s === 'direct') return '🔗'
    if (s.includes('facebook') || s.includes('fb')) return '👤'
    if (s.includes('instagram')) return '📷'
    if (s.includes('twitter') || s.includes('x.com')) return '🐦'
    if (s.includes('yelp')) return '⭐'
    return '🌐'
  }

  const getDeviceIcon = (device: string) => {
    const d = device.toLowerCase()
    if (d.includes('mobile') || d.includes('phone') || d.includes('iphone') || d.includes('android')) return '📱'
    if (d.includes('tablet') || d.includes('ipad')) return '📋'
    return '💻'
  }

  const maxHourlyVisits = data?.hourlyTraffic
    ? Math.max(...data.hourlyTraffic.map(h => h.visits), 1)
    : 1

  return (
      <main className="p-3 md:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-8">
          <div>
            <h2 className="text-xl font-bold text-[#1E2A4A] tracking-tight">Site Analytics</h2>
            <p className="text-gray-400 text-xs mt-0.5">thenycmaid.com visitor behavior</p>
          </div>
          <div className="flex gap-2 items-center">
            <div className="flex gap-1 bg-gray-100/80 rounded-lg p-0.5">
              {([
                { key: 'today', label: 'Today' },
                { key: '7d', label: '7 Days' },
                { key: '30d', label: '30 Days' },
                { key: 'all', label: 'All Time' },
              ] as { key: TimePeriod; label: string }[]).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setPeriod(key)}
                  className={`px-3 py-2.5 rounded-md text-xs font-medium transition-all ${
                    period === key
                      ? 'bg-[#1E2A4A] text-white shadow-sm'
                      : 'text-gray-500 hover:text-[#1E2A4A]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              onClick={fetchData}
              className="px-3 py-2.5 bg-[#1E2A4A] text-white rounded-lg hover:bg-[#1E2A4A]/90 text-xs font-medium transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12 text-gray-500">Loading analytics...</div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="text-center py-12">
            <p className="text-red-500 mb-4">{error}</p>
            <button
              onClick={fetchData}
              className="px-4 py-2 bg-[#1E2A4A] text-white rounded-lg hover:bg-[#1E2A4A]/90 text-sm"
            >
              Retry
            </button>
          </div>
        )}

        {/* Data Display */}
        {data && !loading && !error && (
          <>
            {/* ========== OVERVIEW CARDS ========== */}
            <div className="mb-2">
              <h3 className="text-xs font-bold tracking-widest text-[#1E2A4A]/60 uppercase mb-4">Overview</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              <div className="bg-teal-50 rounded-xl p-4 border border-teal-100/60">
                <p className="text-xs font-semibold text-teal-600 uppercase tracking-wide">Visitors</p>
                <p className="text-2xl font-bold text-[#1E2A4A] mt-1">
                  {period === 'today' ? data.overview.todayVisitors.toLocaleString()
                    : period === '7d' ? data.overview.weekVisitors.toLocaleString()
                    : period === '30d' ? data.overview.monthVisitors.toLocaleString()
                    : data.overview.monthVisitors.toLocaleString()}
                </p>
                <div className="text-xs text-teal-500/70 mt-1.5 space-x-1">
                  <span>Today: {data.overview.todayVisitors}</span>
                  <span>|</span>
                  <span>7d: {data.overview.weekVisitors}</span>
                  <span>|</span>
                  <span>30d: {data.overview.monthVisitors}</span>
                </div>
              </div>

              <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100/60">
                <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">Unique Sessions</p>
                <p className="text-2xl font-bold text-[#1E2A4A] mt-1">{data.overview.uniqueVisitors.toLocaleString()}</p>
                <p className="text-xs text-indigo-400 mt-1.5">distinct sessions</p>
              </div>

              <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100/60">
                <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">Avg Time</p>
                <p className="text-2xl font-bold text-[#1E2A4A] mt-1">{formatTime(data.overview.avgTime)}</p>
                <p className="text-xs text-indigo-400 mt-1.5">{Math.round(data.overview.avgTime)}s average</p>
              </div>

              <div className="bg-teal-50 rounded-xl p-4 border border-teal-100/60">
                <p className="text-xs font-semibold text-teal-600 uppercase tracking-wide">Avg Scroll</p>
                <p className="text-2xl font-bold text-[#1E2A4A] mt-1">{Math.round(data.overview.avgScroll)}%</p>
                <p className="text-xs text-teal-400 mt-1.5">of page viewed</p>
              </div>

              <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100/60">
                <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Bounce Rate</p>
                <p className="text-2xl font-bold text-[#1E2A4A] mt-1">{Math.round(data.overview.bounceRate)}%</p>
                <p className="text-xs text-emerald-400 mt-1.5">single-page sessions</p>
              </div>

              <div className="bg-[#A8F0DC]/20 rounded-xl p-4 border border-[#A8F0DC]/30">
                <p className="text-xs font-semibold text-[#1E2A4A]/70 uppercase tracking-wide">CTA Conversion</p>
                <p className="text-2xl font-bold text-[#1E2A4A] mt-1">{data.overview.ctaRate.toFixed(1)}%</p>
                <p className="text-xs text-[#1E2A4A]/40 mt-1.5">visitors who clicked CTA</p>
              </div>
            </div>

            {/* ========== FORM FUNNELS ========== */}
            {data.formFunnels && (
              <div className="mb-8">
                <div className="mb-4">
                  <h3 className="text-xs font-bold tracking-widest text-[#1E2A4A]/60 uppercase">Conversion Funnels</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {data.formFunnels.map(funnel => {
                    const total = funnel.starts || 1
                    const rateColor = funnel.rate >= 50 ? 'text-emerald-500' : funnel.rate >= 25 ? 'text-amber-500' : funnel.rate > 0 ? 'text-orange-500' : 'text-gray-400'
                    const ringColor = funnel.rate >= 50 ? '#10b981' : funnel.rate >= 25 ? '#f59e0b' : funnel.rate > 0 ? '#f97316' : '#d1d5db'
                    const circumference = 2 * Math.PI * 40
                    const strokeDash = (funnel.rate / 100) * circumference
                    return (
                      <div key={funnel.page} className="bg-white border border-gray-200/80 rounded-xl shadow-sm overflow-hidden">
                        {/* Header */}
                        <div className="px-5 py-3.5 border-b border-gray-100 bg-gradient-to-r from-gray-50/80 to-transparent">
                          <h4 className="text-sm font-bold text-[#1E2A4A] tracking-tight">{funnel.label}</h4>
                        </div>

                        <div className="p-5">
                          {/* Ring + Stats row */}
                          <div className="flex items-center gap-5">
                            {/* SVG Ring */}
                            <div className="relative flex-shrink-0" style={{ width: 96, height: 96 }}>
                              <svg width="96" height="96" viewBox="0 0 96 96" className="transform -rotate-90">
                                <circle cx="48" cy="48" r="40" fill="none" stroke="#f3f4f6" strokeWidth="7" />
                                <circle
                                  cx="48" cy="48" r="40" fill="none"
                                  stroke={ringColor}
                                  strokeWidth="7"
                                  strokeLinecap="round"
                                  strokeDasharray={`${strokeDash} ${circumference}`}
                                  className="transition-all duration-700"
                                />
                              </svg>
                              <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className={`text-2xl font-black ${rateColor}`}>{funnel.rate}%</span>
                              </div>
                            </div>

                            {/* Stat pills */}
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center justify-between bg-[#1E2A4A]/5 rounded-lg px-3 py-2">
                                <span className="text-xs font-medium text-[#1E2A4A]/60 uppercase tracking-wide">Started</span>
                                <span className="text-lg font-bold text-[#1E2A4A]">{funnel.starts}</span>
                              </div>
                              <div className="flex items-center justify-between bg-emerald-50 rounded-lg px-3 py-2">
                                <span className="text-xs font-medium text-emerald-600 uppercase tracking-wide">Completed</span>
                                <span className="text-lg font-bold text-emerald-600">{funnel.successes}</span>
                              </div>
                              <div className="flex items-center justify-between bg-red-50 rounded-lg px-3 py-2">
                                <span className="text-xs font-medium text-red-400 uppercase tracking-wide">Abandoned</span>
                                <span className="text-lg font-bold text-red-400">{funnel.abandons}</span>
                              </div>
                            </div>
                          </div>

                          {/* Segmented bar */}
                          <div className="mt-5">
                            <div className="flex h-3 rounded-full overflow-hidden bg-gray-100">
                              {funnel.successes > 0 && (
                                <div className="bg-emerald-400 transition-all duration-500" style={{ width: `${(funnel.successes / total) * 100}%` }} />
                              )}
                              {funnel.abandons > 0 && (
                                <div className="bg-red-300 transition-all duration-500" style={{ width: `${(funnel.abandons / total) * 100}%` }} />
                              )}
                            </div>
                            <div className="flex justify-between mt-1.5">
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                <span className="text-xs text-gray-500">Completed</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-red-300" />
                                <span className="text-xs text-gray-500">Abandoned</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-gray-200" />
                                <span className="text-xs text-gray-500">In Progress</span>
                              </div>
                            </div>
                          </div>

                          {/* Step breakdown funnel */}
                          {funnel.steps && funnel.steps.length > 0 && (
                            <div className="mt-5 pt-4 border-t border-gray-100">
                              <p className="text-xs font-bold text-[#1E2A4A]/50 uppercase tracking-widest mb-3">Step Breakdown</p>
                              <div className="space-y-1.5">
                                {funnel.steps.map((s, i) => {
                                  const stepLabels: Record<number, string> = { 1: 'Info', 2: 'Details', 3: 'Date/Time', 4: 'Submitted' }
                                  const pct = total > 0 ? Math.round((s.count / total) * 100) : 0
                                  const barColors = ['bg-[#1E2A4A]', 'bg-[#1E2A4A]/75', 'bg-[#1E2A4A]/50', 'bg-emerald-500']
                                  return (
                                    <div key={s.step}>
                                      <div className="flex items-center justify-between mb-0.5">
                                        <span className="text-xs font-medium text-[#1E2A4A]/70">{stepLabels[s.step] || `Step ${s.step}`}</span>
                                        <span className="text-xs font-bold text-[#1E2A4A]/60">{s.count} <span className="font-normal text-gray-400">({pct}%)</span></span>
                                      </div>
                                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full transition-all duration-500 ${barColors[i] || 'bg-[#1E2A4A]/40'}`} style={{ width: `${pct}%` }} />
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ========== TRAFFIC SOURCES + TOP PAGES (2-col) ========== */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white border border-gray-200/80 rounded-xl shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-xs font-bold tracking-widest text-[#1E2A4A]/60 uppercase">Top Domains by Traffic</h3>
              </div>
              {data.trafficSources.length === 0 ? (
                <div className="p-6 text-center text-gray-500 text-sm">No traffic source data available</div>
              ) : (
                <div className="overflow-x-auto">
                  <div className="divide-y divide-gray-50">
                    {data.trafficSources.map((source) => (
                      <div key={source.source} className="px-4 py-3 hover:bg-gray-50/50 transition-colors">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm">
                            <span className="mr-1.5">{getSourceIcon(source.source)}</span>
                            <span className="text-[#1E2A4A] font-medium">{source.source}</span>
                          </span>
                          <span className="text-sm font-semibold text-[#1E2A4A]">{source.visits}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#1E2A4A]/70 rounded-full transition-all"
                              style={{ width: `${Math.min(source.percent, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-400 w-8 text-right">{source.percent}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Top Entry Pages - right column */}
            <div className="bg-white border border-gray-200/80 rounded-xl shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-xs font-bold tracking-widest text-[#1E2A4A]/60 uppercase">Top Entry Pages</h3>
              </div>
              {data.topPages.length === 0 ? (
                <div className="p-6 text-center text-gray-500 text-sm">No page data available</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50/80 border-b border-gray-100 text-left text-xs font-bold tracking-wider uppercase text-[#1E2A4A]/50">
                      <tr>
                        <th className="px-4 py-2.5">Page Path</th>
                        <th className="px-4 py-2.5 text-right">Visits</th>
                        <th className="px-4 py-2.5 text-right">Avg Time</th>
                        <th className="px-4 py-2.5 text-right">Scroll</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {data.topPages.map((page, i) => (
                        <tr key={page.page} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-2.5 text-sm">
                            <span className="text-[#1E2A4A] font-medium font-mono text-xs">{page.page}</span>
                          </td>
                          <td className="px-4 py-2.5 text-sm text-right font-semibold text-[#1E2A4A]">{page.visits}</td>
                          <td className="px-4 py-2.5 text-xs text-right text-gray-500">{formatTime(page.avgTime)}</td>
                          <td className="px-4 py-2.5 text-xs text-right text-gray-500">{Math.round(page.avgScroll)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            </div>{/* end 2-col grid */}

            {/* ========== DEVICE BREAKDOWN + USER JOURNEY ========== */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Device Breakdown */}
              <div className="bg-white border border-gray-200/80 rounded-xl shadow-sm">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="text-xs font-bold tracking-widest text-[#1E2A4A]/60 uppercase">Device Breakdown</h3>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-teal-50 rounded-xl p-3">
                      <p className="text-2xl mb-0.5">📱</p>
                      <p className="text-xl font-bold text-[#1E2A4A]">{Math.round(data.devices.mobile)}%</p>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Mobile</p>
                    </div>
                    <div className="bg-indigo-50 rounded-xl p-3">
                      <p className="text-2xl mb-0.5">💻</p>
                      <p className="text-xl font-bold text-[#1E2A4A]">{Math.round(data.devices.desktop)}%</p>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Desktop</p>
                    </div>
                    <div className="bg-amber-50 rounded-xl p-3">
                      <p className="text-2xl mb-0.5">📋</p>
                      <p className="text-xl font-bold text-[#1E2A4A]">{Math.round(data.devices.tablet)}%</p>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Tablet</p>
                    </div>
                  </div>
                  {/* Device bar */}
                  <div className="mt-4 flex h-3 rounded-full overflow-hidden">
                    <div className="bg-[#A8F0DC] transition-all" style={{ width: `${data.devices.mobile}%` }} title={`Mobile: ${data.devices.mobile}%`} />
                    <div className="bg-[#1E2A4A]/60 transition-all" style={{ width: `${data.devices.desktop}%` }} title={`Desktop: ${data.devices.desktop}%`} />
                    <div className="bg-amber-300 transition-all" style={{ width: `${data.devices.tablet}%` }} title={`Tablet: ${data.devices.tablet}%`} />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mt-1.5 uppercase tracking-wider">
                    <span>Mobile</span>
                    <span>Desktop</span>
                    <span>Tablet</span>
                  </div>
                </div>
              </div>

              {/* User Journey */}
              <div className="bg-white border border-gray-200/80 rounded-xl shadow-sm">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="text-xs font-bold tracking-widest text-[#1E2A4A]/60 uppercase">User Journey</h3>
                </div>
                <div className="p-5">
                  <div className="bg-teal-50 rounded-xl p-4 mb-4 border border-teal-100/60">
                    <p className="text-xs text-teal-600 uppercase tracking-wider font-semibold">Avg Pages per Session</p>
                    <p className="text-3xl font-bold text-[#1E2A4A] mt-1">{data.journey.avgPagesPerSession.toFixed(1)}</p>
                  </div>
                  <h4 className="text-xs font-bold text-[#1E2A4A]/50 uppercase tracking-wider mb-3">Top Page Flows</h4>
                  {data.journey.topFlows.length === 0 ? (
                    <p className="text-sm text-gray-400">No multi-page sessions recorded yet</p>
                  ) : (
                    <div className="space-y-1.5">
                      {data.journey.topFlows.map((flow, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm bg-gray-50/80 rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors">
                          <span className="text-gray-300 text-xs w-4 text-right flex-shrink-0">{i + 1}.</span>
                          <span className="text-[#1E2A4A] font-mono text-xs truncate">{flow.from}</span>
                          <span className="text-[#A8F0DC] flex-shrink-0 font-bold">→</span>
                          <span className="text-[#1E2A4A] font-mono text-xs truncate">{flow.to}</span>
                          <span className="ml-auto font-semibold text-[#1E2A4A]/60 text-xs flex-shrink-0">{flow.count}x</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ========== HOURLY TRAFFIC ========== */}
            <div className="bg-white border border-gray-200/80 rounded-xl shadow-sm mb-8 min-h-0 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-xs font-bold tracking-widest text-[#1E2A4A]/60 uppercase">Hourly Traffic (Today)</h3>
              </div>
              <div className="p-4 min-h-0 overflow-hidden">
                {data.hourlyTraffic.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No hourly data available</p>
                ) : (
                  <div className="space-y-0.5">
                    {data.hourlyTraffic.map((h) => {
                      const barWidth = maxHourlyVisits > 0
                        ? Math.max((h.visits / maxHourlyVisits) * 100, 0)
                        : 0
                      const now = new Date()
                      const currentHour = now.getHours()
                      const isCurrentHour = h.hour === currentHour

                      return (
                        <div key={h.hour} className={`flex items-center gap-3 py-0.5 px-2 rounded-lg transition-colors ${isCurrentHour ? 'bg-[#A8F0DC]/15' : 'hover:bg-gray-50/50'}`}>
                          <span className={`text-xs w-12 text-right flex-shrink-0 font-mono ${isCurrentHour ? 'font-bold text-[#1E2A4A]' : 'text-gray-400'}`}>
                            {formatHour(h.hour)}
                          </span>
                          <div className="flex-1 h-4 bg-gray-50 rounded overflow-hidden">
                            {h.visits > 0 && (
                              <div
                                className={`h-full rounded transition-all ${isCurrentHour ? 'bg-[#A8F0DC]' : 'bg-[#1E2A4A]/40'}`}
                                style={{ width: `${barWidth}%` }}
                              />
                            )}
                          </div>
                          <span className={`text-xs w-6 text-right flex-shrink-0 ${isCurrentHour ? 'font-bold text-[#1E2A4A]' : h.visits > 0 ? 'text-gray-500' : 'text-gray-300'}`}>
                            {h.visits}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* ========== RECENT VISITORS ========== */}
            <div className="bg-white border border-gray-200/80 rounded-xl shadow-sm mb-8">
              <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-xs font-bold tracking-widest text-[#1E2A4A]/60 uppercase">Recent Visitors</h3>
                <span className="text-xs text-gray-400 uppercase tracking-wider">Last 50 visits</span>
              </div>
              {data.recentVisitors.length === 0 ? (
                <div className="p-6 text-center text-gray-500 text-sm">No recent visitor data available</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[800px]">
                    <thead className="bg-gray-50/80 border-b border-gray-100 text-left text-xs font-bold tracking-wider uppercase text-[#1E2A4A]/50">
                      <tr>
                        <th className="px-4 py-2.5">Time</th>
                        <th className="px-4 py-2.5">Page</th>
                        <th className="px-4 py-2.5">Referrer</th>
                        <th className="px-4 py-2.5">Device</th>
                        <th className="px-4 py-2.5 text-right">Time on Page</th>
                        <th className="px-4 py-2.5 text-right">Scroll Depth</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {data.recentVisitors.map((visitor, i) => (
                        <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                            {timeAgo(visitor.time)}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className="text-[#1E2A4A] font-mono text-xs">{visitor.page}</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 max-w-[200px] truncate" title={visitor.referrer || 'direct'}>
                            {visitor.referrer ? (
                              <span className="flex items-center gap-1">
                                <span>{getSourceIcon(visitor.referrer)}</span>
                                <span>{visitor.referrer}</span>
                              </span>
                            ) : (
                              <span className="text-gray-400">direct</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <span>{getDeviceIcon(visitor.device)}</span>
                              <span>{visitor.device}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-600">{formatTime(visitor.time_on_page)}</td>
                          <td className="px-4 py-3 text-sm text-right">
                            <span className={
                              visitor.scroll_depth >= 75 ? 'text-green-600 font-medium' :
                              visitor.scroll_depth >= 50 ? 'text-yellow-600' :
                              visitor.scroll_depth >= 25 ? 'text-orange-600' :
                              'text-gray-400'
                            }>
                              {Math.round(visitor.scroll_depth)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>
  )
}
