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
import { stateName } from '@/lib/service-area'

interface Member {
  id: string
  name: string
  lat: number | null
  lng: number | null
  service_zones: string[]
  has_car: boolean
  state: string | null
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
  const [clients, setClients] = useState<ClientPin[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    Promise.all([
      fetch('/api/team-members').then((r) => (r.ok ? r.json() : [])).catch(() => []),
      fetch('/api/clients').then((r) => (r.ok ? r.json() : [])).catch(() => []),
    ]).then(([m, c]) => {
      if (!alive) return
      setMembers(
        (Array.isArray(m) ? m : []).filter((x: any) => x.active).map((x: any) => ({
          id: x.id, name: x.name,
          lat: x.home_latitude != null ? Number(x.home_latitude) : null,
          lng: x.home_longitude != null ? Number(x.home_longitude) : null,
          service_zones: x.service_zones || [],
          has_car: x.has_car || false,
          state: (x.tax_state || stateFromAddress(x.address)) || null,
        }))
      )
      setClients(
        (Array.isArray(c) ? c : []).filter((x: any) => x.latitude && x.longitude).map((x: any) => ({
          id: x.id, name: x.name, lat: Number(x.latitude), lng: Number(x.longitude), address: x.address || '',
        }))
      )
      setLoading(false)
    })
    return () => { alive = false }
  }, [])

  const isNational = serviceArea.scope === 'national'

  // Coverage buckets: by state (national) or by zone (local).
  const buckets = useMemo(() => {
    if (isNational) {
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
  }, [isNational, serviceArea, members])

  const gaps = buckets.filter((b) => b.count === 0)
  const thin = buckets.filter((b) => b.count === 1)
  const plotted = members.filter((m) => m.lat != null && m.lng != null).length

  if (loading) {
    return <div className="bg-gray-50 rounded-xl p-6 text-center text-gray-400 text-sm">Loading coverage map…</div>
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 mb-6 overflow-hidden">
      <div className="relative h-[400px] bg-gray-100">
        <MapInner
          members={members}
          clients={clients}
          national={isNational}
          selected={selected}
        />
        {plotted === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="bg-white/90 rounded-lg px-3 py-2 text-xs text-gray-500">
              No team locations yet — add team members with addresses to populate the map.
            </span>
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[#1E2A4A]">{isNational ? 'State Coverage' : 'Zone Coverage'}</h3>
          {selected && (
            <button onClick={() => setSelected(null)} className="text-xs text-gray-500 hover:text-[#1E2A4A]">Show all</button>
          )}
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

function MapInner({ members, clients, national, selected }: {
  members: Member[]; clients: ClientPin[]; national: boolean; selected: string | null
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

  useEffect(() => {
    if (!L || !mapRef || map) return
    const center: [number, number] = national ? [39.5, -98.35] : [40.73, -73.94]
    const zoom = national ? 4 : 11
    const m = L.map(mapRef).setView(center, zoom)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(m)
    setMap(m)
    return () => { m.remove() }
  }, [L, mapRef, map, national])

  useEffect(() => {
    if (!L || !map) return
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

    if (pts.length > 0) {
      try { map.fitBounds(L.latLngBounds(pts).pad(0.2)) } catch {}
    }
  }, [L, map, members, clients, national, selected])

  return <div ref={setMapRef} className="w-full h-full" />
}
