import { describe, it, expect } from 'vitest'
import {
  getServiceArea,
  parseServiceArea,
  isStateScoped,
  isWithinServiceArea,
  NEUTRAL_SERVICE_AREA,
  NYC_DEFAULT_ZONES,
  NYC_FIVE_BOROUGHS,
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

  describe('isWithinServiceArea — the-nyc-exterminator / Southampton incident, 2026-08-21', () => {
    const fiveBoroughs = { scope: 'local' as const, states: ['NY'], zones: NYC_FIVE_BOROUGHS }

    it('rejects an out-of-NYC address when zones are exactly the 5 boroughs', () => {
      expect(isWithinServiceArea(fiveBoroughs, 'Southampton', 'NY')).toBe(false)
      expect(isWithinServiceArea(fiveBoroughs, 'East Hampton', 'NY')).toBe(false)
    })

    it('accepts a real borough address when zones are exactly the 5 boroughs', () => {
      expect(isWithinServiceArea(fiveBoroughs, 'Queens', 'NY')).toBe(true)
      expect(isWithinServiceArea(fiveBoroughs, 'Brooklyn', 'NY')).toBe(true)
    })

    it('rejects when city/state are missing (no confirmed address selection)', () => {
      expect(isWithinServiceArea(fiveBoroughs, undefined, undefined)).toBe(false)
    })

    it('fails open for an unconfigured local tenant (no zones)', () => {
      expect(isWithinServiceArea(NEUTRAL_SERVICE_AREA, 'Anywhere', 'TX')).toBe(true)
    })

    it('fails open for a local tenant whose zones include non-borough areas (e.g. nycmaid)', () => {
      const nycmaidStyle = { scope: 'local' as const, states: ['NY'], zones: NYC_DEFAULT_ZONES }
      expect(isWithinServiceArea(nycmaidStyle, 'Southampton', 'NY')).toBe(true)
    })

    it('checks state membership for a regional tenant', () => {
      const regional = { scope: 'regional' as const, states: ['NY', 'NJ', 'CT'], zones: [] }
      expect(isWithinServiceArea(regional, 'Anywhere', 'NY')).toBe(true)
      expect(isWithinServiceArea(regional, 'Anywhere', 'PA')).toBe(false)
    })

    it('fails open for an unconfigured regional/national tenant (no states)', () => {
      const unconfigured = { scope: 'national' as const, states: [], zones: [] }
      expect(isWithinServiceArea(unconfigured, 'Anywhere', 'TX')).toBe(true)
    })

    it('accepts any state for a national tenant with ALL', () => {
      const national = { scope: 'national' as const, states: ['ALL'], zones: [] }
      expect(isWithinServiceArea(national, 'Anywhere', 'TX')).toBe(true)
    })
  })
})
