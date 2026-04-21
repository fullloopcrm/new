'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Quote = {
  id: string
  quote_number: string
  title: string | null
  status: string
  total_cents: number
  contact_name: string | null
  contact_email: string | null
  created_at: string
  sent_at: string | null
  valid_until: string | null
  clients: { id: string; name: string } | null
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

const TABS = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'viewed', label: 'Viewed' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'declined', label: 'Declined' },
  { value: 'converted', label: 'Converted' },
]

function formatCents(cents: number): string {
  return ((cents || 0) / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

export default function QuotesListPage() {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  const load = () => {
    setLoading(true)
    fetch('/api/quotes?limit=500')
      .then(r => r.json())
      .then(data => { setQuotes(data.quotes || []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  const filtered = quotes.filter(q => {
    if (filter !== 'all' && q.status !== filter) return false
    if (search) {
      const t = search.toLowerCase()
      const hits =
        q.quote_number.toLowerCase().includes(t) ||
        (q.title || '').toLowerCase().includes(t) ||
        (q.contact_name || '').toLowerCase().includes(t) ||
        (q.contact_email || '').toLowerCase().includes(t) ||
        (q.clients?.name || '').toLowerCase().includes(t)
      if (!hits) return false
    }
    return true
  })

  return (
    <div>
      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <Link href="/dashboard/sales" className="text-xs text-slate-500 hover:underline">← Sales</Link>
          <h1 className="font-heading text-2xl font-bold text-slate-900 mt-1">Quotes</h1>
          <p className="text-sm text-slate-500">Itemized quotes with e-signature acceptance.</p>
        </div>
        <Link
          href="/dashboard/sales/quotes/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700"
        >
          + New Quote
        </Link>
      </div>

      <div className="flex flex-col md:flex-row items-start md:items-center gap-3 mb-4">
        <input
          placeholder="Search by number, title, client, email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full md:w-80 bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm"
        />
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.value}
              onClick={() => setFilter(t.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                filter === t.value ? 'bg-teal-600 text-white' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-400 text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-slate-500 text-sm">No quotes match.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
              <tr>
                <th className="px-5 py-2 font-medium">Number</th>
                <th className="px-5 py-2 font-medium">Title / Contact</th>
                <th className="px-5 py-2 font-medium">Status</th>
                <th className="px-5 py-2 font-medium text-right">Total</th>
                <th className="px-5 py-2 font-medium">Sent</th>
                <th className="px-5 py-2 font-medium">Valid until</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(q => (
                <tr key={q.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3">
                    <Link href={`/dashboard/sales/quotes/${q.id}`} className="text-teal-600 font-medium hover:underline">
                      {q.quote_number}
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    <p className="text-slate-900">{q.title || '—'}</p>
                    <p className="text-xs text-slate-400">
                      {q.clients?.name || q.contact_name || q.contact_email || '—'}
                    </p>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_COLORS[q.status] || 'bg-slate-100 text-slate-500'}`}>
                      {q.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-slate-900">{formatCents(q.total_cents)}</td>
                  <td className="px-5 py-3 text-xs text-slate-500">
                    {q.sent_at ? new Date(q.sent_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-500">
                    {q.valid_until ? new Date(q.valid_until).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
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
