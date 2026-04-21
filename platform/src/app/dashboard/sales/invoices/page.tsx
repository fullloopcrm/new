'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Invoice = {
  id: string
  invoice_number: string
  title: string | null
  status: string
  total_cents: number
  amount_paid_cents: number
  contact_name: string | null
  contact_email: string | null
  due_date: string | null
  sent_at: string | null
  created_at: string
  clients: { id: string; name: string } | null
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  sent: 'bg-blue-50 text-blue-600',
  viewed: 'bg-violet-50 text-violet-600',
  partial: 'bg-amber-50 text-amber-700',
  paid: 'bg-green-50 text-green-700',
  overdue: 'bg-red-50 text-red-600',
  void: 'bg-slate-100 text-slate-400',
  refunded: 'bg-slate-100 text-slate-400',
}

const TABS = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'viewed', label: 'Viewed' },
  { value: 'partial', label: 'Partial' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'void', label: 'Void' },
]

function formatCents(cents: number): string {
  return ((cents || 0) / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

export default function InvoicesListPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  const load = () => {
    setLoading(true)
    fetch('/api/invoices?limit=500')
      .then(r => r.json())
      .then(data => { setInvoices(data.invoices || []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  const filtered = invoices.filter(inv => {
    if (filter !== 'all' && inv.status !== filter) return false
    if (search) {
      const t = search.toLowerCase()
      const hit =
        inv.invoice_number.toLowerCase().includes(t) ||
        (inv.title || '').toLowerCase().includes(t) ||
        (inv.contact_name || '').toLowerCase().includes(t) ||
        (inv.contact_email || '').toLowerCase().includes(t) ||
        (inv.clients?.name || '').toLowerCase().includes(t)
      if (!hit) return false
    }
    return true
  })

  const totalOutstanding = invoices
    .filter(i => !['paid', 'void', 'refunded'].includes(i.status))
    .reduce((acc, i) => acc + (i.total_cents - (i.amount_paid_cents || 0)), 0)
  const totalOverdue = invoices
    .filter(i => i.status === 'overdue')
    .reduce((acc, i) => acc + (i.total_cents - (i.amount_paid_cents || 0)), 0)
  const totalPaidMtd = invoices
    .filter(i => {
      if (i.status !== 'paid') return false
      const d = new Date(i.created_at)
      const now = new Date()
      return d.getUTCFullYear() === now.getUTCFullYear() && d.getUTCMonth() === now.getUTCMonth()
    })
    .reduce((acc, i) => acc + i.amount_paid_cents, 0)

  return (
    <div>
      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <Link href="/dashboard/sales" className="text-xs text-slate-500 hover:underline">← Sales</Link>
          <h1 className="font-heading text-2xl font-bold text-slate-900 mt-1">Invoices</h1>
          <p className="text-sm text-slate-500">Send invoices, track balances, and collect payments.</p>
        </div>
        <Link
          href="/dashboard/sales/invoices/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700"
        >
          + New Invoice
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-xs text-slate-500 uppercase">Outstanding</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatCents(totalOutstanding)}</p>
        </div>
        <div className="bg-white border border-red-200 rounded-lg p-4">
          <p className="text-xs text-red-600 uppercase">Overdue</p>
          <p className="text-2xl font-bold text-red-700 mt-1">{formatCents(totalOverdue)}</p>
        </div>
        <div className="bg-white border border-green-200 rounded-lg p-4">
          <p className="text-xs text-green-600 uppercase">Paid this month</p>
          <p className="text-2xl font-bold text-green-700 mt-1">{formatCents(totalPaidMtd)}</p>
        </div>
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
            <p className="text-slate-500 text-sm">No invoices match.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
              <tr>
                <th className="px-5 py-2 font-medium">Number</th>
                <th className="px-5 py-2 font-medium">Title / Client</th>
                <th className="px-5 py-2 font-medium">Status</th>
                <th className="px-5 py-2 font-medium text-right">Total</th>
                <th className="px-5 py-2 font-medium text-right">Balance</th>
                <th className="px-5 py-2 font-medium">Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(inv => {
                const balance = inv.total_cents - (inv.amount_paid_cents || 0)
                return (
                  <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3">
                      <Link href={`/dashboard/sales/invoices/${inv.id}`} className="text-teal-600 font-medium hover:underline">
                        {inv.invoice_number}
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-slate-900">{inv.title || '—'}</p>
                      <p className="text-xs text-slate-400">
                        {inv.clients?.name || inv.contact_name || inv.contact_email || '—'}
                      </p>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_COLORS[inv.status] || 'bg-slate-100 text-slate-500'}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-slate-900">{formatCents(inv.total_cents)}</td>
                    <td className={`px-5 py-3 text-right font-medium ${balance > 0 ? 'text-amber-700' : 'text-slate-400'}`}>
                      {formatCents(balance)}
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-500">
                      {inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
