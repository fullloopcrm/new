'use client'

import { useEffect, useState, useCallback } from 'react'

type Check = {
  name: string
  status: 'pass' | 'fail' | 'warn'
  detail: string
}

type SystemCheckResult = {
  status: 'healthy' | 'degraded'
  failures: number
  warnings: number
  checks: Check[]
  timestamp: string
}

type RecentLog = {
  id: string
  type: string
  title: string
  message: string
  created_at: string
}

export default function SystemStatusPage() {
  const [result, setResult] = useState<SystemCheckResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [recentErrors, setRecentErrors] = useState<RecentLog[]>([])
  const [recentChecks, setRecentChecks] = useState<RecentLog[]>([])
  const [autoRefresh, setAutoRefresh] = useState(true)

  const runCheck = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/system-check', { method: 'POST' })
      const data = await res.json()
      setResult(data)
    } catch {
      setResult(null)
    }
    setLoading(false)
  }, [])

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/system-check')
      const data = await res.json()
      setRecentErrors(data.errors || [])
      setRecentChecks(data.checks || [])
    } catch {
      // silent
    }
  }, [])

  useEffect(() => {
    runCheck()
    loadHistory()
  }, [runCheck, loadHistory])

  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(() => {
      runCheck()
      loadHistory()
    }, 60_000)
    return () => clearInterval(interval)
  }, [autoRefresh, runCheck, loadHistory])

  const statusColor = (s: string) =>
    s === 'pass' ? 'bg-green-100 text-green-700' :
    s === 'warn' ? 'bg-yellow-100 text-yellow-700' :
    'bg-red-100 text-red-700'

  const statusIcon = (s: string) =>
    s === 'pass' ? 'OK' : s === 'warn' ? 'WARN' : 'FAIL'

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">System Status</h1>
          <p className="text-sm text-slate-400 mt-0.5">Real-time health of every critical system</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-500">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            Auto-refresh (60s)
          </label>
          <button
            onClick={runCheck}
            disabled={loading}
            className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {loading ? 'Checking...' : 'Run Check Now'}
          </button>
        </div>
      </div>

      {/* Overall Status Banner */}
      {result && (
        <div className={`rounded-xl p-4 mb-6 ${result.status === 'healthy' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${result.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
              <span className={`text-lg font-bold ${result.status === 'healthy' ? 'text-green-800' : 'text-red-800'}`}>
                {result.status === 'healthy' ? 'All Systems Operational' : `${result.failures} System${result.failures > 1 ? 's' : ''} Down`}
              </span>
            </div>
            <span className="text-xs text-slate-400">
              Last checked: {new Date(result.timestamp).toLocaleTimeString()}
            </span>
          </div>
          {result.warnings > 0 && result.status === 'healthy' && (
            <p className="text-sm text-yellow-700 mt-1 ml-6">{result.warnings} warning{result.warnings > 1 ? 's' : ''} — review below</p>
          )}
        </div>
      )}

      {/* Check Results Grid */}
      {result && (
        <div className="grid grid-cols-2 gap-3 mb-8">
          {result.checks.map((check) => (
            <div key={check.name} className="border border-slate-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-slate-700">{check.name}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${statusColor(check.status)}`}>
                  {statusIcon(check.status)}
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{check.detail}</p>
            </div>
          ))}
        </div>
      )}

      {/* Two columns: Recent Errors + Check History */}
      <div className="grid grid-cols-2 gap-6">
        {/* Recent Errors */}
        <div>
          <h2 className="text-sm font-bold text-slate-700 mb-3">Recent Errors (24h)</h2>
          {recentErrors.length === 0 ? (
            <p className="text-xs text-slate-400">No errors in the last 24 hours</p>
          ) : (
            <div className="space-y-2">
              {recentErrors.map((err) => (
                <div key={err.id} className="border border-red-100 bg-red-50/50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-red-700">{err.title}</span>
                    <span className="text-[10px] text-slate-400">{new Date(err.created_at).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2">{err.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Check History */}
        <div>
          <h2 className="text-sm font-bold text-slate-700 mb-3">Check History (24h)</h2>
          {recentChecks.length === 0 ? (
            <p className="text-xs text-slate-400">No check history yet</p>
          ) : (
            <div className="space-y-2">
              {recentChecks.map((chk) => (
                <div key={chk.id} className={`border rounded-lg p-3 ${chk.title.includes('All Clear') ? 'border-green-100 bg-green-50/50' : 'border-yellow-100 bg-yellow-50/50'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-semibold ${chk.title.includes('All Clear') ? 'text-green-700' : 'text-yellow-700'}`}>{chk.title}</span>
                    <span className="text-[10px] text-slate-400">{new Date(chk.created_at).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-3 whitespace-pre-wrap">{chk.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
