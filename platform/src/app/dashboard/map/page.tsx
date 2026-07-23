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
  property_id: string | null
  clients: { name: string; phone: string | null; address: string | null; latitude: number | null; longitude: number | null } | null
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
  { value: 'cancelled', label: 'Canceled' },
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

  // Geocode addresses progressively. Real caching, in priority order:
  // 1) clients.latitude/longitude (or client_properties' override for a
  //    multi-address booking, already flattened onto b.clients server-side
  //    by applyPropertyToBookingClient) -- persisted by smart-scheduling,
  //    the admin geocode-backfill job, or a prior run of this same effect.
  //    Used directly, no network call at all.
  // 2) the in-memory per-address cache (geocodeCacheRef) -- avoids a repeat
  //    live geocode within this same page session for addresses without a
  //    DB-cached value yet.
  // 3) a live Nominatim call, only for addresses that miss both of the
  //    above -- and its result gets written back to the DB (clients or
  //    client_properties, whichever the booking actually resolves to) so
  //    every later map load -- this session or any future one -- hits (1)
  //    instead of re-geocoding. This is the part that was missing before:
  //    every map load re-geocoded every address unconditionally.
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
      const dbLat = b.clients!.latitude
      const dbLng = b.clients!.longitude
      if (dbLat != null && dbLng != null) {
        immediateResults.push({ ...b, lat: Number(dbLat), lng: Number(dbLng) })
        continue
      }
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

    // Deduplicate addresses to geocode (a shared building can have several
    // bookings/clients pointing at the same text address).
    const uniqueAddresses = [...new Set(toGeocode.map((b) => b.clients!.address!.trim()))]

    setGeocoding(true)
    let cancelled = false

    async function persistCoords(address: string, coords: { lat: number; lng: number }) {
      // Write the result back for every client_id/property_id pair that
      // shares this address, so their next load skips the geocoder too.
      const targets = new Map<string, { clientId: string; propertyId: string | null }>()
      for (const b of toGeocode) {
        if (b.clients!.address!.trim() !== address || !b.client_id) continue
        const key = `${b.client_id}:${b.property_id || ''}`
        targets.set(key, { clientId: b.client_id, propertyId: b.property_id })
      }
      await Promise.all(
        Array.from(targets.values()).map(({ clientId, propertyId }) =>
          fetch(`/api/clients/${clientId}/geocode-cache`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat: coords.lat, lng: coords.lng, property_id: propertyId }),
          }).catch(() => {})
        )
      )
    }

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
            const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
            cache.set(address, coords)
            persistCoords(address, coords)
          } else {
            cache.set(address, null)
          }
        } catch {
          cache.set(address, null)
        }

        // Update geocoded bookings progressively
        if (!cancelled) {
          const results: GeocodedBooking[] = [...immediateResults]
          for (const b of toGeocode) {
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
          <h2 className="text-2xl font-bold text-slate-900">Job Map</h2>
          <p className="text-sm text-slate-400">All jobs mapped by client location</p>
        </div>
        <button
          onClick={() => setShowStats(!showStats)}
          className="text-sm text-slate-400 hover:text-slate-900 border border-slate-200 px-3 py-2 rounded-lg md:hidden"
        >
          {showStats ? 'Hide Stats' : 'Show Stats'}
        </button>
      </div>

      {/* Filter bar */}
      <div className="border border-slate-200 rounded-lg p-4 mb-4 space-y-3">
        {/* Row 1: Status tabs */}
        <div className="flex flex-wrap gap-1">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                statusFilter === tab.value
                  ? 'bg-teal-600 text-white'
                  : 'text-slate-400 hover:bg-slate-50'
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
                    ? 'bg-teal-600 text-white'
                    : 'text-slate-400 hover:bg-slate-50'
                }`}
              >
                {dr.label}
              </button>
            ))}
          </div>

          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700"
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
            className="w-full md:w-64 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder-gray-500"
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
        <div className="flex-1 border border-slate-200 rounded-lg overflow-hidden min-h-[600px]">
          <MapView bookings={filteredBookings} fmt={fmt} />
        </div>

        {/* Stats sidebar */}
        <div
          className={`w-64 shrink-0 space-y-3 ${showStats ? 'block' : 'hidden'} md:block`}
        >
          <div className="border border-slate-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Map Summary</h3>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Total Shown</span>
                <span className="text-sm font-bold text-slate-900">{stats.total}</span>
              </div>

              {bookings.length > 0 && bookings.length !== filteredBookings.length && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Total Bookings</span>
                  <span className="text-xs text-slate-400">{bookings.length}</span>
                </div>
              )}
            </div>
          </div>

          <div className="border border-slate-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">By Status</h3>
            <div className="space-y-2">
              {Object.entries(stats.counts)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StatusDot status={status} />
                      <span className="text-xs text-slate-400 capitalize">
                        {status.replace('_', ' ')}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-slate-900">{count}</span>
                  </div>
                ))}
              {Object.keys(stats.counts).length === 0 && (
                <p className="text-xs text-slate-400">No jobs to display</p>
              )}
            </div>
          </div>

          {/* Legend */}
          <div className="border border-slate-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Legend</h3>
            <div className="space-y-1.5">
              {[
                { label: 'Scheduled', color: '#3b82f6' },
                { label: 'Confirmed', color: '#6366f1' },
                { label: 'In Progress', color: '#eab308' },
                { label: 'Completed', color: '#22c55e' },
                { label: 'Paid', color: '#10b981' },
                { label: 'Canceled', color: '#ef4444' },
                { label: 'No Show', color: '#6b7280' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ background: item.color }}
                  />
                  <span className="text-xs text-slate-400">{item.label}</span>
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
