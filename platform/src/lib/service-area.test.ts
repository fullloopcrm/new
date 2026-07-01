import { describe, it, expect } from 'vitest'
import {
  getServiceArea,
  parseServiceArea,
  isStateScoped,
  NEUTRAL_SERVICE_AREA,
  NYC_DEFAULT_ZONES,
} from './service-area'

describe('service-area resolver', () => {
  describe('getServiceArea — the tenant-profile bug fix', () => {
    it('returns NEUTRAL (no NYC boroughs) for a tenant with no config', () => {
      // This is the we-pay-you-junk case: home-services, no service_area, no
      // legacy zones. It must NOT fall back to the NYC borough preset.
      const area = getServiceArea(null)
      expect(area).toEqual(NEUTRAL_SERVICE_AREA)
      expect(area.zones).toHaveLength(0)
    })

    it('returns NEUTRAL for an empty selena_config object', () => {
      expect(getServiceArea({})).toEqual(NEUTRAL_SERVICE_AREA)
    })

    it('honors an explicit national service_area', () => {
      const area = getServiceArea({ service_area: { scope: 'national', states: ['ALL'], zones: [] } })
      expect(area.scope).toBe('national')
      expect(area.states).toEqual(['ALL'])
      expect(area.zones).toHaveLength(0)
    })

    it('honors an explicit regional service_area and strips ALL', () => {
      const area = getServiceArea({ service_area: { scope: 'regional', states: ['NY', 'NJ', 'CT', 'ALL'], zones: [] } })
      expect(area.scope).toBe('regional')
      expect(area.states).toEqual(['NY', 'NJ', 'CT'])
    })

    it('keeps NYC boroughs for a legacy tenant with service_zones (back-compat)', () => {
      const area = getServiceArea({ service_zones: ['manhattan', 'brooklyn'] })
      expect(area.scope).toBe('local')
      expect(area.zones).toEqual(NYC_DEFAULT_ZONES)
    })

    it('honors an explicit local NYC preset (nycmaid pinned to preserve its map)', () => {
      const area = getServiceArea({ service_area: { scope: 'local', states: ['NY'], zones: NYC_DEFAULT_ZONES } })
      expect(area.scope).toBe('local')
      expect(area.zones).toHaveLength(NYC_DEFAULT_ZONES.length)
    })
  })

  describe('parseServiceArea — no silent NYC injection', () => {
    it('respects an explicit empty local area (does not inject NYC zones)', () => {
      const area = parseServiceArea({ scope: 'local', states: [], zones: [] })
      expect(area.zones).toHaveLength(0)
      expect(area.states).toHaveLength(0)
    })

    it('drops zones when scope is not local', () => {
      const area = parseServiceArea({ scope: 'national', states: ['CA'], zones: [{ id: 'x', label: 'y' }] })
      expect(area.zones).toHaveLength(0)
    })

    it('falls back to NEUTRAL for non-object input', () => {
      expect(parseServiceArea('garbage')).toEqual(NEUTRAL_SERVICE_AREA)
    })

    it('filters invalid state codes', () => {
      const area = parseServiceArea({ scope: 'national', states: ['NY', 'ZZ', 'ca'], zones: [] })
      expect(area.states).toEqual(['NY', 'CA'])
    })
  })

  describe('isStateScoped', () => {
    it('is true for regional and national, false for local', () => {
      expect(isStateScoped('local')).toBe(false)
      expect(isStateScoped('regional')).toBe(true)
      expect(isStateScoped('national')).toBe(true)
    })
  })
})
