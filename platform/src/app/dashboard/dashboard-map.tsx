'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'

type Booking = {
  id: string
  service_type: string | null
  start_time: string
  end_time: string | null
  status: string
  price: number | null
  notes: string | null
  client_id: string | null
  team_member_id: string | null
  clients: { name: string; phone: string | null; address: string | null } | null
  team_members: { name: string; phone: string | null } | null
}

type TeamMember = { id: string; name: string }

type GeocodedBooking = Booking & {
  lat: number
  lng: number
}

const statusTabs = [
  { value: '', label: 'All' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const dateRanges = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
]

const MapView = dynamic(() => import('./map/map-view'), { ssr: false })

export default function DashboardMap() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [team, setTeam] = useState<TeamMember[]>([])
  const [statusFilter, setStatusFilter] = useState('')
  const [dateRange, setDateRange] = useState('month')
  const [teamFilter, setTeamFilter] = useState('')
  const [geocoded, setGeocoded] = useState<GeocodedBooking[]>([])
  const [geocoding, setGeocoding] = useState(false)
  const [loading, setLoading] = useState(true)
  const geocodeCacheRef = useRef<Map<string, { lat: number; lng: number } | null>>(new Map())

  const getDateRange = useCallback(() => {
    const now = new Date()
    switch (dateRange) {
      case 'today': {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const end = new Date(start.getTime() + 86400000)
        return { date_from: start.toISOString(), date_to: end.toISOString() }
      }
      case 'week': {
        const day = now.getDay()
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day)
        const end = new Date(start.getTime() + 7 * 86400000)
        return { date_from: start.toISOString(), date_to: end.toISOString() }
      }
      case 'month': {
        const start = new Date(now.getFullYear(), now.getMonth(), 1)
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 1)
        return { date_from: start.toISOString(), date_to: end.toISOString() }
      }
      default:
        return {}
    }
  }, [dateRange])

  const loadBookings = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (statusFilter) params.set('status', statusFilter)
    if (teamFilter) params.set('team_member_id', teamFilter)
    const dr = getDateRange()
    if (dr.date_from) params.set('date_from', dr.date_from)
    if (dr.date_to) params.set('date_to', dr.date_to)
    params.set('limit', '200')
    fetch(`/api/bookings?${params}`)
      .then((r) => r.json())
      .then((data) => setBookings(data.bookings || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [statusFilter, teamFilter, getDateRange])

  useEffect(() => {
    fetch('/api/team')
      .then((r) => r.json())
      .then((data) => setTeam(data.team || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    loadBookings()
  }, [loadBookings])

  // Geocode addresses progressively
  useEffect(() => {
    const cache = geocodeCacheRef.current
    const bookingsWithAddress = bookings.filter(
      (b) => b.clients?.address && b.clients.address.trim().length > 0
    )

    if (bookingsWithAddress.length === 0) {
      setGeocoded([])
      return
    }

    const immediateResults: GeocodedBooking[] = []
    const toGeocode: Booking[] = []

    for (const b of bookingsWithAddress) {
      const address = b.clients!.address!.trim()
      if (cache.has(address)) {
        const coords = cache.get(address)
        if (coords) {
          immediateResults.push({ ...b, lat: coords.lat, lng: coords.lng })
        }
      } else {
        toGeocode.push(b)
      }
    }

    setGeocoded(immediateResults)

    if (toGeocode.length === 0) return

    const uniqueAddresses = [...new Set(toGeocode.map((b) => b.clients!.address!.trim()))]

    setGeocoding(true)
    let cancelled = false

    async function geocodeBatch() {
      for (const address of uniqueAddresses) {
        if (cancelled) break
        if (cache.has(address)) continue

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
            { headers: { 'User-Agent': 'FullLoopCRM/1.0' } }
          )
          const data = await res.json()
          if (data.length > 0) {
            cache.set(address, { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) })
          } else {
            cache.set(address, null)
          }
        } catch {
          cache.set(address, null)
        }

        if (!cancelled) {
          const results: GeocodedBooking[] = []
          for (const b of bookingsWithAddress) {
            const addr = b.clients!.address!.trim()
            const coords = cache.get(addr)
            if (coords) {
              results.push({ ...b, lat: coords.lat, lng: coords.lng })
            }
          }
          setGeocoded(results)
        }

        await new Promise((resolve) => setTimeout(resolve, 100))
      }
      if (!cancelled) setGeocoding(false)
    }

    geocodeBatch()

    return () => {
      cancelled = true
    }
  }, [bookings])

  // Counts for status tabs
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { '': bookings.length }
    for (const b of bookings) {
      counts[b.status] = (counts[b.status] || 0) + 1
    }
    return counts
  }, [bookings])

  const fmt = (cents: number) =>
    '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
      {/* Header with inline filters */}
      <div className="px-5 py-4 border-b border-gray-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-white text-sm uppercase tracking-wide">Job Map</h3>
            {geocoding && (
              <span className="text-[10px] text-yellow-400 animate-pulse">Geocoding...</span>
            )}
            {!loading && !geocoding && (
              <span className="text-[10px] text-gray-500">{geocoded.length} mapped</span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Team filter */}
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-300"
            >
              <option value="">All Team Members</option>
              {team.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>

            {/* Status tabs */}
            <div className="flex gap-1">
              {statusTabs.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setStatusFilter(tab.value)}
                  className={`px-2 py-1 text-[11px] font-medium rounded-md transition-colors ${
                    statusFilter === tab.value
                      ? 'bg-white text-gray-900'
                      : 'text-gray-500 hover:bg-gray-800'
                  }`}
                >
                  {tab.label}
                  {statusCounts[tab.value] !== undefined && (
                    <span className="ml-1 opacity-60">{statusCounts[tab.value]}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Date range */}
            <div className="flex gap-1">
              {dateRanges.map((dr) => (
                <button
                  key={dr.value}
                  onClick={() => setDateRange(dr.value)}
                  className={`px-2 py-1 text-[11px] font-medium rounded-md transition-colors ${
                    dateRange === dr.value
                      ? 'bg-white text-gray-900'
                      : 'text-gray-500 hover:bg-gray-800'
                  }`}
                >
                  {dr.label}
                </button>
              ))}
            </div>

            <Link href="/dashboard/map" className="text-[11px] text-blue-500 hover:underline ml-1">
              Full Map
            </Link>
          </div>
        </div>
      </div>

      {/* Map */}
      <div style={{ height: '400px' }}>
        {loading && geocoded.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center bg-gray-900">
            <p className="text-gray-500 text-sm">Loading map...</p>
          </div>
        ) : (
          <MapView bookings={geocoded} fmt={fmt} />
        )}
      </div>
    </div>
  )
}
