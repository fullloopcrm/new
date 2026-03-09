'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
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

// Colored markers based on booking status
function statusIcon(status: string) {
  const colors: Record<string, string> = {
    scheduled: '#3b82f6',
    confirmed: '#6366f1',
    in_progress: '#eab308',
    completed: '#22c55e',
    paid: '#10b981',
    cancelled: '#ef4444',
    no_show: '#6b7280',
  }
  return L.divIcon({
    className: '',
    html: `<div style="width:24px;height:24px;border-radius:50%;background:${colors[status] || '#6b7280'};border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
}

type GeocodedBooking = {
  id: string
  service_type: string | null
  start_time: string
  end_time: string | null
  status: string
  price: number | null
  notes: string | null
  lat: number
  lng: number
  clients: { name: string; phone: string | null; address: string | null } | null
  team_members: { name: string; phone: string | null } | null
}

type MapViewProps = {
  bookings: GeocodedBooking[]
  fmt: (cents: number) => string
}

export default function MapView({ bookings, fmt }: MapViewProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="w-full h-full min-h-[600px] flex items-center justify-center bg-slate-800">
        <p className="text-slate-400 text-sm">Loading map...</p>
      </div>
    )
  }

  return (
    <MapContainer
      center={[40.7128, -74.006]}
      zoom={11}
      scrollWheelZoom={false}
      className="w-full h-full min-h-[600px]"
      style={{ minHeight: '600px', background: '#1a1a2e' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {bookings.map((b) => (
        <Marker key={b.id} position={[b.lat, b.lng]} icon={statusIcon(b.status)}>
          <Popup>
            <div className="text-sm min-w-[200px]">
              <p className="font-bold text-slate-800 text-base mb-1">
                {b.clients?.name || 'Unknown Client'}
              </p>
              {b.clients?.address && (
                <p className="text-slate-500 text-xs mb-2">{b.clients.address}</p>
              )}
              <div className="border-t border-slate-200 pt-2 space-y-1">
                {b.service_type && (
                  <p className="text-xs">
                    <span className="font-medium text-slate-600">Service:</span>{' '}
                    {b.service_type}
                  </p>
                )}
                <p className="text-xs">
                  <span className="font-medium text-slate-600">Date:</span>{' '}
                  {new Date(b.start_time).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
                <p className="text-xs">
                  <span className="font-medium text-slate-600">Time:</span>{' '}
                  {new Date(b.start_time).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                  {b.end_time &&
                    ` - ${new Date(b.end_time).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}`}
                </p>
                <p className="text-xs">
                  <span className="font-medium text-slate-600">Status:</span>{' '}
                  <span className="capitalize">{b.status.replace('_', ' ')}</span>
                </p>
                {b.price != null && (
                  <p className="text-xs">
                    <span className="font-medium text-slate-600">Price:</span>{' '}
                    {fmt(b.price)}
                  </p>
                )}
                {b.team_members?.name && (
                  <p className="text-xs">
                    <span className="font-medium text-slate-600">Team:</span>{' '}
                    {b.team_members.name}
                  </p>
                )}
              </div>
              <div className="mt-2 pt-2 border-t border-slate-200">
                <Link
                  href={`/dashboard/bookings/${b.id}`}
                  className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                >
                  View Booking Details &rarr;
                </Link>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
