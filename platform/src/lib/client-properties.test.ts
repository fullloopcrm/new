import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./supabase', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}))

import { updateProperty, normalizeAddress, resolveProperty, bookingCoords, applyPropertyToBookingClient } from './client-properties'
import { supabaseAdmin } from './supabase'

interface Row {
  id: string
  address: string
  unit: string | null
  label: string | null
  latitude: number | null
  longitude: number | null
}

function mockClientPropertiesFlow(before: Row) {
  const updateSpy = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: before, error: null }),
  })

  vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
    if (table === 'client_properties') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: before }),
        update: updateSpy,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any
    }
    if (table === 'clients') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { tenant_id: 'tenant-1' } }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any
    }
    if (table === 'property_changes') {
      return {
        insert: vi.fn().mockResolvedValue({ error: null }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any
    }
    throw new Error(`unexpected table ${table}`)
  })

  return updateSpy
}

describe('updateProperty', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('clears the unit from the recombined address when unit is explicitly nulled alongside a new address', async () => {
    const before: Row = {
      id: 'prop-1',
      address: '123 Old St, Apt 4B',
      unit: 'Apt 4B',
      label: null,
      latitude: 1,
      longitude: 2,
    }
    const updateSpy = mockClientPropertiesFlow(before)

    await updateProperty('client-1', 'prop-1', { address: '456 New St', unit: null })

    const patchSent = updateSpy.mock.calls[0][0]
    expect(patchSent.address).toBe('456 New St')
    expect(patchSent.unit).toBeNull()
  })

  it('preserves the existing unit in the recombined address when unit is not part of the patch', async () => {
    const before: Row = {
      id: 'prop-1',
      address: '123 Old St, Apt 4B',
      unit: 'Apt 4B',
      label: null,
      latitude: 1,
      longitude: 2,
    }
    const updateSpy = mockClientPropertiesFlow(before)

    await updateProperty('client-1', 'prop-1', { address: '456 New St' })

    const patchSent = updateSpy.mock.calls[0][0]
    expect(patchSent.address).toBe('456 New St, Apt 4B')
    expect(patchSent.unit).toBeUndefined()
  })
})

describe('normalizeAddress', () => {
  // Live bug (2026-07-30, Anita Ogbara): these two strings are the same
  // physical address -- the second is the first with the informal trailing
  // borough tag stripped and re-punctuated.
  it('collapses a redundant informal borough tag onto the spelled-out borough', () => {
    const withTag = normalizeAddress('2782 Bedford Ave, Brooklyn, NY 11210, Bklyn')
    const withoutTag = normalizeAddress('2782 Bedford Ave Brooklyn NY 11210')
    expect(withTag).toBe(withoutTag)
  })

  it('still normalizes an address with only the informal abbreviation, no spelled-out form', () => {
    expect(normalizeAddress('123 Main St Bklyn NY 11201')).toBe(normalizeAddress('123 Main St Brooklyn NY 11201'))
  })

  it('does not collapse two different street addresses', () => {
    expect(normalizeAddress('123 Main St, Brooklyn, NY 11201')).not.toBe(normalizeAddress('456 Main St, Brooklyn, NY 11201'))
  })

  it('does not collapse two different apartment units at the same building', () => {
    expect(normalizeAddress('123 Main St Apt 2, Brooklyn, NY 11201')).not.toBe(normalizeAddress('123 Main St Apt 3, Brooklyn, NY 11201'))
  })
})

describe('resolveProperty', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reuses the existing property instead of creating a duplicate when only the borough tag differs', async () => {
    const existing = [{ id: 'prop-1', address: '2782 Bedford Ave, Brooklyn, NY 11210, Bklyn', latitude: null, longitude: null }]
    const insertSpy = vi.fn()
    vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
      if (table === 'client_properties') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          then: (resolve: (v: unknown) => void) => resolve({ data: existing }),
          insert: insertSpy,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any
      }
      throw new Error(`unexpected table ${table}`)
    })

    const result = await resolveProperty('client-1', '2782 Bedford Ave Brooklyn NY 11210')

    expect(result?.id).toBe('prop-1')
    expect(insertSpy).not.toHaveBeenCalled()
  })
})

describe('bookingCoords / applyPropertyToBookingClient — property/client coord drift', () => {
  // Live bug (2026-08-03, Shelby Rodriguez): a client_properties row's
  // lat/lng silently diverged from the SAME client's own coords (Brooklyn,
  // NY text geocoded to Brooklyn, MD near Baltimore) and drove a cleaner to
  // the wrong address. These lock in the >50mi drift-rejection fix.
  const nycClient = { address: '156 8th Ave', latitude: 40.6715, longitude: -73.9745 }
  const baltimoreProperty = { address: '156 8th ave brooklyn, 2F', latitude: 39.2268, longitude: -76.6158 }
  const nearbyProperty = { address: '201 West 21st Street, 4E', latitude: 40.7429, longitude: -73.9966 }

  it('rejects property coords far from the same client\'s own coords, falling back to the client', () => {
    const coords = bookingCoords({ client_properties: baltimoreProperty, clients: nycClient })
    expect(coords).toEqual({ lat: nycClient.latitude, lng: nycClient.longitude })
  })

  it('uses property coords when they plausibly belong to the same client', () => {
    const coords = bookingCoords({ client_properties: nearbyProperty, clients: nycClient })
    expect(coords).toEqual({ lat: nearbyProperty.latitude, lng: nearbyProperty.longitude })
  })

  it('trusts property coords when the client has no coords to compare against', () => {
    const coords = bookingCoords({ client_properties: baltimoreProperty, clients: { address: 'unknown' } })
    expect(coords).toEqual({ lat: baltimoreProperty.latitude, lng: baltimoreProperty.longitude })
  })

  it('applyPropertyToBookingClient keeps the property address but not its untrustworthy coords', () => {
    const booking = { client_properties: baltimoreProperty, clients: { ...nycClient } }
    applyPropertyToBookingClient(booking)
    expect(booking.clients.address).toBe(baltimoreProperty.address)
    expect(booking.clients.latitude).toBe(nycClient.latitude)
    expect(booking.clients.longitude).toBe(nycClient.longitude)
  })

  it('applyPropertyToBookingClient adopts both address and coords when trustworthy', () => {
    const booking = { client_properties: nearbyProperty, clients: { ...nycClient } }
    applyPropertyToBookingClient(booking)
    expect(booking.clients.address).toBe(nearbyProperty.address)
    expect(booking.clients.latitude).toBe(nearbyProperty.latitude)
    expect(booking.clients.longitude).toBe(nearbyProperty.longitude)
  })
})
