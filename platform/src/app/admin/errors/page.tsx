'use client'

import { useEffect, useState } from 'react'

interface ErrorRow {
  id: string
  created_at: string
  route: string | null
  action: string | null
  message: string
  stack: string | null
  severity: string
  tenant_id: string | null
  resolved: boolean
  resolved_at: string | null
  resolution_notes: string | null
  metadata: unknown
}

interface ErrorsPayload {
  summary: {
    unresolvedErrors: number
    failedNotifications: number
    retriedSuccessfully: number
    timeRange: string
  }
  errors: ErrorRow[]
}

function humanTs(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function AdminErrorsPage() {
  const [data, setData] = useState<ErrorsPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [showResolved, setShowResolved] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const params = new URLSearchParams({ hours: '24' })
    if (showResolved) params.set('resolved', 'true')
    const res = await fetch('/api/admin/errors?' + params.toString())
    const payload = await res.json()
    setData(payload)
    setLoading(false)
  }

  useEffect(() => { load() }, [showResolved])

  async function resolve(id: string) {
    await fetch('/api/admin/errors', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ errorId: id }),
    })
    load()
  }

  const errors = data?.errors || []

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Errors</h1>
        <div className="flex gap-3 items-center text-sm">
          <label className="flex items-center gap-1.5 text-gray-600">
            <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} />
            Show resolved
          </label>
          <button onClick={load} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-gray-700">Refresh</button>
        </div>
      </div>

      {data && (
        <div className="text-xs text-gray-500 mb-4">
          {data.summary.unresolvedErrors} unresolved · {data.summary.failedNotifications} failed notifications ·
          last {data.summary.timeRange}
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : errors.length === 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <p className="text-green-700 font-semibold">No errors. ✓</p>
          <p className="text-green-600 text-sm mt-1">Either everything is healthy or all known issues are resolved.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {errors.map(e => (
            <div key={e.id} className={`bg-white border rounded-lg p-4 ${e.resolved ? 'border-gray-200 opacity-50' : 'border-red-200'}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs text-gray-400">{humanTs(e.created_at)}</span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono uppercase">{e.severity}</span>
                    {e.route && <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono">{e.route}</span>}
                    {e.tenant_id && <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-mono">{e.tenant_id.slice(0, 8)}</span>}
                    {e.resolved && <span className="text-xs bg-gray-50 text-gray-500 px-1.5 py-0.5 rounded">resolved</span>}
                  </div>
                  <p className="text-sm text-gray-900 break-words">{e.message}</p>
                  {expanded === e.id && (
                    <div className="mt-3 space-y-2">
                      {e.stack && (
                        <pre className="text-[10px] bg-gray-900 text-gray-100 p-3 rounded overflow-x-auto max-h-64 whitespace-pre-wrap">{e.stack}</pre>
                      )}
                      {!!e.metadata && (
                        <pre className="text-[10px] bg-gray-50 text-gray-700 p-3 rounded overflow-x-auto max-h-48 whitespace-pre-wrap">{JSON.stringify(e.metadata, null, 2)}</pre>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1.5 items-end flex-shrink-0">
                  <button onClick={() => setExpanded(expanded === e.id ? null : e.id)} className="text-xs text-gray-500 hover:text-gray-900">
                    {expanded === e.id ? 'Hide' : 'Details'}
                  </button>
                  {!e.resolved && (
                    <button onClick={() => resolve(e.id)} className="text-xs px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded">
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
