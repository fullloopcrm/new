'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'

// Types
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

// Status filter tabs
const statusTabs = [
  { value: '', label: 'All' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'paid', label: 'Paid' },
  { value: 'cancelled', label: 'Cancelled' },
]

// Date range options
const dateRanges = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'all', label: 'All Time' },
]

// The actual map component (client-only)
const MapView = dynamic(() => import('./map-view'), { ssr: false })

export default function MapPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [team, setTeam] = useState<TeamMember[]>([])
  const [statusFilter, setStatusFilter] = useState('')
  const [dateRange, setDateRange] = useState('all')
  const [teamFilter, setTeamFilter] = useState('')
  const [search, setSearch] = useState('')
  const [geocoded, setGeocoded] = useState<GeocodedBooking[]>([])
  const [geocoding, setGeocoding] = useState(false)
  const [showStats, setShowStats] = useState(true)
  const geocodeCacheRef = useRef<Map<string, { lat: number; lng: number } | null>>(new Map())

  // Compute date range boundaries
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

  // Fetch bookings
  const loadBookings = useCallback(() => {
    const params = new URLSearchParams()
    if (statusFilter) params.set('status', statusFilter)
    if (teamFilter) params.set('team_member_id', teamFilter)
    const dr = getDateRange()
    if (dr.date_from) params.set('date_from', dr.date_from)
    if (dr.date_to) params.set('date_to', dr.date_to)
    params.set('limit', '500')
    fetch(`/api/bookings?${params}`)
      .then((r) => r.json())
      .then((data) => setBookings(data.bookings || []))
      .catch(() => {})
  }, [statusFilter, teamFilter, getDateRange])

  // Fetch team members
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

    // Immediately resolve cached entries
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

    if (toGeocode.length === 0) {
      return
    }

    // Deduplicate addresses to geocode
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

        // Update geocoded bookings progressively
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

        // Rate limit: 100ms between requests
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
      if (!cancelled) setGeocoding(false)
    }

    geocodeBatch()

    return () => {
      cancelled = true
    }
  }, [bookings])

  // Apply client-side search filter
  const filteredBookings = useMemo(() => {
    if (!search.trim()) return geocoded
    const q = search.toLowerCase()
    return geocoded.filter(
      (b) =>
        b.clients?.name?.toLowerCase().includes(q) ||
        b.clients?.address?.toLowerCase().includes(q) ||
        b.service_type?.toLowerCase().includes(q)
    )
  }, [geocoded, search])

  // Stats computation
  const stats = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const b of filteredBookings) {
      counts[b.status] = (counts[b.status] || 0) + 1
    }
    return { total: filteredBookings.length, counts }
  }, [filteredBookings])

  const fmt = (cents: number) =>
    '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Job Map</h2>
          <p className="text-sm text-gray-500">All jobs mapped by client location</p>
        </div>
        <button
          onClick={() => setShowStats(!showStats)}
          className="text-sm text-gray-400 hover:text-white border border-gray-700 px-3 py-2 rounded-lg md:hidden"
        >
          {showStats ? 'Hide Stats' : 'Show Stats'}
        </button>
      </div>

      {/* Filter bar */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-4 space-y-3">
        {/* Row 1: Status tabs */}
        <div className="flex flex-wrap gap-1">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                statusFilter === tab.value
                  ? 'bg-white text-gray-900'
                  : 'text-gray-500 hover:bg-gray-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Row 2: Date range, team filter, search */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
          <div className="flex gap-1 flex-wrap">
            {dateRanges.map((dr) => (
              <button
                key={dr.value}
                onClick={() => setDateRange(dr.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  dateRange === dr.value
                    ? 'bg-white text-gray-900'
                    : 'text-gray-500 hover:bg-gray-800'
                }`}
              >
                {dr.label}
              </button>
            ))}
          </div>

          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-300"
          >
            <option value="">All Team Members</option>
            {team.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          <input
            placeholder="Search by client name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full md:w-64 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500"
          />

          {geocoding && (
            <span className="text-xs text-yellow-400 whitespace-nowrap">
              Geocoding addresses...
            </span>
          )}
        </div>
      </div>

      {/* Main content: map + stats sidebar */}
      <div className="flex gap-4 flex-1">
        {/* Map */}
        <div className="flex-1 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden min-h-[600px]">
          <MapView bookings={filteredBookings} fmt={fmt} />
        </div>

        {/* Stats sidebar */}
        <div
          className={`w-64 shrink-0 space-y-3 ${showStats ? 'block' : 'hidden'} md:block`}
        >
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-white mb-3">Map Summary</h3>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Total Shown</span>
                <span className="text-sm font-bold text-white">{stats.total}</span>
              </div>

              {bookings.length > 0 && bookings.length !== filteredBookings.length && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Total Bookings</span>
                  <span className="text-xs text-gray-500">{bookings.length}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-white mb-3">By Status</h3>
            <div className="space-y-2">
              {Object.entries(stats.counts)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StatusDot status={status} />
                      <span className="text-xs text-gray-400 capitalize">
                        {status.replace('_', ' ')}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-white">{count}</span>
                  </div>
                ))}
              {Object.keys(stats.counts).length === 0 && (
                <p className="text-xs text-gray-500">No jobs to display</p>
              )}
            </div>
          </div>

          {/* Legend */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-white mb-3">Legend</h3>
            <div className="space-y-1.5">
              {[
                { label: 'Scheduled', color: '#3b82f6' },
                { label: 'Confirmed', color: '#6366f1' },
                { label: 'In Progress', color: '#eab308' },
                { label: 'Completed', color: '#22c55e' },
                { label: 'Paid', color: '#10b981' },
                { label: 'Cancelled', color: '#ef4444' },
                { label: 'No Show', color: '#6b7280' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ background: item.color }}
                  />
                  <span className="text-xs text-gray-400">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    scheduled: '#3b82f6',
    confirmed: '#6366f1',
    in_progress: '#eab308',
    completed: '#22c55e',
    paid: '#10b981',
    cancelled: '#ef4444',
    no_show: '#6b7280',
  }
  return (
    <div
      className="w-2.5 h-2.5 rounded-full shrink-0"
      style={{ background: colors[status] || '#6b7280' }}
    />
  )
}
