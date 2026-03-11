'use client'

import { useEffect, useState } from 'react'

interface AnalyticsData {
  overview: {
    totalBookings: number
    totalRevenue: number
    totalClients: number
    avgBookingValue: number
    thisMonth: { bookings: number; revenue: number; clients: number }
    lastMonth: { bookings: number; revenue: number; clients: number }
  }
  byStatus: { status: string; count: number }[]
  monthlyTrend: { month: string; bookings: number; revenue: number }[]
  topServices: { service: string; count: number; revenue: number }[]
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [bookingsRes, clientsRes, financeRes] = await Promise.all([
          fetch('/api/bookings?limit=1000'),
          fetch('/api/clients'),
          fetch('/api/finance/revenue'),
        ])

        const bookingsData = bookingsRes.ok ? await bookingsRes.json() : []
        const clientsData = clientsRes.ok ? await clientsRes.json() : { clients: [] }
        const financeData = financeRes.ok ? await financeRes.json() : {}

        const bookings = Array.isArray(bookingsData) ? bookingsData : bookingsData.bookings || []
        const clients = clientsData.clients || []

        const now = new Date()
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString()

        const thisMonthBookings = bookings.filter((b: { created_at: string }) => b.created_at >= thisMonthStart)
        const lastMonthBookings = bookings.filter((b: { created_at: string }) => b.created_at >= lastMonthStart && b.created_at <= lastMonthEnd)

        const totalRevenue = financeData.totalRevenue || bookings.reduce((s: number, b: { price?: number; final_price?: number }) => s + (b.final_price || b.price || 0), 0)

        const byStatus: Record<string, number> = {}
        bookings.forEach((b: { status: string }) => { byStatus[b.status] = (byStatus[b.status] || 0) + 1 })

        const serviceCount: Record<string, { count: number; revenue: number }> = {}
        bookings.forEach((b: { service_type?: string; price?: number; final_price?: number }) => {
          const svc = b.service_type || 'Other'
          if (!serviceCount[svc]) serviceCount[svc] = { count: 0, revenue: 0 }
          serviceCount[svc].count++
          serviceCount[svc].revenue += b.final_price || b.price || 0
        })

        // Monthly trend (last 6 months)
        const monthlyTrend: { month: string; bookings: number; revenue: number }[] = []
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
          const mStart = d.toISOString()
          const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString()
          const mBookings = bookings.filter((b: { created_at: string }) => b.created_at >= mStart && b.created_at <= mEnd)
          monthlyTrend.push({
            month: d.toLocaleDateString('en-US', { month: 'short' }),
            bookings: mBookings.length,
            revenue: mBookings.reduce((s: number, b: { final_price?: number; price?: number }) => s + (b.final_price || b.price || 0), 0),
          })
        }

        setData({
          overview: {
            totalBookings: bookings.length,
            totalRevenue,
            totalClients: clients.length,
            avgBookingValue: bookings.length > 0 ? Math.round(totalRevenue / bookings.length) : 0,
            thisMonth: { bookings: thisMonthBookings.length, revenue: thisMonthBookings.reduce((s: number, b: { final_price?: number; price?: number }) => s + (b.final_price || b.price || 0), 0), clients: 0 },
            lastMonth: { bookings: lastMonthBookings.length, revenue: lastMonthBookings.reduce((s: number, b: { final_price?: number; price?: number }) => s + (b.final_price || b.price || 0), 0), clients: 0 },
          },
          byStatus: Object.entries(byStatus).map(([status, count]) => ({ status, count })),
          monthlyTrend,
          topServices: Object.entries(serviceCount).map(([service, d]) => ({ service, ...d })).sort((a, b) => b.count - a.count).slice(0, 8),
        })
      } catch { /* */ }
      setLoading(false)
    }
    load()
  }, [])

  const fmt = (cents: number) => '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })

  if (loading) return <p className="text-slate-400 py-8 text-center">Loading analytics...</p>
  if (!data) return <p className="text-slate-400 py-8 text-center">Failed to load analytics</p>

  const maxTrend = Math.max(...data.monthlyTrend.map(m => m.bookings), 1)

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-slate-900 mb-4">Analytics</h1>

      {/* Overview cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Bookings', value: data.overview.totalBookings, color: 'border-l-teal-500' },
          { label: 'Total Revenue', value: fmt(data.overview.totalRevenue), color: 'border-l-green-500' },
          { label: 'Total Clients', value: data.overview.totalClients, color: 'border-l-blue-500' },
          { label: 'Avg Booking Value', value: fmt(data.overview.avgBookingValue), color: 'border-l-purple-500' },
        ].map(s => (
          <div key={s.label} className={`border-l-4 ${s.color} pl-3 py-2`}>
            <p className="text-[10px] text-slate-500 uppercase tracking-wide">{s.label}</p>
            <p className="text-xl font-bold font-mono text-slate-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* This month vs last month */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="border border-slate-200 rounded-lg p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">This Month</p>
          <p className="text-lg font-bold text-slate-900">{data.overview.thisMonth.bookings} bookings</p>
          <p className="text-sm text-slate-500">{fmt(data.overview.thisMonth.revenue)} revenue</p>
        </div>
        <div className="border border-slate-200 rounded-lg p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Last Month</p>
          <p className="text-lg font-bold text-slate-900">{data.overview.lastMonth.bookings} bookings</p>
          <p className="text-sm text-slate-500">{fmt(data.overview.lastMonth.revenue)} revenue</p>
        </div>
      </div>

      {/* Monthly trend */}
      <div className="border border-slate-200 rounded-lg p-4 mb-6">
        <p className="text-xs text-slate-400 uppercase tracking-wide mb-3">Booking Trend (6 Months)</p>
        <div className="flex items-end gap-2 h-32">
          {data.monthlyTrend.map(m => (
            <div key={m.month} className="flex-1 flex flex-col items-center">
              <div className="w-full bg-teal-500 rounded-t" style={{ height: `${(m.bookings / maxTrend) * 100}%`, minHeight: m.bookings > 0 ? 4 : 0 }} />
              <p className="text-[10px] text-slate-400 mt-1">{m.month}</p>
              <p className="text-[10px] font-mono text-slate-600">{m.bookings}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* By status */}
        <div className="border border-slate-200 rounded-lg p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-3">By Status</p>
          <div className="space-y-2">
            {data.byStatus.map(s => (
              <div key={s.status} className="flex items-center justify-between">
                <span className="text-sm text-slate-700 capitalize">{s.status.replace('_', ' ')}</span>
                <span className="text-sm font-mono font-medium text-slate-900">{s.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top services */}
        <div className="border border-slate-200 rounded-lg p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-3">Top Services</p>
          <div className="space-y-2">
            {data.topServices.map(s => (
              <div key={s.service} className="flex items-center justify-between">
                <span className="text-sm text-slate-700">{s.service}</span>
                <div className="text-right">
                  <span className="text-sm font-mono font-medium text-slate-900">{s.count}</span>
                  <span className="text-xs text-slate-400 ml-2">{fmt(s.revenue)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
