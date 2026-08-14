'use client'
import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { crewNames, type CrewRow } from '@/lib/crew'

interface MapJob {
  id: string
  start_time: string
  status: string
  service_type: string
  clients: { name: string; address: string; latitude?: number | null; longitude?: number | null } | null
  team_members: { name: string } | null
  booking_team_members?: CrewRow[] | null
}

interface Props {
  jobs: MapJob[]
}

interface GeocodedJob extends MapJob {
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
  scheduled: createIcon('#3b82f6'),
  completed: createIcon('#22c55e'),
  in_progress: createIcon('#eab308'),
  cancelled: createIcon('#ef4444')
}

import { geocodeAddressesCached, rejectOutliers } from '@/lib/geo-cache'
import { naiveToAnchoredDate } from '@/lib/naive-time'

export default function DashboardMap({ jobs }: Props) {
  const [mounted, setMounted] = useState(false)
  const [geocodedJobs, setGeocodedJobs] = useState<GeocodedJob[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    async function geocodeJobs() {
      setLoading(true)

      // Jobs whose client already carries persisted coords (from clients/
      // client_properties in the DB) skip geocoding entirely — except any
      // that look like bad historical data (see rejectOutliers), which get
      // treated as unresolved and re-geocoded instead of trusted as-is.
      const candidates: (MapJob & { lat: number; lng: number })[] = []
      const noPersistedCoords: MapJob[] = []
      for (const job of jobs) {
        const lat = job.clients?.latitude
        const lng = job.clients?.longitude
        if (lat != null && lng != null) candidates.push({ ...job, lat, lng })
        else if (job.clients?.address) noPersistedCoords.push(job)
      }
      const validCandidates = rejectOutliers(candidates)
      const validIds = new Set(validCandidates.map(c => c.id))
      const withCoords: GeocodedJob[] = validCandidates
      const needsGeocode: MapJob[] = [
        ...noPersistedCoords,
        ...candidates.filter(c => !validIds.has(c.id)).filter(c => c.clients?.address),
      ]
      setGeocodedJobs(withCoords)

      if (needsGeocode.length === 0) {
        setLoading(false)
        return
      }

      const addresses = needsGeocode.map(j => j.clients!.address)
      const resolved = await geocodeAddressesCached(addresses, (partial) => {
        const results = [...withCoords]
        for (const job of needsGeocode) {
          const coords = partial[job.clients!.address]
          if (coords) results.push({ ...job, ...coords })
        }
        setGeocodedJobs(rejectOutliers(results))
      })

      const results = [...withCoords]
      for (const job of needsGeocode) {
        const coords = resolved[job.clients!.address]
        if (coords) results.push({ ...job, ...coords })
      }
      setGeocodedJobs(rejectOutliers(results))
      setLoading(false)
    }

    if (mounted && jobs.length > 0) {
      geocodeJobs()
    } else {
      setGeocodedJobs([])
      setLoading(false)
    }
  }, [jobs, mounted])

  if (!mounted) {
    return <div className="h-[250px] md:h-[400px] bg-gray-100 rounded-lg flex items-center justify-center text-gray-500">Loading map...</div>
  }

  // Fixed preset framing (all 5 boroughs + nearby NJ/Long Island) rather than
  // auto-fitting to whatever's currently filtered -- a tight fit-to-markers
  // zoom loses the surrounding context Jeff wants when scanning the board.
  const center: [number, number] = [40.78, -73.97]
  const defaultZoom = 10

  return (
    <div className="relative">
      {loading && jobs.length > 0 && (
        <div className="absolute inset-0 bg-white bg-opacity-75 z-10 flex items-center justify-center">
          <p className="text-gray-500">Locating {jobs.length} jobs...</p>
        </div>
      )}
      <MapContainer
        center={center}
        zoom={defaultZoom}
        className="h-[250px] md:h-[400px]"
        style={{ width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {geocodedJobs.map((job) => {
          const icon = icons[job.status as keyof typeof icons] || icons.scheduled
          const time = naiveToAnchoredDate(job.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' , timeZone: 'UTC' })
          const date = naiveToAnchoredDate(job.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' , timeZone: 'UTC' })

          return (
            <Marker key={job.id} position={[job.lat, job.lng]} icon={icon}>
              <Popup>
                <div className="text-sm min-w-48">
                  <p className="font-bold text-base">{job.clients?.name}</p>
                  <p className="text-gray-600">{date} @ {time}</p>
                  <p className="text-gray-600">{job.service_type}</p>
                  <p className="text-gray-600">{crewNames(job)}</p>
                  <p className="text-xs text-gray-400 mt-1">{job.clients?.address}</p>
                  <span className={'inline-block mt-2 text-xs px-2 py-1 rounded-full ' +
                    (job.status === 'completed' ? 'bg-green-100 text-green-700' :
                     job.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                     'bg-blue-100 text-blue-700')}>
                    {job.status}
                  </span>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}
