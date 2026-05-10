// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'

interface FeedEvent {
  id: string
  domain: string
  device: string
  referrer: string | null
  final_scroll: number
  final_time: number
  active_time: number
  engaged_30s: boolean
  load_time_ms: number
  cta_clicked: boolean
  cta_actions: string[]
  manual_conversion: boolean
  manual_sale: boolean
  auto_sale: boolean
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  created_at: string
  visits: number
  calls: number
  texts: number
  books: number
  mobile: number
  desktop: number
}

interface CtaDetail {
  session_id: string
  action: string
  domain: string
  referrer: string | null
  device: string
  created_at: string
}

interface BookingDetail {
  id: string
  domain: string
  referrer: string
  device: string
  session_id: string
  created_at: string
}

interface SaleDetail {
  client_id: string
  name: string
  email: string
  phone: string
  service: string
  price: number
  date: string
}

type DrilldownType =
  | 'today' | 'week' | 'month' | 'year' | 'all'
  | 'texts' | 'calls' | 'bookings'
  | 'totalCtas' | 'conversionPct'
  | 'newSales' | 'closePct'

type Period = 'today' | 'week' | 'month' | 'year' | 'all'

const DASH_DEFAULT = {
  today: 0, thisWeek: 0, thisMonth: 0, thisYear: 0, allTime: 0,
  yesterday: 0, lastWeek: 0, lastMonth: 0, lastYear: 0,
  conversionPct: 0, totalTexts: 0, totalCalls: 0, totalBooks: 0, totalCtas: 0,
  totalSales: 0, closePct: 0,
}

