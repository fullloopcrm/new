'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

type Stop = {
  booking_id: string
  client_id?: string | null
  client_name?: string | null
  address: string
  lat: number
  lng: number
  order?: number
  eta_seconds_from_start?: number
  distance_meters_from_prev?: number
  duration_minutes?: number
  notes?: string | null
}

type Route = {
  id: string
  team_member_id: string | null
  route_date: string
  status: string
  start_address: string | null
  start_latitude: number | null
  start_longitude: number | null
  end_latitude: number | null
  end_longitude: number | null
  stops: Stop[]
  total_distance_meters: number | null
  total_duration_seconds: number | null
  total_stops: number
  optimized_at: string | null
  published_at: string | null
  team_members: { id: string; name: string | null; phone: string | null } | null
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  optimized: 'bg-violet-50 text-violet-600',
  published: 'bg-blue-50 text-blue-700',
  started: 'bg-amber-50 text-amber-700',
  completed: 'bg-green-50 text-green-700',
  cancelled: 'bg-red-50 text-red-600',
}

function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatMiles(m: number | null): string {
  if (!m) return '—'
  return `${(m / 1609.344).toFixed(1)} mi`
}

function formatDuration(sec: number | null): string {
  if (!sec) return '—'
  const h = Math.floor(sec / 3600)
  const m = Math.round((sec % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export default function RoutesPage() {
  const [date, setDate] = useState(today())
  const [routes, setRoutes] = useState<Route[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    fetch(`/api/routes?date=${date}`)
      .then(r => r.json())
      .then(data => { setRoutes(data.routes || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [date])

  useEffect(() => { load() }, [load])

  async function autoBuild() {
    setBusy('auto'); setErr(''); setMsg('')
    try {
      const res = await fetch('/api/routes/auto-build', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setMsg(`Built ${data.routes_created} route${data.routes_created === 1 ? '' : 's'} from ${data.bookings} bookings`)
      load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed')
    }
    setBusy('')
  }

  async function optimizeOne(id: string) {
    setBusy(`opt-${id}`); setErr(''); setMsg('')
    try {
      const res = await fetch(`/api/routes/${id}/optimize`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed')
    }
    setBusy('')
  }

  async function publishOne(id: string) {
    setBusy(`pub-${id}`); setErr(''); setMsg('')
    try {
      const res = await fetch(`/api/routes/${id}/publish`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setMsg('Route sent to team member')
      load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed')
    }
    setBusy('')
  }

  async function deleteOne(id: string) {
    if (!confirm('Delete this route?')) return
    setBusy(`del-${id}`); setErr('')
    try {
      const res = await fetch(`/api/routes/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed')
      load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed')
    }
    setBusy('')
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <Link href="/dashboard/sales" className="text-xs text-slate-500 hover:underline">← Sales</Link>
          <h1 className="font-heading text-2xl font-bold text-slate-900 mt-1">Routes</h1>
          <p className="text-sm text-slate-500">Auto-build and optimize daily routes per team member.</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
          <button
            onClick={autoBuild}
            disabled={!!busy}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {busy === 'auto' ? 'Building…' : 'Auto-build from bookings'}
          </button>
        </div>
      </div>

      {msg && <div className="mb-3 p-2 rounded bg-green-50 border border-green-200 text-green-700 text-sm">{msg}</div>}
      {err && <div className="mb-3 p-2 rounded bg-red-50 border border-red-200 text-red-700 text-sm">{err}</div>}

      {loading ? (
        <div className="p-10 text-center text-slate-400 text-sm">Loading…</div>
      ) : routes.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <p className="text-slate-500 mb-3">No routes for {new Date(date).toLocaleDateString()}.</p>
          <p className="text-xs text-slate-400">
            Click &quot;Auto-build from bookings&quot; to generate routes from scheduled bookings with geocoded clients.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {routes.map(r => {
            const tmName = r.team_members?.name || 'Unassigned'
            const missingCoords = (r.stops || []).filter(s => !s.lat || !s.lng).length
            return (
              <div key={r.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between flex-wrap gap-3">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="font-heading font-semibold text-slate-900">{tmName}</h2>
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_COLORS[r.status] || 'bg-slate-100 text-slate-500'}`}>
                        {r.status}
                      </span>
                    </div>
                    <div className="flex gap-4 mt-1 text-xs text-slate-500">
                      <span>{r.total_stops} stop{r.total_stops === 1 ? '' : 's'}</span>
                      <span>{formatMiles(r.total_distance_meters)}</span>
                      <span>~{formatDuration(r.total_duration_seconds)}</span>
                      {missingCoords > 0 && <span className="text-amber-600">⚠ {missingCoords} unlocated</span>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => optimizeOne(r.id)}
                      disabled={!!busy || r.stops.length === 0}
                      className="px-3 py-1.5 text-xs font-medium rounded bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50"
                    >
                      {busy === `opt-${r.id}` ? 'Optimizing…' : r.optimized_at ? 'Re-optimize' : 'Optimize'}
                    </button>
                    {r.team_member_id && r.team_members?.phone && (
                      <button
                        onClick={() => publishOne(r.id)}
                        disabled={!!busy || r.stops.length === 0}
                        className="px-3 py-1.5 text-xs font-medium rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {busy === `pub-${r.id}` ? 'Sending…' : r.published_at ? 'Re-send SMS' : 'Send to team'}
                      </button>
                    )}
                    <button
                      onClick={() => deleteOne(r.id)}
                      disabled={!!busy}
                      className="px-3 py-1.5 text-xs font-medium rounded bg-white border border-red-200 text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {r.stops.length === 0 ? (
                  <p className="p-5 text-center text-sm text-slate-400">No stops</p>
                ) : (
                  <ol className="divide-y divide-slate-100">
                    {r.stops.map((s, i) => (
                      <li key={s.booking_id} className="px-5 py-3 flex items-start gap-4">
                        <span className="w-7 h-7 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900">{s.client_name || 'Stop'}</p>
                          <p className="text-xs text-slate-500 truncate">{s.address}</p>
                          {s.notes && <p className="text-xs text-amber-700 mt-0.5">{s.notes}</p>}
                        </div>
                        <div className="text-right text-xs text-slate-500 flex-shrink-0">
                          {s.distance_meters_from_prev != null && (
                            <p>{(s.distance_meters_from_prev / 1609.344).toFixed(1)} mi</p>
                          )}
                          {s.eta_seconds_from_start != null && (
                            <p>+{formatDuration(s.eta_seconds_from_start)}</p>
                          )}
                          {s.lat && s.lng && (
                            <a
                              href={`https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}&travelmode=driving`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-teal-600 hover:underline"
                            >
                              Navigate →
                            </a>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
