'use client'
import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface MapJob {
  id: string
  start_time: string
  status: string
  service_type: string
  clients: { name: string; address: string } | null
  team_members: { name: string } | null
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

import { geocodeAddress } from '@/lib/geo'

function FitBounds({ jobs }: { jobs: GeocodedJob[] }) {
  const map = useMap()

  useEffect(() => {
    if (jobs.length > 0) {
      const bounds = L.latLngBounds(jobs.map(j => [j.lat, j.lng]))
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 })
    }
  }, [jobs, map])

  return null
}

export default function DashboardMap({ jobs }: Props) {
  const [mounted, setMounted] = useState(false)
  const [geocodedJobs, setGeocodedJobs] = useState<GeocodedJob[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    async function geocodeJobs() {
      setLoading(true)
      const results: GeocodedJob[] = []
      const cache: Record<string, { lat: number; lng: number }> = {}

      for (const job of jobs) {
        if (!job.clients?.address) continue
        const address = job.clients.address

        if (cache[address]) {
          results.push({ ...job, ...cache[address] })
          continue
        }

        const coords = await geocodeAddress(address)
        if (coords) {
          cache[address] = coords
          results.push({ ...job, ...coords })
        }
        await new Promise(r => setTimeout(r, 100))
      }

      setGeocodedJobs(results)
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
        {geocodedJobs.length > 0 && <FitBounds jobs={geocodedJobs} />}
        {geocodedJobs.map((job) => {
          const icon = icons[job.status as keyof typeof icons] || icons.scheduled
          const time = new Date(job.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
          const date = new Date(job.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

          return (
            <Marker key={job.id} position={[job.lat, job.lng]} icon={icon}>
              <Popup>
                <div className="text-sm min-w-48">
                  <p className="font-bold text-base">{job.clients?.name}</p>
                  <p className="text-gray-600">{date} @ {time}</p>
                  <p className="text-gray-600">{job.service_type}</p>
                  <p className="text-gray-600">{job.team_members?.name || 'Unassigned'}</p>
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