export default function LeadsPage() {
  const [domains, setDomains] = useState<any[]>([])
  const [totalVisitors, setTotalVisitors] = useState(0)
  const [liveFeed, setLiveFeed] = useState<FeedEvent[]>([])
  const [blocked, setBlocked] = useState<string[]>([])
  const [dashboard, setDashboard] = useState(DASH_DEFAULT)
  const [ctaDetails, setCtaDetails] = useState<CtaDetail[]>([])
  const [bookingDetails, setBookingDetails] = useState<BookingDetail[]>([])
  const [salesDetails, setSalesDetails] = useState<SaleDetail[]>([])
  const [drilldown, setDrilldown] = useState<DrilldownType | null>(null)
  const [period, setPeriod] = useState<Period>('all')
  const [loading, setLoading] = useState(true)
  const [blocking, setBlocking] = useState<string | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)

  const [error, setError] = useState<string | null>(null)

  const fetchData = () => {
    setLoading(true)
    setError(null)
    fetch('/api/leads')
      .then(r => {
        if (!r.ok) throw new Error(`Failed to load (${r.status})`)
        return r.json()
      })
      .then(d => {
        setDomains(d.domains || [])
        setTotalVisitors(d.totalVisitors || 0)
        setLiveFeed(d.liveFeed || [])
        setBlocked(d.blocked || [])
        setDashboard(d.dashboard || DASH_DEFAULT)
        setCtaDetails(d.ctaDetails || [])
        setBookingDetails(d.bookingDetails || [])
        setSalesDetails(d.salesDetails || [])
      })
      .catch(e => setError(e.message || 'Failed to load leads'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  const blockDomain = async (referrer: string) => {
    let host = referrer
    try { host = new URL(referrer).hostname.replace(/^www\./, '') } catch {}
    setBlocking(host)
    await fetch('/api/leads/block', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain: host }),
    })
    fetchData()
    setBlocking(null)
  }

  const unblockDomain = async (domain: string) => {
    setBlocking(domain)
    await fetch('/api/leads/block', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain }),
    })
    fetchData()
    setBlocking(null)
  }

  const toggleOverride = async (id: string, type: 'conversion' | 'sale') => {
    setToggling(id + type)
    await fetch('/api/leads/override', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, type }),
    })
    fetchData()
    setToggling(null)
  }

  // Period filtering — shared by Row 2 stats + drilldowns
  const getPeriodStart = (p: Period) => {
    const now = new Date()
    switch (p) {
      case 'today': return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
      case 'week': return new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).getTime()
      case 'month': return new Date(now.getFullYear(), now.getMonth(), 1).getTime()
      case 'year': return new Date(now.getFullYear(), 0, 1).getTime()
      default: return 0
    }
  }
  const periodStart = getPeriodStart(period)
  const inPeriod = (dateStr: string) => period === 'all' || new Date(dateStr).getTime() >= periodStart
  const periodLabel = { today: 'Today', week: 'This Week', month: 'This Month', year: 'This Year', all: 'All Time' }[period]

  // Drill-down data resolver
  const getDrilldownData = (): { label: string; kind: 'visitors' | 'cta' | 'sales'; data: any[] } | null => {
    if (!drilldown) return null

    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).getTime()
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
        return { label: `Texts — ${periodLabel}`, kind: 'cta', data: ctaDetails.filter(c => c.action === 'text' && inPeriod(c.created_at)) }
      case 'calls':
        return { label: `Calls — ${periodLabel}`, kind: 'cta', data: ctaDetails.filter(c => c.action === 'call' && inPeriod(c.created_at)) }
      case 'bookings':
        return { label: `Bookings — ${periodLabel}`, kind: 'cta', data: bookingDetails.filter(b => inPeriod(b.created_at)) }
      case 'totalCtas':
        return { label: `Total CTAs — ${periodLabel}`, kind: 'cta', data: [...ctaDetails.filter(c => inPeriod(c.created_at)), ...bookingDetails.filter(b => inPeriod(b.created_at)).map(b => ({ ...b, action: 'book' as const, session_id: b.session_id, referrer: b.referrer }))] }
      case 'conversionPct':
        return { label: `Conversion % — ${periodLabel}`, kind: 'cta', data: [...ctaDetails.filter(c => inPeriod(c.created_at)), ...bookingDetails.filter(b => inPeriod(b.created_at)).map(b => ({ ...b, action: 'book' as const, session_id: b.session_id, referrer: b.referrer }))] }
      case 'newSales':
        return { label: `New Sales — ${periodLabel}`, kind: 'sales', data: salesDetails.filter(s => inPeriod(s.date)) }
      case 'closePct':
        return { label: `Close % — ${periodLabel}`, kind: 'sales', data: salesDetails.filter(s => inPeriod(s.date)) }
      default:
        return null
    }
  }

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>
  if (error) return <div className="text-center py-12 text-red-500">{error} <button onClick={fetchData} className="underline ml-2">Retry</button></div>

  const v = (n: number) => n > 0 ? n : '—'
  const drill = getDrilldownData()

  const pVisitors = period === 'all' ? liveFeed.length : liveFeed.filter(e => inPeriod(e.created_at)).length
  const pCalls = ctaDetails.filter(c => c.action === 'call' && inPeriod(c.created_at)).length
  const pTexts = ctaDetails.filter(c => c.action === 'text' && inPeriod(c.created_at)).length
  const pBooks = bookingDetails.filter(b => inPeriod(b.created_at)).length
  const pManualConv = liveFeed.filter(e => e.manual_conversion && e.cta_actions.length === 0 && inPeriod(e.created_at)).length
  const pTotalCtas = pCalls + pTexts + pBooks + pManualConv
  const pConvPct = pVisitors > 0 ? parseFloat(((pTotalCtas / pVisitors) * 100).toFixed(1)) : 0
  const pSales = salesDetails.filter(s => inPeriod(s.date)).length
  const pClosePct = pTotalCtas > 0 ? parseFloat(((pSales / pTotalCtas) * 100).toFixed(1)) : 0

  const row1Cards: { label: string; value: number; prev: number; prevLabel: string; type: DrilldownType; period: Period }[] = [
    { label: 'Today', value: dashboard.today, prev: dashboard.yesterday, prevLabel: 'yesterday', type: 'today', period: 'today' },
    { label: 'This Week', value: dashboard.thisWeek, prev: dashboard.lastWeek, prevLabel: 'last week', type: 'week', period: 'week' },
    { label: 'This Month', value: dashboard.thisMonth, prev: dashboard.lastMonth, prevLabel: 'last month', type: 'month', period: 'month' },
    { label: 'This Year', value: dashboard.thisYear, prev: dashboard.lastYear, prevLabel: 'last year', type: 'year', period: 'year' },
    { label: 'All Time', value: dashboard.allTime, prev: 0, prevLabel: '', type: 'all', period: 'all' },
  ]

  const row2Cards: { label: string; value: string | number; type: DrilldownType }[] = [
    { label: 'Conversion %', value: `${pConvPct}%`, type: 'conversionPct' },
    { label: 'Texts', value: pTexts, type: 'texts' },
    { label: 'Calls', value: pCalls, type: 'calls' },
    { label: 'Total CTAs', value: pTotalCtas, type: 'totalCtas' },
    { label: 'New Sales', value: pSales, type: 'newSales' },
    { label: 'Close %', value: `${pClosePct}%`, type: 'closePct' },
  ]

  return (
    <main className="p-3 md:p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#1E2A4A] tracking-tight">Dashboard</h2>
        <p className="text-gray-400 text-xs mt-0.5">{domains.length} domains tracked</p>
      </div>

      {/* Row 1 — Visitors (click to filter Row 2 by period) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {row1Cards.map(s => {
          const diff = s.prev > 0 ? s.value - s.prev : 0
          const pctChange = s.prev > 0 ? Math.round((diff / s.prev) * 100) : 0
          return (
            <button
              key={s.label}
              onClick={() => { setPeriod(s.period); setDrilldown(s.type) }}
              className={`bg-white border rounded-xl shadow-sm px-5 py-4 text-center transition-all hover:shadow-md cursor-pointer ${period === s.period ? 'border-[#A8F0DC] ring-1 ring-[#A8F0DC]' : 'border-gray-200/80 hover:border-[#A8F0DC]'}`}
            >
              <p className="text-2xl font-bold text-[#1E2A4A]">{s.value.toLocaleString()}</p>
              <p className="text-[10px] font-bold tracking-widest text-[#1E2A4A]/50 uppercase mt-1">{s.label}</p>
              {s.prev > 0 && (
                <p className={`text-[10px] mt-1.5 font-medium ${diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                  {diff > 0 ? '↑' : diff < 0 ? '↓' : '→'} {Math.abs(pctChange)}% vs {s.prevLabel} ({s.prev})
                </p>
              )}
            </button>
          )
        })}
      </div>

      {/* Row 2 — Conversions (filtered by selected period) */}
      <div>
        {period !== 'all' && <p className="text-[10px] font-bold tracking-widest text-[#A8F0DC] uppercase mb-2">Showing: {periodLabel}</p>}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {row2Cards.map(s => (
          <button
            key={s.label}
            onClick={() => setDrilldown(s.type)}
            className="bg-white border border-gray-200/80 rounded-xl shadow-sm px-5 py-4 text-center transition-all hover:border-[#A8F0DC] hover:shadow-md cursor-pointer"
          >
            <p className="text-2xl font-bold text-[#1E2A4A]">{typeof s.value === 'number' ? s.value.toLocaleString() : s.value}</p>
            <p className="text-[10px] font-bold tracking-widest text-[#1E2A4A]/50 uppercase mt-1">{s.label}</p>
          </button>
        ))}
      </div>

      {/* Drill-down Modal */}
      {drill && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={() => setDrilldown(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative bg-white w-full md:max-w-4xl md:rounded-xl rounded-t-xl shadow-2xl max-h-[85vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <div>
                <h3 className="text-sm font-bold text-[#1E2A4A] uppercase tracking-widest">{drill.label}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{drill.data.length} records</p>
              </div>
              <button onClick={() => setDrilldown(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>

            {/* Table */}
            <div className="overflow-auto flex-1 p-5">
              {drill.data.length === 0 ? (
                <p className="text-sm text-gray-400 py-4">No records.</p>
              ) : drill.kind === 'visitors' ? (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50/80 border-b border-gray-100 text-left text-[10px] font-bold tracking-wider uppercase text-[#1E2A4A]/50 whitespace-nowrap">
                    <tr>
                      <th className="px-3 py-2.5 w-10">#</th>
                      <th className="px-3 py-2.5">Domain</th>
                      <th className="px-3 py-2.5 text-center">Conv</th>
                      <th className="px-3 py-2.5 text-center">Sale</th>
                      <th className="px-3 py-2.5">Source</th>
                      <th className="px-3 py-2.5 text-center">Device</th>
                      <th className="px-3 py-2.5 text-center">CTA</th>
                      <th className="px-3 py-2.5 text-right">Scroll</th>
                      <th className="px-3 py-2.5 text-right">Time</th>
                      <th className="px-3 py-2.5 text-right">When</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {(drill.data as FeedEvent[]).map((e, i) => (
                      <tr key={e.id} className="hover:bg-gray-50/50 transition-colors whitespace-nowrap">
                        <td className="px-3 py-2 text-xs text-gray-400">{i + 1}</td>
                        <td className="px-3 py-2 text-[#1E2A4A] font-medium">{e.domain}</td>
                        <td className="px-3 py-2 text-center">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${e.manual_conversion || e.cta_actions.length > 0 ? 'bg-green-100 text-green-700' : 'text-gray-300'}`}>{e.manual_conversion || e.cta_actions.length > 0 ? 'CONV' : '—'}</span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${e.auto_sale && !e.manual_sale ? 'bg-purple-50 text-purple-500' : e.manual_sale ? 'bg-purple-100 text-purple-700' : 'text-gray-300'}`}>{e.auto_sale && !e.manual_sale ? 'AUTO' : e.manual_sale ? 'SALE' : '—'}</span>
                        </td>
                        <td className="px-3 py-2 text-gray-500 max-w-[200px] truncate">{e.referrer || '—'}</td>
                        <td className="px-3 py-2 text-center text-gray-600">{e.device}</td>
                        <td className="px-3 py-2 text-center text-amber-600 font-medium">{e.cta_actions.length > 0 ? e.cta_actions.join(', ') : '—'}</td>
                        <td className="px-3 py-2 text-right text-gray-500">{e.final_scroll > 0 ? `${e.final_scroll}%` : '—'}</td>
                        <td className="px-3 py-2 text-right text-gray-500">{e.final_time > 0 ? `${e.final_time}s` : '—'}</td>
                        <td className="px-3 py-2 text-right text-gray-400">{timeAgo(e.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : drill.kind === 'cta' ? (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50/80 border-b border-gray-100 text-left text-[10px] font-bold tracking-wider uppercase text-[#1E2A4A]/50 whitespace-nowrap">
                    <tr>
                      <th className="px-3 py-2.5 w-10">#</th>
                      <th className="px-3 py-2.5">Action</th>
                      <th className="px-3 py-2.5">Domain</th>
                      <th className="px-3 py-2.5">Source</th>
                      <th className="px-3 py-2.5 text-center">Device</th>
                      <th className="px-3 py-2.5 text-right">When</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {(drill.data as (CtaDetail | BookingDetail)[]).map((e, i) => (
                      <tr key={i} className="hover:bg-gray-50/50 transition-colors whitespace-nowrap">
                        <td className="px-3 py-2 text-xs text-gray-400">{i + 1}</td>
                        <td className="px-3 py-2 text-amber-600 font-medium">{'action' in e ? e.action : 'book'}</td>
                        <td className="px-3 py-2 text-[#1E2A4A] font-medium">{e.domain}</td>
                        <td className="px-3 py-2 text-gray-500 max-w-[200px] truncate">{e.referrer || '—'}</td>
                        <td className="px-3 py-2 text-center text-gray-600">{e.device}</td>
                        <td className="px-3 py-2 text-right text-gray-400">{timeAgo(e.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50/80 border-b border-gray-100 text-left text-[10px] font-bold tracking-wider uppercase text-[#1E2A4A]/50 whitespace-nowrap">
                    <tr>
                      <th className="px-3 py-2.5 w-10">#</th>
                      <th className="px-3 py-2.5">Client</th>
                      <th className="px-3 py-2.5">Service</th>
                      <th className="px-3 py-2.5 text-right">Price</th>
                      <th className="px-3 py-2.5 text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {(drill.data as SaleDetail[]).map((e, i) => (
                      <tr key={e.client_id} className="hover:bg-gray-50/50 transition-colors whitespace-nowrap">
                        <td className="px-3 py-2 text-xs text-gray-400">{i + 1}</td>
                        <td className="px-3 py-2 text-[#1E2A4A] font-medium">{e.name}</td>
                        <td className="px-3 py-2 text-gray-600">{e.service}</td>
                        <td className="px-3 py-2 text-right text-gray-600">{e.price > 0 ? `$${e.price}` : '—'}</td>
                        <td className="px-3 py-2 text-right text-gray-400">{e.date ? new Date(e.date).toLocaleDateString() : '—'}</td>
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
          <p className="text-sm text-gray-400 py-4">No visitors yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50/80 border-b border-gray-100 text-left text-[10px] font-bold tracking-wider uppercase text-[#1E2A4A]/50 whitespace-nowrap">
                <tr>
                  <th className="px-3 py-2.5 w-8"></th>
                  <th className="px-3 py-2.5 w-10">#</th>
                  <th className="px-3 py-2.5">Domain</th>
                  <th className="px-3 py-2.5 text-center">Conv</th>
                  <th className="px-3 py-2.5 text-center">Sale</th>
                  <th className="px-3 py-2.5 text-right">When</th>
                  <th className="px-3 py-2.5">Source</th>
                  <th className="px-3 py-2.5 text-center">Device</th>
                  <th className="px-3 py-2.5 text-center">CTA</th>
                  <th className="px-3 py-2.5 text-right">Scroll</th>
                  <th className="px-3 py-2.5 text-right">Time</th>
                  <th className="px-3 py-2.5 text-center">Engaged</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {liveFeed.map((e, i) => (
                  <tr key={e.id} className="hover:bg-gray-50/50 transition-colors whitespace-nowrap">
                    <td className="px-3 py-2">
                      <button
                        onClick={() => e.referrer && blockDomain(e.referrer)}
                        disabled={!e.referrer || blocking !== null}
                        className="text-[10px] text-red-400 hover:text-red-600 disabled:opacity-30"
                        title="Block this source"
                      >block</button>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-400">{i + 1}</td>
                    <td className="px-3 py-2 text-[#1E2A4A] font-medium">{e.domain}</td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => toggleOverride(e.id, 'conversion')}
                        disabled={toggling !== null}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${e.manual_conversion || e.cta_actions.length > 0 ? 'bg-green-100 text-green-700' : 'text-gray-300 hover:text-green-600'} disabled:opacity-30`}
                      >{e.manual_conversion || e.cta_actions.length > 0 ? 'CONV' : 'conv'}</button>
                    </td>
                    <td className="px-3 py-2 text-center">
                      {e.auto_sale && !e.manual_sale ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-500">AUTO</span>
                      ) : (
                        <button
                          onClick={() => toggleOverride(e.id, 'sale')}
                          disabled={toggling !== null}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${e.manual_sale ? 'bg-purple-100 text-purple-700' : 'text-gray-300 hover:text-purple-600'} disabled:opacity-30`}
                        >{e.manual_sale ? 'SALE' : 'sale'}</button>
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-400 text-right">{timeAgo(e.created_at)}</td>
                    <td className="px-3 py-2 text-gray-500 max-w-[200px] truncate">{e.referrer || '—'}</td>
                    <td className="px-3 py-2 text-center text-gray-600">{e.device}</td>
                    <td className="px-3 py-2 text-center text-amber-600 font-medium">{e.cta_actions.length > 0 ? e.cta_actions.join(', ') : '—'}</td>
                    <td className="px-3 py-2 text-right text-gray-500">{e.final_scroll > 0 ? `${e.final_scroll}%` : '—'}</td>
                    <td className="px-3 py-2 text-right text-gray-500">{e.final_time > 0 ? `${e.final_time}s` : '—'}</td>
                    <td className="px-3 py-2 text-center text-teal-600">{e.engaged_30s ? 'Y' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Site List */}
      <Section title="Site List">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/80 border-b border-gray-100 text-left text-[10px] font-bold tracking-wider uppercase text-[#1E2A4A]/50 whitespace-nowrap">
              <tr>
                <th className="px-3 py-2.5 w-10">#</th>
                <th className="px-3 py-2.5">Domain</th>
                <th className="px-3 py-2.5 text-center">Visits</th>
                <th className="px-3 py-2.5 text-center">Calls</th>
                <th className="px-3 py-2.5 text-center">Texts</th>
                <th className="px-3 py-2.5 text-center">Books</th>
                <th className="px-3 py-2.5 text-center">CTA Clicks</th>
                <th className="px-3 py-2.5 text-center">Engaged</th>
                <th className="px-3 py-2.5 text-center">Mobile</th>
                <th className="px-3 py-2.5 text-center">Desktop</th>
                <th className="px-3 py-2.5 text-right">Avg Scroll</th>
                <th className="px-3 py-2.5 text-right">Avg Time</th>
                <th className="px-3 py-2.5">Top Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {domains.map((d, i) => (
                <tr key={d.domain} className="hover:bg-gray-50/50 transition-colors whitespace-nowrap">
                  <td className="px-3 py-2 text-xs text-gray-400">{i + 1}</td>
                  <td className="px-3 py-2 text-[#1E2A4A] font-medium">{d.domain}</td>
                  <td className="px-3 py-2 text-center text-gray-600">{v(d.visits)}</td>
                  <td className="px-3 py-2 text-center text-green-600 font-medium">{v(d.calls)}</td>
                  <td className="px-3 py-2 text-center text-blue-600 font-medium">{v(d.texts)}</td>
                  <td className="px-3 py-2 text-center text-purple-600 font-medium">{v(d.books)}</td>
                  <td className="px-3 py-2 text-center text-amber-600 font-medium">{v(d.ctaClicked)}</td>
                  <td className="px-3 py-2 text-center text-teal-600">{v(d.engaged)}</td>
                  <td className="px-3 py-2 text-center text-gray-500">{v(d.mobile)}</td>
                  <td className="px-3 py-2 text-center text-gray-500">{v(d.desktop)}</td>
                  <td className="px-3 py-2 text-right text-gray-500">{d.avgScroll > 0 ? `${d.avgScroll}%` : '—'}</td>
                  <td className="px-3 py-2 text-right text-gray-500">{d.avgTime > 0 ? `${d.avgTime}s` : '—'}</td>
                  <td className="px-3 py-2 text-gray-500 max-w-[200px] truncate">{d.topSource}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Blocked */}
      <Section title={`Blocked — ${blocked.length}`}>
        {blocked.length === 0 ? (
          <p className="text-sm text-gray-400 py-4">No blocked referrers.</p>
        ) : (
          <div className="space-y-1">
            {blocked.map(d => (
              <div key={d} className="flex items-center gap-3 py-1.5">
                <button
                  onClick={() => unblockDomain(d)}
                  disabled={blocking !== null}
                  className="text-[10px] text-green-500 hover:text-green-700 disabled:opacity-30"
                >unblock</button>
                <span className="text-sm text-[#1E2A4A]">{d}</span>
              </div>
            ))}
          </div>
        )}
      </Section>
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200/80 rounded-xl shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-xs font-bold tracking-widest text-[#1E2A4A]/60 uppercase">{title}</h3>
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
