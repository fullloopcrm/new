import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import TeamCoverageMap from './TeamCoverageMap'
import type { ServiceArea } from '@/lib/service-area'

/**
 * Live-bug regression: /dashboard/team crashed with "Cannot read properties
 * of undefined (reading 'appendChild')" for every tenant. Root cause: the
 * map-creation effect in TeamCoverageMap's MapInner listed `map` as its own
 * dependency, so `setMap(m)` triggered a re-render that ran the effect's
 * cleanup (`m.remove()`) immediately after creating the map -- destroying it
 * a tick after birth. The marker-drawing effect then called `.addTo(map)` on
 * the dead instance, and Leaflet's internal renderer-pane creation threw on
 * appendChild against an undefined pane.
 *
 * This uses the real `leaflet` package (not mocked) in jsdom so the actual
 * pane/appendChild lifecycle is exercised, not a hand-rolled stand-in for it.
 */

const SERVICE_AREA: ServiceArea = {
  scope: 'local',
  states: [],
  zones: [{ id: 'brooklyn', label: 'Brooklyn' }],
}

describe('TeamCoverageMap', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    // jsdom has no real layout engine; Leaflet needs a non-zero container
    // size to initialize without complaint.
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 400 })
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 400 })
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, value: 400 })
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 400 })

    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url === '/api/cleaners') {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve([
                {
                  id: 'm1',
                  name: 'Victor Antonio Gonzalez',
                  active: true,
                  home_latitude: 40.65,
                  home_longitude: -73.95,
                  service_zones: ['brooklyn'],
                  has_car: true,
                  tax_state: 'NY',
                },
              ]),
          })
        }
        if (url === '/api/clients') {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve([
                { id: 'c1', name: 'Client One', latitude: 40.66, longitude: -73.96, address: '123 Main St' },
              ]),
          })
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve(null) })
      })
    )
  })

  it('mounts, plots markers, and does not crash the /dashboard/team error boundary', async () => {
    const errors: unknown[] = []
    const onError = (e: ErrorEvent) => errors.push(e.error || e.message)
    window.addEventListener('error', onError)

    const { container } = render(<TeamCoverageMap serviceArea={SERVICE_AREA} />)

    // Loading state first, then the map + markers.
    await waitFor(() => expect(container.querySelector('.leaflet-container')).toBeTruthy(), { timeout: 3000 })

    // Give the marker-drawing effect (which fires after map creation
    // settles) a tick to run -- this is exactly where the old code threw.
    await waitFor(
      () => expect(container.querySelectorAll('.leaflet-interactive, .leaflet-marker-icon').length).toBeGreaterThan(0),
      { timeout: 3000 }
    )

    window.removeEventListener('error', onError)
    expect(errors).toEqual([])
  })
})
