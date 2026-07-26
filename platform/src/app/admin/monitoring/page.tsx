'use client'

import { useEffect, useState } from 'react'

interface CronStatus {
  name: string
  desc: string
  lastFired: string | null
  silenceMin: number | null
  maxSilenceMin: number
  healthy: boolean
}

interface StatusPayload {
  checkedAt: string
  crons: CronStatus[]
  comms: { failures24h: number; failures1h: number }
  selena: { errors24h: number }
  pipeline: { newLeads24h: number; newBookings24h: number; newLeads1h: number }
  monitorAlerts: {
    cronHealthAlerts24h: number
    commsMonitorAlerts24h: number
    lastCronHealthAlert: string | null
    lastCommsFailureAlert: string | null
  }
  errors: { total24h: number }
}

interface ErrorLog {
  id: string
  severity: string
  message: string
  route: string | null
  action: string | null
  tenant_id: string | null
  tenant_name: string | null
  metadata: Record<string, unknown> | null
  resolved: boolean | null
  resolved_at: string | null
  resolution_notes: string | null
  dismissed_at: string | null
  created_at: string
}

interface ErrorsPayload {
  logs: ErrorLog[]
  total: number
  page: number
  pageSize: number
}

interface AuditLog {
  id: string
  tenant_id: string | null
  tenant_name: string | null
  action: string
  entity_type: string
  entity_id: string | null
  user_id: string | null
  details: Record<string, unknown> | null
  created_at: string
}

interface AuditPayload {
  logs: AuditLog[]
  total: number
  page: number
  pageSize: number
}

function humanSilence(min: number | null): string {
  if (min === null) return 'never'
  if (min < 60) return `${min}m`
  if (min < 60 * 24) return `${Math.round(min / 60)}h`
  return `${Math.round(min / (60 * 24))}d`
}

