'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type QuoteStats = {
  draft: number
  sent: number
  viewed: number
  accepted: number
  declined: number
  converted: number
  pipeline_value_cents: number
  accepted_value_cents: number
}

type RecentQuote = {
  id: string
  quote_number: string
  title: string | null
  status: string
  total_cents: number
  contact_name: string | null
  created_at: string
  sent_at: string | null
}

function formatCents(cents: number): string {
  return ((cents || 0) / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  sent: 'bg-blue-50 text-blue-600',
  viewed: 'bg-violet-50 text-violet-600',
  accepted: 'bg-green-50 text-green-600',
  declined: 'bg-red-50 text-red-600',
  expired: 'bg-amber-50 text-amber-600',
  converted: 'bg-teal-50 text-teal-700',
}

export default function SalesHubPage() {
  const [stats, setStats] = useState<QuoteStats | null>(null)
  const [recent, setRecent] = useState<RecentQuote[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/quotes?limit=500')
      .then(r => r.json())
      .then(data => {
        const quotes: RecentQuote[] = data.quotes || []
        const s: QuoteStats = {
          draft: 0, sent: 0, viewed: 0, accepted: 0, declined: 0, converted: 0,
          pipeline_value_cents: 0, accepted_value_cents: 0,
        }
        for (const q of quotes) {
          if (q.status in s) (s as unknown as Record<string, number>)[q.status] += 1
          if (['sent', 'viewed'].includes(q.status)) s.pipeline_value_cents += q.total_cents || 0
          if (['accepted', 'converted'].includes(q.status)) s.accepted_value_cents += q.total_cents || 0
        }
        setStats(s)
        setRecent(quotes.slice(0, 8))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div>
      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900">Sales</h1>
          <p className="text-sm text-slate-500">Quotes, invoices, routes, and pipeline — in one place.</p>
        </div>
        <Link
          href="/dashboard/sales/quotes/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
        >
          <span>+</span>
          <span>New Quote</span>
        </Link>
      </div>

      {/* Four product cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Link
          href="/dashboard/sales/quotes"
          className="group relative bg-white border border-slate-200 rounded-xl p-5 hover:border-teal-400 hover:shadow-md transition-all"
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs text-teal-600 uppercase tracking-wide font-medium">Live</p>
              <h3 className="text-lg font-bold text-slate-900 mt-1">Quotes &amp; E-sign</h3>
            </div>
            <span className="text-2xl">📝</span>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            Send itemized quotes with tiered pricing. Clients accept online with a signature. Auto-converts to a booking.
          </p>
          {stats && (
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-4 text-xs">
              <span className="text-slate-500">Pipeline <strong className="text-slate-900">{formatCents(stats.pipeline_value_cents)}</strong></span>
              <span className="text-slate-500">Won <strong className="text-slate-900">{formatCents(stats.accepted_value_cents)}</strong></span>
            </div>
          )}
        </Link>

        <Link
          href="/dashboard/sales/invoices"
          className="group relative bg-white border border-slate-200 rounded-xl p-5 hover:border-teal-400 hover:shadow-md transition-all"
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs text-teal-600 uppercase tracking-wide font-medium">Live</p>
              <h3 className="text-lg font-bold text-slate-900 mt-1">Invoices</h3>
            </div>
            <span className="text-2xl">📄</span>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            Send invoices via email or SMS. Stripe online payment + Zelle/Venmo/cash reconciliation. Auto-status from paid amount.
          </p>
        </Link>

        <Link
          href="/dashboard/sales/routes"
          className="group relative bg-white border border-slate-200 rounded-xl p-5 hover:border-teal-400 hover:shadow-md transition-all"
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs text-teal-600 uppercase tracking-wide font-medium">Live</p>
              <h3 className="text-lg font-bold text-slate-900 mt-1">Route Optimizer</h3>
            </div>
            <span className="text-2xl">🗺️</span>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            Auto-build daily routes from bookings. Nearest-neighbor + 2-opt optimization. Publish to team via SMS with Google Maps navigation.
          </p>
        </Link>

        <Link
          href="/dashboard/sales/pipeline"
          className="group relative bg-white border border-slate-200 rounded-xl p-5 hover:border-teal-400 hover:shadow-md transition-all"
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs text-teal-600 uppercase tracking-wide font-medium">Live</p>
              <h3 className="text-lg font-bold text-slate-900 mt-1">Deal Pipeline</h3>
            </div>
            <span className="text-2xl">📊</span>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            Kanban stages, probability weighting, monthly forecast, activity timeline. Drag-drop stage moves, overdue follow-up tracking.
          </p>
        </Link>
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-8">
          {(['draft', 'sent', 'viewed', 'accepted', 'declined', 'converted'] as const).map(k => (
            <div key={k} className="bg-white border border-slate-200 rounded-lg p-3">
              <p className="text-xs text-slate-400 uppercase tracking-wide">{k}</p>
              <p className="text-xl font-bold text-slate-900 mt-0.5">{stats[k]}</p>
            </div>
          ))}
        </div>
      )}

      {/* Recent quotes */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-heading font-semibold text-slate-900">Recent Quotes</h2>
          <Link href="/dashboard/sales/quotes" className="text-xs text-teal-600 hover:underline">View all →</Link>
        </div>
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading…</div>
        ) : recent.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-slate-500 mb-3">No quotes yet.</p>
            <Link
              href="/dashboard/sales/quotes/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700"
            >
              Create your first quote →
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
              <tr>
                <th className="px-5 py-2 font-medium">Number</th>
                <th className="px-5 py-2 font-medium">Title / Contact</th>
                <th className="px-5 py-2 font-medium">Status</th>
                <th className="px-5 py-2 font-medium text-right">Total</th>
                <th className="px-5 py-2 font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recent.map(q => (
                <tr key={q.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3">
                    <Link href={`/dashboard/sales/quotes/${q.id}`} className="text-teal-600 font-medium hover:underline">
                      {q.quote_number}
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    <p className="text-slate-900">{q.title || '—'}</p>
                    <p className="text-xs text-slate-400">{q.contact_name || '—'}</p>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_COLORS[q.status] || 'bg-slate-100 text-slate-500'}`}>
                      {q.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-slate-900">{formatCents(q.total_cents)}</td>
                  <td className="px-5 py-3 text-xs text-slate-500">
                    {new Date(q.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
