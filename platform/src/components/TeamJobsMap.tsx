'use client'
import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { geocodeAddress } from '@/lib/geo'

interface JobForMap {
  id: string
  address: string
  clientName: string
  time: string
  status: 'upcoming' | 'in_progress' | 'done'
}

interface Props {
  jobs: JobForMap[]
}

interface GeocodedJob extends JobForMap {
  lat: number
  lng: number
}

const createIcon = (color: string) => new L.DivIcon({
  className: 'custom-marker',
  html: `<div style="background: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -10]
})

const icons = {
  upcoming: createIcon('#3b82f6'),
  in_progress: createIcon('#22c55e'),
  done: createIcon('#9ca3af'),
}

function FitBounds({ jobs }: { jobs: GeocodedJob[] }) {
  const map = useMap()

  useEffect(() => {
    if (jobs.length > 0) {
      const bounds = L.latLngBounds(jobs.map(j => [j.lat, j.lng]))
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 })
    }
  }, [jobs, map])

  return null
}

export default function TeamJobsMap({ jobs }: Props) {
  const [geocodedJobs, setGeocodedJobs] = useState<GeocodedJob[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (jobs.length === 0) {
      setGeocodedJobs([])
      setLoading(false)
      return
    }

    const cache: Record<string, { lat: number; lng: number }> = {}

    async function geocodeAll() {
      setLoading(true)
      const results: GeocodedJob[] = []

      for (const job of jobs) {
        if (!job.address) continue

        if (cache[job.address]) {
          results.push({ ...job, ...cache[job.address] })
          continue
        }

        const coords = await geocodeAddress(job.address)
        if (coords) {
          cache[job.address] = coords
          results.push({ ...job, ...coords })
        }
        await new Promise(r => setTimeout(r, 100))
      }

      setGeocodedJobs(results)
      setLoading(false)
    }

    geocodeAll()
  }, [jobs])

  const center: [number, number] = [40.78, -73.97]

  return (
    <div className="relative h-[250px] rounded-lg overflow-hidden">
      {loading && (
        <div className="absolute inset-0 bg-white/75 z-[1000] flex items-center justify-center">
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading map...
          </div>
        </div>
      )}
      <MapContainer
        center={center}
        zoom={11}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {geocodedJobs.length > 0 && <FitBounds jobs={geocodedJobs} />}
        {geocodedJobs.map((job) => (
          <Marker key={job.id} position={[job.lat, job.lng]} icon={icons[job.status]}>
            <Popup>
              <div className="text-sm min-w-[180px]">
                <p className="font-bold">{job.clientName}</p>
                <p className="text-gray-600">{job.time}</p>
                <p className="text-xs text-gray-400 mt-1">{job.address}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
