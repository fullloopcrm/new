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

export default function MonitoringPage() {
  const [status, setStatus] = useState<StatusPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string>('')

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

  useEffect(() => {
    load()
    const t = setInterval(load, 60 * 1000)
    return () => clearInterval(t)
  }, [])

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
        </div>
      )}
    </div>
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
