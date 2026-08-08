'use client'

/**
 * Tenant-agnostic team coverage heat map.
 *
 * Driven by the tenant's ServiceArea (see lib/service-area.ts):
 *  - local    → leaflet pin map (fit to team) + per-zone coverage cards.
 *               NYC tenants keep the original borough polygons; other local
 *               tenants get pins + zone counts without NYC-specific overlays.
 *  - national → leaflet pin map (US view) + per-state coverage cards showing
 *               where team lives, flagging service-area states with no/thin
 *               coverage so the owner sees where to recruit.
 *
 * Replaces the NYC-hardcoded CoverageMap for the shared team page. All data is
 * real: team members are plotted from home_latitude/home_longitude.
 */

import { useEffect, useMemo, useState } from 'react'
import type { ServiceArea } from '@/lib/service-area'
import { stateName, isStateScoped } from '@/lib/service-area'
import { geocodeAddressesCached, rejectOutliers } from '@/lib/geo-cache'

interface Member {
  id: string
  name: string
  lat: number | null
  lng: number | null
  address: string | null
  service_zones: string[]
  has_car: boolean
  state: string | null
}

interface Applicant {
  id: string
  name: string
  lat: number | null
  lng: number | null
  address: string | null
}

interface ClientPin {
  id: string
  name: string
  lat: number
  lng: number
  address: string
}

// NYC borough overlays — only drawn when the tenant uses the NYC zone preset.
const ZONE_COLORS: Record<string, string> = {
  manhattan_downtown: '#ef4444', manhattan_midtown: '#f59e0b', manhattan_uptown: '#8b5cf6',
  brooklyn: '#3b82f6', queens: '#10b981', bronx: '#ec4899', staten_island: '#6b7280',
  long_island: '#14b8a6', nj_hudson: '#f97316',
}

const PALETTE = ['#D946A8', '#2563EB', '#EAB308', '#F97316', '#A855F7', '#DC2626', '#06B6D4', '#14B8A6', '#10b981']
function colorForKey(key: string): string {
  if (ZONE_COLORS[key]) return ZONE_COLORS[key]
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  return PALETTE[h % PALETTE.length]
}