function humanTs(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

const SEVERITIES = ['critical', 'high', 'medium', 'low'] as const

export default function MonitoringPage() {
  const [status, setStatus] = useState<StatusPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string>('')

  const [errors, setErrors] = useState<ErrorsPayload | null>(null)
  const [errorsLoading, setErrorsLoading] = useState(true)
  const [severityFilter, setSeverityFilter] = useState<string>('')
  const [resolvedFilter, setResolvedFilter] = useState<'false' | 'true' | ''>('false')
  const [page, setPage] = useState(0)
  const [busyId, setBusyId] = useState<string | null>(null)

  const [audit, setAudit] = useState<AuditPayload | null>(null)
  const [auditLoading, setAuditLoading] = useState(true)
  const [auditPage, setAuditPage] = useState(0)
  const [auditSensitiveOnly, setAuditSensitiveOnly] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/monitoring/status', { cache: 'no-store' })
      if (!res.ok) {
        setErr(`HTTP ${res.status}`)
      } else {
        setStatus(await res.json() as StatusPayload)
        setErr('')
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'fetch failed')
    }
    setLoading(false)
  }

  async function loadErrors() {
    setErrorsLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page) })
      if (severityFilter) params.set('severity', severityFilter)
      if (resolvedFilter) params.set('resolved', resolvedFilter)
      const res = await fetch(`/api/admin/monitoring/errors?${params}`, { cache: 'no-store' })
      if (res.ok) setErrors(await res.json() as ErrorsPayload)
    } catch {
      // Non-fatal — the cron table above still renders.
    }
    setErrorsLoading(false)
  }

  async function updateLog(id: string, action: 'resolve' | 'dismiss' | 'reopen') {
    setBusyId(id)
    try {
      await fetch('/api/admin/monitoring/errors', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      })
      await loadErrors()
    } finally {
      setBusyId(null)
    }
  }

  async function loadAudit() {
    setAuditLoading(true)
    try {
      const params = new URLSearchParams({ page: String(auditPage), sensitive_only: String(auditSensitiveOnly) })
      const res = await fetch(`/api/admin/monitoring/audit?${params}`, { cache: 'no-store' })
      if (res.ok) setAudit(await res.json() as AuditPayload)
    } catch {
      // Non-fatal — the rest of the dashboard still renders.
    }
    setAuditLoading(false)
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 60 * 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    loadErrors()
    const t = setInterval(loadErrors, 60 * 1000)
    return () => clearInterval(t)
  }, [severityFilter, resolvedFilter, page])

  useEffect(() => {
    loadAudit()
    const t = setInterval(loadAudit, 60 * 1000)
    return () => clearInterval(t)
  }, [auditPage, auditSensitiveOnly])

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Monitoring</h1>
        <button onClick={load} className="px-4 py-2 bg-black text-white rounded-lg text-sm">Refresh</button>
      </div>

      {loading && !status && <div className="text-gray-500">Loading…</div>}
      {err && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-4">Error: {err}</div>}

      {status && (
        <div className="space-y-6">
          <div className="text-xs text-gray-500">Checked: {humanTs(status.checkedAt)} ET · auto-refreshes every 60s</div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card title="Comms failures (1h)" value={status.comms.failures1h} warn={status.comms.failures1h > 0} />
            <Card title="Comms failures (24h)" value={status.comms.failures24h} warn={status.comms.failures24h > 5} />
            <Card title="Selena errors (24h)" value={status.selena.errors24h} warn={status.selena.errors24h > 0} />
            <Card title="Errors (24h)" value={status.errors.total24h < 0 ? 'n/a' : status.errors.total24h} warn={status.errors.total24h > 10} />
            <Card title="New leads (1h)" value={status.pipeline.newLeads1h} />
            <Card title="New leads (24h)" value={status.pipeline.newLeads24h} warn={status.pipeline.newLeads24h === 0} />
            <Card title="New bookings (24h)" value={status.pipeline.newBookings24h} />
            <Card title="Cron alerts (24h)" value={status.monitorAlerts.cronHealthAlerts24h} warn={status.monitorAlerts.cronHealthAlerts24h > 0} />
            <Card title="Comms alerts (24h)" value={status.monitorAlerts.commsMonitorAlerts24h} warn={status.monitorAlerts.commsMonitorAlerts24h > 0} />
            <Card title="Last cron alert" value={humanTs(status.monitorAlerts.lastCronHealthAlert)} warn={!!status.monitorAlerts.lastCronHealthAlert} />
          </div>

          <div>
            <h2 className="font-bold mb-3">Cron jobs</h2>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Job</th>
                    <th className="px-4 py-2">Last fired</th>
                    <th className="px-4 py-2">Silence</th>
                    <th className="px-4 py-2">Max allowed</th>
                  </tr>
                </thead>
                <tbody>
                  {status.crons.map(c => (
                    <tr key={c.name} className="border-t border-gray-100">
                      <td className="px-4 py-3">
                        <span className={`inline-block w-2.5 h-2.5 rounded-full ${c.healthy ? 'bg-green-500' : 'bg-red-500'}`}></span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{c.name}</div>
                        <div className="text-xs text-gray-500">{c.desc}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{humanTs(c.lastFired)}</td>
                      <td className={`px-4 py-3 ${c.healthy ? 'text-gray-600' : 'text-red-600 font-semibold'}`}>{humanSilence(c.silenceMin)}</td>
                      <td className="px-4 py-3 text-gray-500">{humanSilence(c.maxSilenceMin)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold">Errors &amp; Security</h2>
              <div className="flex items-center gap-2 text-sm">
                <select
                  value={severityFilter}
                  onChange={(e) => { setPage(0); setSeverityFilter(e.target.value) }}
                  className="border border-gray-200 rounded-lg px-2 py-1"
                >
                  <option value="">All severities</option>
                  {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select
                  value={resolvedFilter}
                  onChange={(e) => { setPage(0); setResolvedFilter(e.target.value as 'false' | 'true' | '') }}
                  className="border border-gray-200 rounded-lg px-2 py-1"
                >
                  <option value="false">Open</option>
                  <option value="true">Resolved</option>
                  <option value="">All</option>
                </select>
                <button onClick={loadErrors} className="px-3 py-1 bg-black text-white rounded-lg">Refresh</button>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-4 py-2">Severity</th>
                    <th className="px-4 py-2">Route</th>
                    <th className="px-4 py-2">Message</th>
                    <th className="px-4 py-2">Tenant</th>
                    <th className="px-4 py-2">When</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {errorsLoading && !errors && (
                    <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-500">Loading…</td></tr>
                  )}
                  {errors && errors.logs.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-500">Nothing to review.</td></tr>
                  )}
                  {errors?.logs.map(log => (
                    <tr key={log.id} className="border-t border-gray-100 align-top">
                      <td className="px-4 py-3">
                        <SeverityBadge severity={log.severity} />
                      </td>
                      <td className="px-4 py-3 text-gray-600">{log.route || '—'}</td>
                      <td className="px-4 py-3 text-gray-900 max-w-md">{log.message}</td>
                      <td className="px-4 py-3 text-gray-600">{log.tenant_name || (log.tenant_id ? log.tenant_id.slice(0, 8) : '—')}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{humanTs(log.created_at)}</td>
                      <td className="px-4 py-3">
                        {log.resolved ? (
                          <span className="text-green-700">Resolved</span>
                        ) : log.dismissed_at ? (
                          <span className="text-gray-400">Dismissed</span>
                        ) : (
                          <span className="text-red-600 font-medium">Open</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {!log.resolved && !log.dismissed_at ? (
                          <div className="flex gap-2">
                            <button
                              disabled={busyId === log.id}
                              onClick={() => updateLog(log.id, 'resolve')}
                              className="px-2 py-1 text-xs bg-green-600 text-white rounded disabled:opacity-50"
                            >
                              Resolve
                            </button>
                            <button
                              disabled={busyId === log.id}
                              onClick={() => updateLog(log.id, 'dismiss')}
                              className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded disabled:opacity-50"
                            >
                              Dismiss
                            </button>
                          </div>
                        ) : (
                          <button
                            disabled={busyId === log.id}
                            onClick={() => updateLog(log.id, 'reopen')}
                            className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded disabled:opacity-50"
                          >
                            Reopen
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {errors && errors.total > errors.pageSize && (
              <div className="flex items-center justify-between mt-2 text-sm text-gray-500">
                <span>{errors.total} total</span>
                <div className="flex gap-2">
                  <button disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))} className="px-2 py-1 border border-gray-200 rounded disabled:opacity-40">Prev</button>
                  <button disabled={(page + 1) * errors.pageSize >= errors.total} onClick={() => setPage(p => p + 1)} className="px-2 py-1 border border-gray-200 rounded disabled:opacity-40">Next</button>
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold">Admin Actions</h2>
              <div className="flex items-center gap-2 text-sm">
                <label className="flex items-center gap-1 text-gray-600">
                  <input
                    type="checkbox"
                    checked={auditSensitiveOnly}
                    onChange={(e) => { setAuditPage(0); setAuditSensitiveOnly(e.target.checked) }}
                  />
                  Sensitive only
                </label>
                <button onClick={loadAudit} className="px-3 py-1 bg-black text-white rounded-lg">Refresh</button>
              </div>
            </div>
            <div className="text-xs text-gray-500 mb-2">
              {auditSensitiveOnly
                ? 'Permission changes, deletions, GDPR exports/purges, mass sends — the same set that pings Telegram.'
                : 'Full admin-action history across every tenant.'}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-4 py-2">Action</th>
                    <th className="px-4 py-2">Entity</th>
                    <th className="px-4 py-2">Tenant</th>
                    <th className="px-4 py-2">By</th>
                    <th className="px-4 py-2">When</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLoading && !audit && (
                    <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500">Loading…</td></tr>
                  )}
                  {audit && audit.logs.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500">Nothing to show.</td></tr>
                  )}
                  {audit?.logs.map(log => (
                    <tr key={log.id} className="border-t border-gray-100 align-top">
                      <td className="px-4 py-3 font-mono text-xs text-gray-900">{log.action}</td>
                      <td className="px-4 py-3 text-gray-600">{log.entity_type}{log.entity_id ? ` (${log.entity_id.slice(0, 8)})` : ''}</td>
                      <td className="px-4 py-3 text-gray-600">{log.tenant_name || (log.tenant_id ? log.tenant_id.slice(0, 8) : '—')}</td>
                      <td className="px-4 py-3 text-gray-600">{log.user_id || '—'}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{humanTs(log.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {audit && audit.total > audit.pageSize && (
              <div className="flex items-center justify-between mt-2 text-sm text-gray-500">
                <span>{audit.total} total</span>
                <div className="flex gap-2">
                  <button disabled={auditPage === 0} onClick={() => setAuditPage(p => Math.max(0, p - 1))} className="px-2 py-1 border border-gray-200 rounded disabled:opacity-40">Prev</button>
                  <button disabled={(auditPage + 1) * audit.pageSize >= audit.total} onClick={() => setAuditPage(p => p + 1)} className="px-2 py-1 border border-gray-200 rounded disabled:opacity-40">Next</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function SeverityBadge({ severity }: { severity: string }) {
  const styles: Record<string, string> = {
    critical: 'bg-red-100 text-red-800',
    high: 'bg-orange-100 text-orange-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-gray-100 text-gray-600',
  }
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${styles[severity] || styles.low}`}>
      {severity}
    </span>
  )
}

function Card({ title, value, warn }: { title: string; value: string | number; warn?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${warn ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
      <div className="text-xs uppercase tracking-wide text-gray-500">{title}</div>
      <div className={`text-2xl font-bold mt-1 ${warn ? 'text-red-700' : 'text-gray-900'}`}>{value}</div>
    </div>
  )
}
