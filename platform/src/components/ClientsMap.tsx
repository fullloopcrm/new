'use client'
import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { geocodeAddressesCached, rejectOutliers } from '@/lib/geo-cache'

interface ClientMarker {
  id: string
  name: string
  address: string
  lat?: number | null
  lng?: number | null
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
  const [noAddressCount, setNoAddressCount] = useState(0)
  const [unresolvedCount, setUnresolvedCount] = useState(0)

  useEffect(() => { setMounted(true) }, [])

  // Every client passed in should end up plotted or explicitly accounted
  // for — clients used to vanish off this map with zero indication why
  // (no address on file, or the address failed to geocode). Persisted
  // lat/lng (backfilled server-side) is trusted first; only clients missing
  // that go through the shared cached geocoder, and outliers (bad geocodes
  // landing states away from the rest of the client base) get filtered the
  // same way the other maps in this app already do.
  //
  // `cancelled` is local to this specific effect run, not a shared ref — a
  // shared ref gets reset to false by the NEXT run's setup, which lets a
  // stale, still in-flight run's completion handler sail past its own
  // "am I cancelled" check and overwrite fresher state with a partial
  // result. That produced a real incident: a live tenant map showed 21 of
  // 58 clients with an "unresolved: 0" count that didn't add up, because
  // an old run's incomplete batch clobbered a newer, more complete one.
  useEffect(() => {
    let cancelled = false

    async function geocodeClients() {
      setLoading(true)
      const withCoords: GeocodedClient[] = []
      const noPersistedCoords: ClientMarker[] = []
      let noAddress = 0

      for (const client of clients) {
        if (client.lat != null && client.lng != null) {
          withCoords.push({ ...client, lat: client.lat, lng: client.lng })
        } else if (client.address?.trim()) {
          noPersistedCoords.push(client)
        } else {
          noAddress++
        }
      }
      setNoAddressCount(noAddress)

      // Persisted coords aren't guaranteed correct — this tenant's own data
      // had clients with DB-stored lat/lng landing states away (a stale bad
      // geocode written once and never re-checked). Trusting them blindly
      // would put those bad pins on the map permanently; silently dropping
      // them without re-geocoding would just as silently erase real clients
      // from both the map AND the "not shown" count, which is exactly the
      // gap that made a live tenant's numbers not add up (20 shown + 6
      // explained out of 58, with 32 outlier-rejected clients uncounted).
      // So a persisted-coord rejection re-enters the geocode queue by
      // address instead of just vanishing.
      const validPersisted = rejectOutliers(withCoords)
      const validIds = new Set(validPersisted.map((c) => c.id))
      const needsGeocode: ClientMarker[] = [
        ...noPersistedCoords,
        ...withCoords.filter((c) => !validIds.has(c.id)),
      ]

      setGeocoded(validPersisted)

      if (needsGeocode.length === 0) {
        setUnresolvedCount(0)
        setLoading(false)
        return
      }

      setProgress({ done: 0, total: needsGeocode.length })

      const addresses = needsGeocode.map((c) => c.address.trim())
      const resolved = await geocodeAddressesCached(addresses, (partial) => {
        if (cancelled) return
        const results = [...validPersisted]
        for (const client of needsGeocode) {
          const coords = partial[client.address.trim()]
          if (coords) results.push({ ...client, ...coords })
        }
        setGeocoded(rejectOutliers(results))
        setProgress({ done: Object.keys(partial).length, total: needsGeocode.length })
      })

      if (!cancelled) {
        setUnresolvedCount(needsGeocode.filter((c) => !resolved[c.address.trim()]).length)
        setLoading(false)
      }
    }

    if (mounted && clients.length > 0) {
      geocodeClients()
    } else {
      setGeocoded([])
      setNoAddressCount(0)
      setUnresolvedCount(0)
      setLoading(false)
    }

    return () => { cancelled = true }
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

  const missing = noAddressCount + unresolvedCount

  return (
    <div className="relative">
      <div className="flex items-center justify-between px-1 pb-1.5 text-xs text-gray-500">
        <span>
          Showing <strong className="text-gray-700">{geocoded.length}</strong> of{' '}
          <strong className="text-gray-700">{clients.length}</strong> clients on the map
        </span>
        {!loading && missing > 0 && (
          <span className="text-amber-600" title={`${noAddressCount} have no address on file · ${unresolvedCount} couldn't be located from their address`}>
            {missing} not shown ({noAddressCount} no address, {unresolvedCount} unresolved)
          </span>
        )}
      </div>
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