export default function TeamCoverageMap({ serviceArea }: { serviceArea: ServiceArea }) {
  const [members, setMembers] = useState<Member[]>([])
  const [applicants, setApplicants] = useState<Applicant[]>([])
  const [clients, setClients] = useState<ClientPin[]>([])
  const [loading, setLoading] = useState(true)
  const [geocoding, setGeocoding] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [totalActiveMembers, setTotalActiveMembers] = useState(0)
  const [totalApplicants, setTotalApplicants] = useState(0)
  const [totalClients, setTotalClients] = useState(0)

  // Scoped the same way the rest of the page reads it: local tenants operate
  // in one metro (a distant match is almost certainly a bad geocode), but
  // national/regional tenants legitimately have team spread across states —
  // rejecting those as "outliers" would silently erase real, correct pins.
  const stateBased = isStateScoped(serviceArea.scope)

  useEffect(() => {
    let alive = true

    async function load() {
      const [m, c, a] = await Promise.all([
        fetch('/api/cleaners').then((r) => (r.ok ? r.json() : [])).catch(() => []),
        // /api/clients defaults to 50 results with no limit param — this map
        // is meant to show the whole client base for context, not a page 1.
        // 1000 is the route's max; revisit if a tenant ever exceeds that.
        fetch('/api/clients?limit=1000').then((r) => (r.ok ? r.json() : { clients: [] })).catch(() => ({ clients: [] })),
        fetch('/api/team-applications').then((r) => (r.ok ? r.json() : [])).catch(() => []),
      ])
      if (!alive) return

      const rawMembers = (Array.isArray(m) ? m : []).filter((x: any) => x.active)
      const rawApplicants = (Array.isArray(a) ? a : (a?.applications || [])).filter((x: any) => x.status === 'pending')
      const clientRows = Array.isArray(c) ? c : (c?.clients || [])
      setTotalActiveMembers(rawMembers.length)
      setTotalApplicants(rawApplicants.length)

      const withCoords: Member[] = []
      const memberNeedsGeocode: any[] = []
      for (const x of rawMembers) {
        const lat = x.home_latitude != null ? Number(x.home_latitude) : null
        const lng = x.home_longitude != null ? Number(x.home_longitude) : null
        const member: Member = {
          id: x.id, name: x.name, lat, lng, address: x.address || null,
          service_zones: x.service_zones || [],
          has_car: x.has_car || false,
          state: (x.tax_state || stateFromAddress(x.address)) || null,
        }
        if (lat != null && lng != null) withCoords.push(member)
        else if (x.address?.trim()) memberNeedsGeocode.push({ ...member, rawAddress: x.address.trim() })
      }

      // Applicants have no persisted coordinate column at all — every one
      // with an address goes through the live geocoder.
      const applicantNeedsGeocode = rawApplicants
        .filter((x: any) => x.address?.trim())
        .map((x: any) => ({ id: x.id, name: x.name, address: x.address.trim() as string }))

      const clientsWithCoords: ClientPin[] = []
      const clientNeedsGeocode: any[] = []
      for (const x of clientRows) {
        if (x.latitude && x.longitude) {
          clientsWithCoords.push({ id: x.id, name: x.name, lat: Number(x.latitude), lng: Number(x.longitude), address: x.address || '' })
        } else if (x.address?.trim()) {
          clientNeedsGeocode.push({ id: x.id, name: x.name, rawAddress: x.address.trim() })
        }
      }
      setTotalClients(clientRows.length)

      setMembers(stateBased ? withCoords : rejectOutliers(withCoords as any) as Member[])
      setClients(stateBased ? clientsWithCoords : rejectOutliers(clientsWithCoords as any) as ClientPin[])
      setLoading(false)

      const addressesToGeocode = [
        ...memberNeedsGeocode.map((x) => x.rawAddress),
        ...applicantNeedsGeocode.map((x: { address: string }) => x.address),
        ...clientNeedsGeocode.map((x) => x.rawAddress),
      ]
      if (addressesToGeocode.length === 0) {
        setApplicants([])
        return
      }

      setGeocoding(true)
      const resolved = await geocodeAddressesCached(addressesToGeocode)
      if (!alive) return

      const geocodedMembers = memberNeedsGeocode
        .map((x) => resolved[x.rawAddress] ? { ...x, lat: resolved[x.rawAddress].lat, lng: resolved[x.rawAddress].lng } : null)
        .filter(Boolean) as Member[]
      setMembers((prev) => {
        const merged = [...prev, ...geocodedMembers]
        return stateBased ? merged : rejectOutliers(merged as any) as Member[]
      })

      const geocodedApplicants = applicantNeedsGeocode
        .map((x: { id: string; name: string; address: string }) =>
          resolved[x.address] ? { id: x.id, name: x.name, address: x.address, lat: resolved[x.address].lat, lng: resolved[x.address].lng } : null
        )
        .filter(Boolean) as Applicant[]
      setApplicants(stateBased ? geocodedApplicants : rejectOutliers(geocodedApplicants as any) as Applicant[])

      const geocodedClients = clientNeedsGeocode
        .map((x) => resolved[x.rawAddress] ? { id: x.id, name: x.name, address: x.rawAddress, lat: resolved[x.rawAddress].lat, lng: resolved[x.rawAddress].lng } : null)
        .filter(Boolean) as ClientPin[]
      setClients((prev) => {
        const merged = [...prev, ...geocodedClients]
        return stateBased ? merged : rejectOutliers(merged as any) as ClientPin[]
      })

      setGeocoding(false)
    }

    load()
    return () => { alive = false }
  }, [stateBased])

  // Coverage buckets: by state (regional/national) or by zone (local).
  const buckets = useMemo(() => {
    if (stateBased) {
      const wanted = serviceArea.states.includes('ALL')
        ? Array.from(new Set(members.map((m) => m.state).filter(Boolean) as string[]))
        : serviceArea.states
      return wanted.map((code) => ({
        id: code,
        label: stateName(code),
        count: members.filter((m) => m.state === code).length,
      }))
    }
    return serviceArea.zones.map((z) => ({
      id: z.id,
      label: z.label,
      count: members.filter((m) => m.service_zones.includes(z.id)).length,
    }))
  }, [stateBased, serviceArea, members])

  const gaps = buckets.filter((b) => b.count === 0)
  const thin = buckets.filter((b) => b.count === 1)
  const plotted = members.length
  const plottedApplicants = applicants.length

  if (loading) {
    return <div className="bg-gray-50 rounded-xl p-6 text-center text-gray-400 text-sm">Loading coverage map…</div>
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 mb-6 overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-3 text-xs text-gray-500">
        <span>
          Team: <strong className="text-gray-700">{plotted}</strong> of{' '}
          <strong className="text-gray-700">{totalActiveMembers}</strong> plotted
          {totalApplicants > 0 && (
            <>
              {' · '}Applicants: <strong className="text-gray-700">{plottedApplicants}</strong> of{' '}
              <strong className="text-gray-700">{totalApplicants}</strong> plotted
            </>
          )}
          {' · '}Clients: <strong className="text-gray-700">{clients.length}</strong> of{' '}
          <strong className="text-gray-700">{totalClients}</strong> plotted
        </span>
        {geocoding && <span className="text-amber-600">Locating addresses…</span>}
      </div>

      <div className="relative h-[400px] bg-gray-100 mt-2">
        <MapInner
          members={members}
          applicants={applicants}
          clients={clients}
          national={stateBased}
          selected={selected}
        />
        {plotted === 0 && plottedApplicants === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="bg-white/90 rounded-lg px-3 py-2 text-xs text-gray-500">
              No team locations yet — add team members with addresses to populate the map.
            </span>
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[#1E2A4A]">{stateBased ? 'State Coverage' : 'Zone Coverage'}</h3>
          {selected && (
            <button onClick={() => setSelected(null)} className="text-xs text-gray-500 hover:text-[#1E2A4A]">Show all</button>
          )}
        </div>

        <div className="flex items-center gap-4 mb-3 text-[11px] text-gray-500">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#1E2A4A] inline-block" />Active team</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full border-2 border-amber-500 bg-amber-100 inline-block" />Applicants</span>
        </div>

        {buckets.length === 0 && (
          <p className="text-xs text-gray-400">No service area configured yet. Set it in onboarding or Settings.</p>
        )}

        <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
          {buckets.map((b) => (
            <button
              key={b.id}
              onClick={() => setSelected(selected === b.id ? null : b.id)}
              className={`text-left px-3 py-2 rounded-lg border text-xs transition-all ${
                selected === b.id ? 'border-[#1E2A4A] bg-[#1E2A4A]/5'
                : b.count === 0 ? 'border-red-200 bg-red-50'
                : b.count === 1 ? 'border-yellow-200 bg-yellow-50'
                : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colorForKey(b.id) }} />
                <span className="font-medium text-[#1E2A4A] truncate">{b.label.replace('Manhattan — ', 'Mtn ')}</span>
              </div>
              <span className={`text-[10px] font-medium ${b.count === 0 ? 'text-red-600' : b.count === 1 ? 'text-yellow-600' : 'text-green-600'}`}>
                {b.count === 0 ? 'NO COVERAGE' : b.count === 1 ? '1 member' : `${b.count} members`}
              </span>
            </button>
          ))}
        </div>

        {gaps.length > 0 && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <p className="text-xs font-medium text-red-700">Need team: {gaps.map((g) => g.label.replace('Manhattan — ', '')).join(', ')}</p>
          </div>
        )}
        {thin.length > 0 && (
          <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
            <p className="text-xs font-medium text-yellow-700">Thin coverage (1): {thin.map((t) => t.label.replace('Manhattan — ', '')).join(', ')}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Lightweight US-state inference from a free-text address (last-resort when
// tax_state is unset). Matches a trailing ", XX" or ", XX 12345".
function stateFromAddress(address: string | null | undefined): string | null {
  if (!address) return null
  const m = address.toUpperCase().match(/,\s*([A-Z]{2})(?:\s+\d{5})?\s*$/)
  return m ? m[1] : null
}

function MapInner({ members, applicants, clients, national, selected }: {
  members: Member[]; applicants: Applicant[]; clients: ClientPin[]; national: boolean; selected: string | null
}) {
  const [L, setL] = useState<any>(null)
  const [mapRef, setMapRef] = useState<HTMLDivElement | null>(null)
  const [map, setMap] = useState<any>(null)

  useEffect(() => {
    import('leaflet').then((mod) => setL(mod.default || mod))
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link')
      link.id = 'leaflet-css'
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }
  }, [])

  // deps intentionally exclude `map`/`national`: `map` is only read here to
  // guard against re-creating an existing instance, not to react to its own
  // change — listing it made this effect's cleanup (`m.remove()`) fire right
  // after `setMap(m)` triggered the re-render, destroying the map a tick
  // after creating it and leaving `map` state pointed at a torn-down
  // instance. The next effect then called `.addTo(map)` on it, and Leaflet's
  // internal marker-pane appendChild threw on the undefined pane. `national`
  // only matters for the one-time initial center/zoom, not for re-runs.
  useEffect(() => {
    if (!L || !mapRef || map) return
    const center: [number, number] = national ? [39.5, -98.35] : [40.73, -73.94]
    const zoom = national ? 4 : 11
    const m = L.map(mapRef).setView(center, zoom)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(m)
    setMap(m)
    return () => { m.remove() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [L, mapRef])

  useEffect(() => {
    if (!L || !map || !map._container) return
    map.eachLayer((layer: any) => { if (layer._isMarker) map.removeLayer(layer) })

    clients.forEach((client) => {
      const mk = L.circleMarker([client.lat, client.lng], {
        radius: 4, fillColor: '#94a3b8', fillOpacity: 0.6, color: '#64748b', weight: 1,
      }).addTo(map)
      mk._isMarker = true
      mk.bindPopup(`<b>${client.name}</b><br/><span style="font-size:11px;color:#666">${client.address}</span>`)
    })

    const visible = members.filter((m) => m.lat != null && m.lng != null && (
      !selected || (national ? m.state === selected : m.service_zones.includes(selected))
    ))
    const pts: [number, number][] = []
    visible.forEach((m) => {
      const key = national ? (m.state || '') : (m.service_zones[0] || '')
      const color = key ? colorForKey(key) : '#1E2A4A'
      const mk = L.circleMarker([m.lat as number, m.lng as number], {
        radius: 10, fillColor: color, fillOpacity: 0.9, color: '#fff', weight: 2,
      }).addTo(map)
      mk._isMarker = true
      mk.bindPopup(`<b>${m.name}</b>${m.has_car ? ' 🚗' : ''}<br/><span style="font-size:11px">${national ? (m.state ? stateName(m.state) : 'Location unknown') : (m.service_zones.join(', ') || 'No zones')}</span>`)
      pts.push([m.lat as number, m.lng as number])
    })

    // Applicants render as a hollow amber ring — visually distinct from the
    // filled, zone-colored active-team dots so the two never get confused
    // at a glance.
    applicants.forEach((a) => {
      if (a.lat == null || a.lng == null) return
      const mk = L.circleMarker([a.lat, a.lng], {
        radius: 9, fillColor: '#fef3c7', fillOpacity: 0.9, color: '#d97706', weight: 3,
      }).addTo(map)
      mk._isMarker = true
      mk.bindPopup(`<b>${a.name}</b><br/><span style="font-size:11px;color:#d97706">Applicant</span>`)
      pts.push([a.lat, a.lng])
    })

    if (pts.length > 0) {
      try { map.fitBounds(L.latLngBounds(pts).pad(0.2)) } catch {}
    }
  }, [L, map, members, applicants, clients, national, selected])

  return <div ref={setMapRef} className="w-full h-full" />
}
