'use client'

import { useEffect, useState } from 'react'

type AuditLog = {
  id: string
  action: string
  entity_type: string
  entity_id: string | null
  user_id: string | null
  details: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
}

const ACTION_COLORS: Record<string, string> = {
  created: 'bg-green-50 text-green-700',
  updated: 'bg-blue-50 text-blue-700',
  deleted: 'bg-red-50 text-red-700',
  status_changed: 'bg-yellow-50 text-yellow-700',
  sent: 'bg-purple-50 text-purple-700',
  login: 'bg-indigo-50 text-indigo-700',
  checkin: 'bg-teal-50 text-teal-700',
  checkout: 'bg-teal-50 text-teal-700',
  received: 'bg-emerald-50 text-emerald-700',
  paid: 'bg-emerald-50 text-emerald-700',
  requested: 'bg-orange-50 text-orange-700',
}

function getActionColor(action: string): string {
  const suffix = action.split('.').pop() || ''
  return ACTION_COLORS[suffix] || 'bg-slate-100 text-slate-500'
}

function formatAction(action: string): string {
  return action.replace('.', ' › ').replace(/_/g, ' ')
}

export default function ActivityPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [entityFilter, setEntityFilter] = useState('')
  const [search, setSearch] = useState('')
  const limit = 30

  useEffect(() => {
    const params = new URLSearchParams()
    params.set('limit', String(limit))
    params.set('offset', String((page - 1) * limit))
    if (entityFilter) params.set('entity_type', entityFilter)

    fetch(`/api/audit?${params}`)
      .then(r => r.json())
      .then(data => {
        setLogs(data.logs || [])
        setTotal(data.total || 0)
      })
      .catch(() => {})
  }, [page, entityFilter])

  const filtered = search
    ? logs.filter(l => l.action.includes(search.toLowerCase()) || l.entity_type.includes(search.toLowerCase()) || JSON.stringify(l.details || {}).toLowerCase().includes(search.toLowerCase()))
    : logs

  const entityTypes = ['client', 'booking', 'team_member', 'schedule', 'campaign', 'review', 'referral', 'expense', 'service']

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Activity Log</h2>
          <p className="text-sm text-slate-400">{total} total events</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <input
          placeholder="Search actions..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full md:w-64 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm placeholder-gray-500"
        />
        <select
          value={entityFilter}
          onChange={e => { setEntityFilter(e.target.value); setPage(1) }}
          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All entities</option>
          {entityTypes.map(t => (
            <option key={t} value={t}>{t.replace('_', ' ')}</option>
          ))}
        </select>
      </div>

      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <div className="divide-y divide-slate-700/50">
          {filtered.map(log => (
            <div key={log.id} className="px-5 py-3 flex items-start gap-4">
              <div className="flex-shrink-0 mt-0.5">
                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${getActionColor(log.action)}`}>
                  {log.action.split('.').pop()?.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-900">{formatAction(log.action)}</p>
                {log.details && (
                  <p className="text-xs text-slate-400 mt-0.5 truncate">
                    {Object.entries(log.details).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                  </p>
                )}
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="text-xs text-slate-400">
                  {new Date(log.created_at).toLocaleString('en-US', {
                    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
                  })}
                </p>
                <p className="text-[10px] text-slate-500">{log.entity_type}</p>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="px-5 py-12 text-center text-slate-400 text-sm">
              {search || entityFilter ? 'No matching events' : 'No activity logged yet'}
            </div>
          )}
        </div>
      </div>

      {total > limit && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-30 hover:bg-slate-50"
          >
            Previous
          </button>
          <span className="px-3 py-1.5 text-sm text-slate-400">
            Page {page} of {Math.ceil(total / limit)}
          </span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page * limit >= total}
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-30 hover:bg-slate-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
