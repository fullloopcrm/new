import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import MapPage from './page'

// p1-w1 queue item 3: the map view re-geocoded every booking's address on
// every load via a live Nominatim call, ignoring clients.latitude/longitude
// (already persisted by smart-scheduling / the admin geocode-backfill job)
// entirely. This exercises the real fixed component: a booking whose client
// already has cached coords must never trigger a live geocode call, and a
// booking without cached coords must still geocode live and then persist the
// result back via /api/clients/:id/geocode-cache so future loads are cached.

vi.mock('next/dynamic', () => ({
  default: (loader: () => Promise<{ default: unknown }>) => {
    let Comp: unknown = null
    loader().then((m) => { Comp = m.default })
    return function DynamicMapView(props: Record<string, unknown>) {
      const C = Comp as ((p: Record<string, unknown>) => unknown) | null
      return C ? (C(props) as never) : null
    }
  },
}))

vi.mock('./map-view', () => ({
  default: ({ bookings }: { bookings: Array<{ id: string; clients: { name: string } | null }> }) => (
    <div data-testid="map-view">
      {bookings.map((b) => (
        <div key={b.id}>{b.clients?.name}</div>
      ))}
    </div>
  ),
}))

const CACHED_BOOKING = {
  id: 'b-cached',
  service_type: 'Clean',
  start_time: '2026-07-01T14:00:00.000Z',
  end_time: null,
  status: 'scheduled',
  price: 9000,
  notes: null,
  client_id: 'client-cached',
  team_member_id: null,
  property_id: null,
  clients: { name: 'Cached Client', phone: null, address: '1 Main St', latitude: 40.7, longitude: -74.0 },
  team_members: null,
}

const UNCACHED_BOOKING = {
  id: 'b-uncached',
  service_type: 'Clean',
  start_time: '2026-07-01T15:00:00.000Z',
  end_time: null,
  status: 'scheduled',
  price: 9000,
  notes: null,
  client_id: 'client-uncached',
  team_member_id: null,
  property_id: null,
  clients: { name: 'Uncached Client', phone: null, address: '99 Elm St', latitude: null, longitude: null },
  team_members: null,
}

function mockFetch() {
  const nominatimCalls: string[] = []
  const persistCalls: Array<{ url: string; body: unknown }> = []
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString()
    if (url.startsWith('/api/bookings')) {
      return Promise.resolve({ ok: true, json: async () => ({ bookings: [CACHED_BOOKING, UNCACHED_BOOKING] }) } as Response)
    }
    if (url.startsWith('/api/team')) {
      return Promise.resolve({ ok: true, json: async () => ({ team: [] }) } as Response)
    }
    if (url.startsWith('https://nominatim.openstreetmap.org')) {
      nominatimCalls.push(url)
      return Promise.resolve({ ok: true, json: async () => [{ lat: '41.0', lon: '-75.0' }] } as Response)
    }
    if (url.includes('/geocode-cache')) {
      persistCalls.push({ url, body: init?.body ? JSON.parse(init.body as string) : null })
      return Promise.resolve({ ok: true, json: async () => ({ success: true }) } as Response)
    }
    return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
  })
  return { fetchMock, nominatimCalls, persistCalls }
}

describe('Map view uses cached coordinates instead of re-geocoding every load', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('never live-geocodes a booking whose client already has cached lat/lng', async () => {
    const { fetchMock, nominatimCalls } = mockFetch()
    vi.stubGlobal('fetch', fetchMock)

    render(<MapPage />)

    await screen.findByText('Cached Client')

    // Give the geocode effect a tick to run for the uncached booking too.
    await waitFor(() => expect(nominatimCalls.length).toBeGreaterThan(0))

    // Only the uncached address was ever sent to the live geocoder.
    expect(nominatimCalls.some((u) => u.includes('99%20Elm%20St') || u.includes('99+Elm+St') || u.includes('Elm'))).toBe(true)
    expect(nominatimCalls.some((u) => u.includes('Main'))).toBe(false)
  })

  it('persists a newly live-geocoded result back to the client so future loads are cached', async () => {
    const { fetchMock, persistCalls } = mockFetch()
    vi.stubGlobal('fetch', fetchMock)

    render(<MapPage />)

    await screen.findByText('Cached Client')

    await waitFor(() => expect(persistCalls.length).toBeGreaterThan(0))
    expect(persistCalls[0].url).toBe('/api/clients/client-uncached/geocode-cache')
    expect(persistCalls[0].body).toEqual({ lat: 41.0, lng: -75.0, property_id: null })
  })
})
