'use client'

import { useEffect, useState } from 'react'
import { SERVICE_ZONES } from '@/lib/service-zones'

interface CleanerPin {
  id: string
  name: string
  lat: number
  lng: number
  service_zones: string[]
  has_car: boolean
  working_days: string[]
  max_jobs_per_day: number | null
  active: boolean
}

interface ClientPin {
  id: string
  name: string
  lat: number
  lng: number
  address: string
}

const ZONE_COLORS: Record<string, string> = {
  manhattan_downtown: '#ef4444',
  manhattan_midtown: '#f59e0b',
  manhattan_uptown: '#8b5cf6',
  brooklyn: '#3b82f6',
  queens: '#10b981',
  bronx: '#ec4899',
  staten_island: '#6b7280',
  long_island: '#14b8a6',
  nj_hudson: '#f97316',
}

export default function CoverageMap() {
  const [cleaners, setCleaners] = useState<CleanerPin[]>([])
  const [clients, setClients] = useState<ClientPin[]>([])
  const [loading, setLoading] = useState(true)
  const [mapReady, setMapReady] = useState(false)
  const [selectedZone, setSelectedZone] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const [cleanerRes, clientRes] = await Promise.all([
      fetch('/api/team-members'),
      fetch('/api/clients'),
    ])
    if (cleanerRes.ok) {
      const data = await cleanerRes.json()
      setCleaners(data.filter((c: any) => c.active && c.home_latitude && c.home_longitude).map((c: any) => ({
        id: c.id, name: c.name, lat: Number(c.home_latitude), lng: Number(c.home_longitude),
        service_zones: c.service_zones || [], has_car: c.has_car || false,
        working_days: c.working_days || [], max_jobs_per_day: c.max_jobs_per_day,
        active: c.active,
      })))
    }
    if (clientRes.ok) {
      const data = await clientRes.json()
      setClients(data.filter((c: any) => c.latitude && c.longitude).map((c: any) => ({
        id: c.id, name: c.name, lat: Number(c.latitude), lng: Number(c.longitude), address: c.address || '',
      })))
    }
    setLoading(false)
    setMapReady(true)
  }

  // Count cleaners per zone
  const zoneCoverage = SERVICE_ZONES.map(zone => {
    const count = cleaners.filter(c => c.service_zones.includes(zone.id)).length
    return { ...zone, count }
  })

  const gapZones = zoneCoverage.filter(z => z.count === 0)
  const thinZones = zoneCoverage.filter(z => z.count === 1)

  if (loading) return <div className="bg-gray-50 rounded-xl p-6 text-center text-gray-400 text-sm">Loading coverage map...</div>

  return (
    <div className="bg-white rounded-xl border border-gray-200 mb-6 overflow-hidden">
      {/* Map */}
      <div className="relative h-[400px] bg-gray-100">
        {mapReady && <MapInner cleaners={cleaners} clients={clients} selectedZone={selectedZone} />}
      </div>

      {/* Zone Coverage Grid */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[#1E2A4A]">Zone Coverage</h3>
          {selectedZone && (
            <button onClick={() => setSelectedZone(null)} className="text-xs text-gray-500 hover:text-[#1E2A4A]">Show all</button>
          )}
        </div>
        <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
          {zoneCoverage.map(zone => (
            <button
              key={zone.id}
              onClick={() => setSelectedZone(selectedZone === zone.id ? null : zone.id)}
              className={`text-left px-3 py-2 rounded-lg border text-xs transition-all ${
                selectedZone === zone.id ? 'border-[#1E2A4A] bg-[#1E2A4A]/5' :
                zone.count === 0 ? 'border-red-200 bg-red-50' :
                zone.count === 1 ? 'border-yellow-200 bg-yellow-50' :
                'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ZONE_COLORS[zone.id] || '#666' }} />
                <span className="font-medium text-[#1E2A4A] truncate">{zone.label.replace('Manhattan — ', 'Mtn ')}</span>
              </div>
              <span className={`text-[10px] font-medium ${zone.count === 0 ? 'text-red-600' : zone.count === 1 ? 'text-yellow-600' : 'text-green-600'}`}>
                {zone.count === 0 ? 'NO COVERAGE' : zone.count === 1 ? '1 cleaner' : `${zone.count} cleaners`}
              </span>
              {zone.count > 0 && (
                <div className="mt-0.5">
                  {cleaners.filter(c => c.service_zones.includes(zone.id)).map(c => (
                    <p key={c.id} className="text-[9px] text-gray-500 truncate">{c.name}{c.has_car ? ' 🚗' : ''}</p>
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Gap alerts */}
        {gapZones.length > 0 && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <p className="text-xs font-medium text-red-700">Need cleaners: {gapZones.map(z => z.label.replace('Manhattan — ', '')).join(', ')}</p>
          </div>
        )}
        {thinZones.length > 0 && (
          <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
            <p className="text-xs font-medium text-yellow-700">Thin coverage (1 cleaner): {thinZones.map(z => z.label.replace('Manhattan — ', '')).join(', ')}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Leaflet map — dynamic import to avoid SSR issues
function MapInner({ cleaners, clients, selectedZone }: { cleaners: CleanerPin[]; clients: ClientPin[]; selectedZone: string | null }) {
  const [L, setL] = useState<any>(null)
  const [mapRef, setMapRef] = useState<HTMLDivElement | null>(null)
  const [map, setMap] = useState<any>(null)

  useEffect(() => {
    import('leaflet').then(mod => {
      setL(mod.default || mod)
    })
    // Add leaflet CSS
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
    const m = L.map(mapRef).setView([40.7300, -73.9400], 12)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
    }).addTo(m)
    setMap(m)
    return () => { m.remove() }
  }, [L, mapRef])

  useEffect(() => {
    if (!L || !map) return

    // Clear existing layers
    map.eachLayer((layer: any) => {
      if (layer._isMarker || layer._isZone) map.removeLayer(layer)
    })

    // Zone overlays — proper NYC boundaries
    const ZONE_POLYGONS: Record<string, [number, number][]> = {
      manhattan_downtown: [
        [40.6995, -74.0205], [40.7005, -73.9710], [40.7190, -73.9710],
        [40.7510, -73.9680], [40.7510, -74.0090], [40.7090, -74.0205],
      ],
      manhattan_midtown: [
        [40.7510, -74.0090], [40.7510, -73.9680], [40.7530, -73.9670],
        [40.7750, -73.9550], [40.7855, -73.9430], [40.7900, -73.9530],
        [40.7900, -73.9740], [40.7700, -73.9920], [40.7550, -74.0010],
      ],
      manhattan_uptown: [
        [40.7900, -73.9740], [40.7900, -73.9350], [40.7950, -73.9290],
        [40.8100, -73.9230], [40.8400, -73.9100], [40.8600, -73.9120],
        [40.8790, -73.9070], [40.8790, -73.9270], [40.8680, -73.9350],
        [40.8400, -73.9430], [40.8100, -73.9580], [40.7950, -73.9680],
      ],
      brooklyn: [
        [40.5700, -74.0420], [40.5700, -73.8330], [40.6390, -73.8330],
        [40.6700, -73.8550], [40.6940, -73.8860], [40.7100, -73.9200],
        [40.7100, -73.9710], [40.6950, -74.0420],
      ],
      queens: [
        [40.7100, -73.9200], [40.6940, -73.8860], [40.6700, -73.8550],
        [40.6390, -73.8330], [40.6390, -73.7000], [40.7200, -73.7000],
        [40.8000, -73.7000], [40.8000, -73.7950], [40.7850, -73.8400],
        [40.7630, -73.8700], [40.7450, -73.8900],
      ],
      bronx: [
        [40.7950, -73.9290], [40.7900, -73.9060], [40.8000, -73.8500],
        [40.8000, -73.7900], [40.8800, -73.7900], [40.9150, -73.8300],
        [40.9150, -73.9070], [40.8790, -73.9070], [40.8600, -73.9120],
        [40.8400, -73.9100], [40.8100, -73.9230],
      ],
      staten_island: [
        [40.4960, -74.2550], [40.4960, -74.0530], [40.5700, -74.0530],
        [40.6500, -74.0530], [40.6500, -74.2550],
      ],
      nj_hudson: [
        [40.7050, -74.0900], [40.7050, -74.0250], [40.7350, -74.0100],
        [40.7600, -74.0050], [40.7800, -74.0200], [40.7900, -74.0350],
        [40.7900, -74.0900],
      ],
    }

    const zonesToShow = selectedZone ? [selectedZone] : Object.keys(ZONE_POLYGONS)
    zonesToShow.forEach(zoneId => {
      const coords = ZONE_POLYGONS[zoneId]
      if (!coords) return
      const color = ZONE_COLORS[zoneId] || '#666'
      const hasCleaners = cleaners.some(c => c.service_zones.includes(zoneId))
      const polygon = L.polygon(coords, {
        color,
        fillColor: color,
        fillOpacity: hasCleaners ? 0.15 : 0.30,
        weight: hasCleaners ? 2 : 3,
        dashArray: hasCleaners ? undefined : '8,6',
      }).addTo(map)
      polygon._isZone = true
      const zone = SERVICE_ZONES.find(z => z.id === zoneId)
      const count = cleaners.filter(c => c.service_zones.includes(zoneId)).length
      polygon.bindPopup(`<b>${zone?.label || zoneId}</b><br/>${count} cleaner${count !== 1 ? 's' : ''}${count === 0 ? ' — <span style="color:red">NEED COVERAGE</span>' : ''}`)
    })

    // Filter by selected zone
    const filteredCleaners = selectedZone
      ? cleaners.filter(c => c.service_zones.includes(selectedZone))
      : cleaners

    const filteredClients = selectedZone
      ? clients // show all clients, color by zone
      : clients

    // Client pins (small gray dots)
    filteredClients.forEach(client => {
      const marker = L.circleMarker([client.lat, client.lng], {
        radius: 4, fillColor: '#94a3b8', fillOpacity: 0.6, color: '#64748b', weight: 1,
      }).addTo(map)
      marker._isMarker = true
      marker.bindPopup(`<b>${client.name}</b><br/><span style="font-size:11px;color:#666">${client.address}</span>`)
    })

    // Cleaner pins (large colored markers)
    filteredCleaners.forEach(cleaner => {
      const color = cleaner.service_zones[0] ? (ZONE_COLORS[cleaner.service_zones[0]] || '#1E2A4A') : '#1E2A4A'
      const marker = L.circleMarker([cleaner.lat, cleaner.lng], {
        radius: 10, fillColor: color, fillOpacity: 0.9, color: '#fff', weight: 2,
      }).addTo(map)
      marker._isMarker = true

      const zones = cleaner.service_zones.map(z => SERVICE_ZONES.find(sz => sz.id === z)?.label || z).join(', ')
      const days = cleaner.working_days.length > 0 ? cleaner.working_days.join(', ') : 'Not set'
      marker.bindPopup(`<b>${cleaner.name}</b>${cleaner.has_car ? ' 🚗' : ''}<br/><span style="font-size:11px">Zones: ${zones || 'None'}</span><br/><span style="font-size:11px">Days: ${days}</span><br/><span style="font-size:11px">Max: ${cleaner.max_jobs_per_day || '∞'} jobs/day</span>`)
    })
  }, [L, map, cleaners, clients, selectedZone])

  return <div ref={setMapRef} className="w-full h-full" />
}
