'use client'
import { useEffect, useState, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface ClientMarker {
  id: string
  name: string
  address: string
  status: 'potential' | 'new' | 'active' | 'inactive'
  totalBookings: number
  totalSpent: number
  lastBooking: string | null
  do_not_service: boolean
}

interface Props {
  clients: ClientMarker[]
  onClientClick?: (id: string) => void
  onClientDelete?: (id: string, name: string) => void
}

interface GeocodedClient extends ClientMarker {
  lat: number
  lng: number
}

const CACHE_KEY = 'fullloop_geocode_cache'

function loadGeoCache(): Record<string, { lat: number; lng: number }> {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function saveGeoCache(cache: Record<string, { lat: number; lng: number }>) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)) } catch {}
}

const createIcon = (color: string) => new L.DivIcon({
  className: 'custom-marker',
  html: `<div style="background: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12]
})

const icons = {
  potential: createIcon('#f59e0b'),
  new: createIcon('#3b82f6'),
  active: createIcon('#22c55e'),
  inactive: createIcon('#9ca3af'),
  dns: createIcon('#ef4444')
}

import { geocodeAddress } from '@/lib/geo'

function FitBounds({ clients }: { clients: GeocodedClient[] }) {
  const map = useMap()

  useEffect(() => {
    if (clients.length > 0) {
      const bounds = L.latLngBounds(clients.map(c => [c.lat, c.lng]))
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 })
    }
  }, [clients, map])

  return null
}

export default function ClientsMap({ clients, onClientClick, onClientDelete }: Props) {
  const [mounted, setMounted] = useState(false)
  const [geocoded, setGeocoded] = useState<GeocodedClient[]>([])
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const abortRef = useRef(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    abortRef.current = false

    async function geocodeClients() {
      setLoading(true)
      const cache = loadGeoCache()
      const results: GeocodedClient[] = []
      const needsGeocode: ClientMarker[] = []

      for (const client of clients) {
        if (!client.address) continue
        if (cache[client.address]) {
          results.push({ ...client, ...cache[client.address] })
        } else {
          needsGeocode.push(client)
        }
      }

      if (results.length > 0) {
        setGeocoded([...results])
      }

      if (needsGeocode.length === 0) {
        setGeocoded(results)
        setLoading(false)
        return
      }

      setProgress({ done: 0, total: needsGeocode.length })

      const BATCH_SIZE = 5
      for (let i = 0; i < needsGeocode.length; i += BATCH_SIZE) {
        if (abortRef.current) break
        const batch = needsGeocode.slice(i, i + BATCH_SIZE)
        const batchResults = await Promise.all(
          batch.map(async (client) => {
            const coords = await geocodeAddress(client.address)
            if (coords) {
              cache[client.address] = coords
              return { ...client, ...coords }
            }
            return null
          })
        )
        for (const r of batchResults) {
          if (r) results.push(r)
        }
        setGeocoded([...results])
        setProgress({ done: Math.min(i + BATCH_SIZE, needsGeocode.length), total: needsGeocode.length })
      }

      saveGeoCache(cache)
      setGeocoded(results)
      setLoading(false)
    }

    if (mounted && clients.length > 0) {
      geocodeClients()
    } else {
      setGeocoded([])
      setLoading(false)
    }

    return () => { abortRef.current = true }
  }, [clients, mounted])

  if (!mounted) {
    return <div className="h-[600px] bg-gray-100 rounded-lg flex items-center justify-center text-gray-500">Loading map...</div>
  }

  const center: [number, number] = [40.75, -73.95]
  const defaultZoom = 11

  const formatMoney = (cents: number) => '$' + (cents / 100).toFixed(0)

  const statusLabel: Record<string, string> = {
    potential: 'Potential',
    new: 'New',
    active: 'Active',
    inactive: 'Inactive'
  }

  const statusBadgeClass: Record<string, string> = {
    potential: 'bg-amber-100 text-amber-700',
    new: 'bg-blue-100 text-blue-700',
    active: 'bg-green-100 text-green-700',
    inactive: 'bg-gray-100 text-gray-600'
  }

  return (
    <div className="relative">
      {loading && progress.total > 0 && (
        <div className="absolute inset-0 bg-white bg-opacity-75 z-10 flex items-center justify-center rounded-lg">
          <p className="text-gray-500">Geocoding {progress.done}/{progress.total} new addresses...</p>
        </div>
      )}
      <MapContainer
        center={center}
        zoom={defaultZoom}
        style={{ height: '600px', width: '100%' }}
        scrollWheelZoom={true}
        className="rounded-lg"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {geocoded.length > 0 && <FitBounds clients={geocoded} />}
        {geocoded.map((client) => {
          const icon = client.do_not_service ? icons.dns : (icons[client.status] || icons.new)
          return (
            <Marker key={client.id} position={[client.lat, client.lng]} icon={icon}>
              <Popup>
                <div className="text-sm min-w-48">
                  <p className="font-bold text-base">{client.name}</p>
                  <p className="text-xs text-gray-400 mt-1">{client.address}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`inline-block text-xs px-2 py-1 rounded ${statusBadgeClass[client.status] || ''}`}>
                      {statusLabel[client.status] || client.status}
                    </span>
                    {client.do_not_service && (
                      <span className="inline-block text-xs px-2 py-1 rounded bg-red-600 text-white font-bold">DNS</span>
                    )}
                  </div>
                  <div className="flex gap-3 mt-2 text-xs text-gray-600">
                    <span>{client.totalBookings} bookings</span>
                    <span className="text-green-600 font-medium">{formatMoney(client.totalSpent)}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-3 pt-2 border-t border-gray-200">
                    {onClientClick && (
                      <button
                        onClick={() => onClientClick(client.id)}
                        className="text-xs text-blue-600 hover:underline font-medium"
                      >
                        Edit
                      </button>
                    )}
                    {onClientClick && onClientDelete && (
                      <span className="text-gray-300">|</span>
                    )}
                    {onClientDelete && (
                      <button
                        onClick={() => onClientDelete(client.id, client.name)}
                        className="text-xs text-red-600 hover:underline font-medium"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}
