'use client'

import { useEffect, useState, useRef } from 'react'
import L from 'leaflet'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

// Fix Leaflet default marker icons in Next.js
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

type Job = {
  id: string
  status: string
  clients: {
    name: string
    address: string | null
  } | null
  [key: string]: unknown
}

type GeocodedJob = Job & { lat: number; lng: number }

function statusIcon(status: string) {
  let color = '#3b82f6' // blue = upcoming
  if (status === 'in_progress') color = '#eab308' // yellow
  if (status === 'completed' || status === 'paid') color = '#9ca3af' // gray = done

  return L.divIcon({
    className: '',
    html: `<div style="width:20px;height:20px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  })
}

// Simple geocoder using Nominatim (free, no API key)
async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
      { headers: { 'User-Agent': 'FullLoopCRM/1.0' } }
    )
    const data = await res.json()
    if (data?.[0]) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
    }
  } catch {
    // silently fail
  }
  return null
}

export default function JobsMap({ jobs }: { jobs: Job[] }) {
  const [geocodedJobs, setGeocodedJobs] = useState<GeocodedJob[]>([])
  const [loading, setLoading] = useState(true)
  const geocodedRef = useRef(false)

  useEffect(() => {
    if (geocodedRef.current || jobs.length === 0) {
      setLoading(false)
      return
    }
    geocodedRef.current = true

    async function geocodeAll() {
      const results: GeocodedJob[] = []
      for (const job of jobs) {
        if (job.clients?.address) {
          const coords = await geocodeAddress(job.clients.address)
          if (coords) {
            results.push({ ...job, lat: coords.lat, lng: coords.lng })
          }
        }
      }
      setGeocodedJobs(results)
      setLoading(false)
    }
    geocodeAll()
  }, [jobs])

  if (loading) {
    return (
      <div className="w-full h-[250px] bg-gray-100 rounded-lg flex items-center justify-center">
        <p className="text-sm text-gray-400">Loading map...</p>
      </div>
    )
  }

  if (geocodedJobs.length === 0) {
    return (
      <div className="w-full h-[250px] bg-gray-100 rounded-lg flex items-center justify-center">
        <p className="text-sm text-gray-400">No job locations to display</p>
      </div>
    )
  }

  const center: [number, number] = [
    geocodedJobs.reduce((sum, j) => sum + j.lat, 0) / geocodedJobs.length,
    geocodedJobs.reduce((sum, j) => sum + j.lng, 0) / geocodedJobs.length,
  ]

  return (
    <MapContainer
      center={center}
      zoom={12}
      scrollWheelZoom={false}
      className="w-full rounded-lg"
      style={{ height: '250px' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {geocodedJobs.map((job) => (
        <Marker key={job.id} position={[job.lat, job.lng]} icon={statusIcon(job.status)}>
          <Popup>
            <div className="text-sm">
              <p className="font-bold">{job.clients?.name}</p>
              {job.clients?.address && (
                <p className="text-xs text-gray-500">{job.clients.address}</p>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
