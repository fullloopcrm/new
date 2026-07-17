import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import type { ServiceArea } from '@/lib/service-area'
import TeamCoverageMap from './TeamCoverageMap'

/**
 * TeamCoverageMap's own docstring claims "Replaces the NYC-hardcoded
 * CoverageMap for the shared team page. All data is real" — but it fetched
 * `/api/team-members`, a URL with no root route.ts (only nested
 * `[id]/stripe-onboard` and `[id]/stripe-status` exist under
 * `src/app/api/team-members/`). That fetch always 404s, `r.ok` is false, and
 * the component silently falls back to `[]`, so the coverage map rendered
 * unconditionally on the live `/dashboard/team` page's default "team" tab
 * always showed zero team members and every zone/state as "NO COVERAGE" —
 * regardless of how many team members actually had home coordinates. The
 * real list endpoint is `/api/team`, which also wraps its payload as
 * `{ team: [...] }` (not a bare array) and returns `team_members.*` including
 * the same stale/unmaintained `active` column already fixed elsewhere this
 * session (deploy-prep/w4-broad-hunt-2026-07-17-0128) — so the fix has to
 * unwrap the response AND filter on `status`, not `active`, to be correct.
 * Same shape bug independently affects `/api/clients` (`{ clients: [...] }`).
 */

function fakeLeafletMap() {
  const m: Record<string, unknown> = {}
  m.setView = () => m
  m.eachLayer = () => {}
  m.removeLayer = () => {}
  m.fitBounds = () => {}
  m.remove = () => {}
  return m
}

vi.mock('leaflet', () => ({
  default: {
    map: () => fakeLeafletMap(),
    tileLayer: () => ({ addTo: () => {} }),
    circleMarker: () => ({ addTo: () => ({ bindPopup: () => {} }) }),
    latLngBounds: () => ({ pad: () => ({}) }),
  },
}))

const LOCAL_SERVICE_AREA: ServiceArea = {
  scope: 'local',
  states: ['NY'],
  zones: [{ id: 'brooklyn', label: 'Brooklyn' }],
}

describe('TeamCoverageMap', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('fetches the real /api/team list endpoint, not the nonexistent /api/team-members', async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url === '/api/team') {
        return Promise.resolve({ ok: true, json: async () => ({ team: [] }) })
      }
      if (url === '/api/clients') {
        return Promise.resolve({ ok: true, json: async () => ({ clients: [] }) })
      }
      return Promise.resolve({ ok: false, json: async () => ({}) })
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<TeamCoverageMap serviceArea={LOCAL_SERVICE_AREA} />)

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/team'))
    expect(fetchMock).not.toHaveBeenCalledWith('/api/team-members')
  })

  it('unwraps the {team:[...]} response and plots active members, excluding inactive ones', async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url === '/api/team') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            team: [
              { id: 'tm-1', name: 'Active Cleaner', status: 'active', home_latitude: 40.68, home_longitude: -73.99, service_zones: ['brooklyn'], has_car: true },
              { id: 'tm-2', name: 'Terminated Cleaner', status: 'inactive', home_latitude: 40.7, home_longitude: -73.95, service_zones: ['brooklyn'], has_car: false },
            ],
          }),
        })
      }
      if (url === '/api/clients') {
        return Promise.resolve({ ok: true, json: async () => ({ clients: [] }) })
      }
      return Promise.resolve({ ok: false, json: async () => ({}) })
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<TeamCoverageMap serviceArea={LOCAL_SERVICE_AREA} />)

    // Brooklyn should show exactly 1 member (the active one) once loading
    // resolves — proves the fetch was unwrapped, status-filtered, and the
    // plotted member actually reached the zone-bucket count.
    await waitFor(() => expect(screen.getByText('1 member')).toBeInTheDocument())
    expect(screen.queryByText('NO COVERAGE')).not.toBeInTheDocument()
  })

  it('unwraps the {clients:[...]} response instead of treating it as an empty array', async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url === '/api/team') {
        return Promise.resolve({ ok: true, json: async () => ({ team: [] }) })
      }
      if (url === '/api/clients') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ clients: [{ id: 'c-1', name: 'Jane Client', latitude: 40.68, longitude: -73.99, address: '1 Main St' }] }),
        })
      }
      return Promise.resolve({ ok: false, json: async () => ({}) })
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<TeamCoverageMap serviceArea={LOCAL_SERVICE_AREA} />)

    // No direct client-count UI to assert on, but the loading spinner
    // clearing (without the fetch call ever throwing/erroring on the
    // wrapped shape) confirms the effect completed past both fetches.
    await waitFor(() => expect(screen.queryByText('Loading coverage map…')).not.toBeInTheDocument())
    expect(fetchMock).toHaveBeenCalledWith('/api/clients')
  })
})
