import { describe, it, expect, vi } from 'vitest'

/**
 * The 'telnyxPhone' profile field (PROFILE_FIELDS, section 'comms') feeds the
 * onboarding-readiness completeness % and section fill counts
 * (lib/tenant-readiness.ts). It read tenants.telnyx_phone alone, unlike
 * resolveTenantSmsCredentials()'s established telnyx_phone||sms_number
 * precedence — a tenant with only the legacy sms_number column populated
 * showed a false "not filled" here, understating readiness for a field that
 * (per notify.ts and every other SMS call site) is actually configured.
 */

let tenantRow: Record<string, unknown> | null = null

vi.mock('./supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'tenants') {
        return { select: () => ({ eq: () => ({ single: async () => ({ data: tenantRow }) }) }) }
      }
      if (table === 'entities') {
        return { select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }) }
      }
      // service_types
      return { select: () => ({ eq: async () => ({ data: [] }) }) }
    },
  },
}))

import { PROFILE_FIELD_BY_KEY, getTenantProfile, isFilled } from './tenant-profile'

describe('telnyxPhone profile field', () => {
  it('prefers telnyx_phone over sms_number when both are set', () => {
    const value = PROFILE_FIELD_BY_KEY.telnyxPhone.read({
      tenant: { telnyx_phone: '+15551234567', sms_number: '+15559999999' },
      entity: null, selena: {}, social: {}, compliance: {}, services: [],
    })
    expect(value).toBe('+15551234567')
  })

  it('BUG-CLASS PROBE: falls back to sms_number when telnyx_phone is unset', () => {
    const value = PROFILE_FIELD_BY_KEY.telnyxPhone.read({
      tenant: { telnyx_phone: null, sms_number: '+15559999999' },
      entity: null, selena: {}, social: {}, compliance: {}, services: [],
    })
    expect(value).toBe('+15559999999')
    expect(isFilled(value)).toBe(true)
  })

  it('still writes to the canonical telnyx_phone column, not sms_number', () => {
    expect(PROFILE_FIELD_BY_KEY.telnyxPhone.col).toBe('telnyx_phone')
  })

  it('is unfilled when neither column is set', () => {
    const value = PROFILE_FIELD_BY_KEY.telnyxPhone.read({
      tenant: { telnyx_phone: null, sms_number: null },
      entity: null, selena: {}, social: {}, compliance: {}, services: [],
    })
    expect(isFilled(value)).toBe(false)
  })
})

describe('getTenantProfile telnyxPhone integration', () => {
  it('WRONG-TENANT PROBE: readiness for one tenant never derives from another tenant\'s columns', async () => {
    tenantRow = {
      id: 'tenant-a', name: 'A', slug: 'a', status: 'active',
      telnyx_phone: null, sms_number: 'a-sms-number', selena_config: {}, compliance: {},
    }
    const profileA = await getTenantProfile('tenant-a')
    const fieldA = profileA?.fields.find((f) => f.key === 'telnyxPhone')
    expect(fieldA?.value).toBe('a-sms-number')
    expect(fieldA?.filled).toBe(true)

    tenantRow = {
      id: 'tenant-b', name: 'B', slug: 'b', status: 'active',
      telnyx_phone: null, sms_number: null, selena_config: {}, compliance: {},
    }
    const profileB = await getTenantProfile('tenant-b')
    const fieldB = profileB?.fields.find((f) => f.key === 'telnyxPhone')
    expect(fieldB?.value).toBeFalsy()
    expect(fieldB?.filled).toBe(false)
  })
})
