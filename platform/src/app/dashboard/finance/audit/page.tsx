'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

type AuditRow = {
  id: number
  table_name: string
  row_id: string | null
  event: 'INSERT' | 'UPDATE' | 'DELETE'
  changed_fields: string[] | null
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  actor_id: string | null
  created_at: string
}

const EVENT_COLORS: Record<string, string> = {
  INSERT: 'bg-green-50 text-green-700',
  UPDATE: 'bg-blue-50 text-blue-700',
  DELETE: 'bg-red-50 text-red-600',
}

export default function AuditLogPage() {
  const [rows, setRows] = useState<AuditRow[]>([])
  const [loading, setLoading] = useState(true)
  const [table, setTable] = useState('')
  const [event, setEvent] = useState('')
  const [expanded, setExpanded] = useState<number | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (table) params.set('table', table)
    if (event) params.set('event', event)
    fetch(`/api/finance/audit-log?${params.toString()}&limit=200`)
      .then(r => r.json())
      .then(d => { setRows(d.log || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [table, event])

  useEffect(() => { load() }, [load])

  return (
    <div>
      <Link href="/dashboard/finance" className="text-xs text-slate-500 hover:underline">← Finance</Link>
      <div className="mt-1 mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900">Audit Log</h1>
          <p className="text-sm text-slate-500">Every change to tracked financial records, searchable.</p>
        </div>
        <div className="flex gap-2">
          <select value={table} onChange={e => setTable(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm">
            <option value="">All tables</option>
            {['invoices','bank_transactions','journal_entries','journal_lines','expenses','recurring_expenses','chart_of_accounts','bank_accounts','entities','quotes','documents','payments'].map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select value={event} onChange={e => setEvent(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm">
            <option value="">All events</option>
            <option value="INSERT">Insert</option>
            <option value="UPDATE">Update</option>
            <option value="DELETE">Delete</option>
          </select>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-slate-400">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">No audit entries.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-2 font-medium">When</th>
                <th className="px-4 py-2 font-medium">Table</th>
                <th className="px-4 py-2 font-medium">Event</th>
                <th className="px-4 py-2 font-medium">Changed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(r => (
                <>
                  <tr key={r.id} onClick={() => setExpanded(expanded === r.id ? null : r.id)} className="hover:bg-slate-50 cursor-pointer">
                    <td className="px-4 py-2 text-xs text-slate-500">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="px-4 py-2 text-xs font-mono">{r.table_name}</td>
                    <td className="px-4 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${EVENT_COLORS[r.event]}`}>{r.event}</span>
                    </td>
                    <td className="px-4 py-2 text-xs text-slate-500">
                      {r.changed_fields?.length ? r.changed_fields.slice(0, 5).join(', ') + (r.changed_fields.length > 5 ? '…' : '') : '—'}
                    </td>
                  </tr>
                  {expanded === r.id && (
                    <tr key={`${r.id}-detail`}>
                      <td colSpan={4} className="px-4 py-3 bg-slate-50">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] font-mono">
                          <div>
                            <p className="text-slate-500 mb-1">Old</p>
                            <pre className="bg-white p-2 rounded border border-slate-200 overflow-x-auto">{JSON.stringify(r.old_data, null, 2) || '—'}</pre>
                          </div>
                          <div>
                            <p className="text-slate-500 mb-1">New</p>
                            <pre className="bg-white p-2 rounded border border-slate-200 overflow-x-auto">{JSON.stringify(r.new_data, null, 2) || '—'}</pre>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
