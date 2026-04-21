'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Signer = { id: string; name: string; email: string | null; role: string | null; status: string; order_index: number }
type Doc = {
  id: string
  title: string
  status: string
  sign_order: string
  page_count: number | null
  sent_at: string | null
  completed_at: string | null
  created_at: string
  document_signers: Signer[]
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  sent: 'bg-blue-50 text-blue-600',
  viewed: 'bg-violet-50 text-violet-600',
  in_progress: 'bg-amber-50 text-amber-700',
  completed: 'bg-green-50 text-green-700',
  declined: 'bg-red-50 text-red-600',
  voided: 'bg-slate-100 text-slate-400',
  expired: 'bg-slate-100 text-slate-400',
}

const TABS = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'declined', label: 'Declined' },
  { value: 'voided', label: 'Voided' },
]

export default function DocumentsListPage() {
  const [docs, setDocs] = useState<Doc[]>([])
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/documents?limit=500')
      .then(r => r.json())
      .then(data => { setDocs(data.documents || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = docs.filter(d => {
    if (filter !== 'all' && d.status !== filter) return false
    if (search && !d.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div>
      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <Link href="/dashboard/sales" className="text-xs text-slate-500 hover:underline">← Sales</Link>
          <h1 className="font-heading text-2xl font-bold text-slate-900 mt-1">Documents</h1>
          <p className="text-sm text-slate-500">Upload a PDF, add signers, drag fields, send. Multi-party e-sign.</p>
        </div>
        <Link
          href="/dashboard/sales/documents/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700"
        >+ New Document</Link>
      </div>

      <div className="flex flex-col md:flex-row items-start md:items-center gap-3 mb-4">
        <input
          placeholder="Search by title…"
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
          <div className="p-10 text-center text-sm text-slate-500">
            No documents.
            <Link href="/dashboard/sales/documents/new" className="text-teal-600 hover:underline ml-1">Create your first →</Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
              <tr>
                <th className="px-5 py-2 font-medium">Title</th>
                <th className="px-5 py-2 font-medium">Signers</th>
                <th className="px-5 py-2 font-medium">Status</th>
                <th className="px-5 py-2 font-medium">Order</th>
                <th className="px-5 py-2 font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(d => {
                const signedCount = d.document_signers.filter(s => s.status === 'signed').length
                return (
                  <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3">
                      <Link href={`/dashboard/sales/documents/${d.id}`} className="text-teal-600 font-medium hover:underline">
                        {d.title}
                      </Link>
                      {d.page_count && <p className="text-xs text-slate-400">{d.page_count} page{d.page_count === 1 ? '' : 's'}</p>}
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-slate-900">{signedCount} / {d.document_signers.length} signed</p>
                      <p className="text-xs text-slate-400 truncate">{d.document_signers.slice(0, 3).map(s => s.name).join(', ')}{d.document_signers.length > 3 ? '…' : ''}</p>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_COLORS[d.status] || 'bg-slate-100 text-slate-500'}`}>
                        {d.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-500">{d.sign_order}</td>
                    <td className="px-5 py-3 text-xs text-slate-500">
                      {new Date(d.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
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
