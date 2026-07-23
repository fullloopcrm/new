import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./supabase', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}))

import { updateProperty } from './client-properties'
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

  it('passes per-address phone + comm-pref toggles straight through to the update patch', async () => {
    const before: Row = {
      id: 'prop-1',
      address: '123 Old St, Apt 4B',
      unit: 'Apt 4B',
      label: null,
      latitude: 1,
      longitude: 2,
    }
    const updateSpy = mockClientPropertiesFlow(before)

    await updateProperty('client-1', 'prop-1', { phone: '212-555-0100', sms_ok: false, email_ok: true, call_ok: false })

    const patchSent = updateSpy.mock.calls[0][0]
    expect(patchSent.phone).toBe('212-555-0100')
    expect(patchSent.sms_ok).toBe(false)
    expect(patchSent.email_ok).toBe(true)
    expect(patchSent.call_ok).toBe(false)
    // address/unit untouched when not part of this patch
    expect(patchSent.address).toBeUndefined()
  })
})
