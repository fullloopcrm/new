import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { resolveTenantSmsCredentials, hasTenantSms } from './sms-credentials'

describe('resolveTenantSmsCredentials', () => {
  // The platform-fallback tests below need to control TELNYX_API_KEY/
  // TELNYX_PHONE deliberately (on and off). Every OTHER test in this file
  // is testing pure tenant-column precedence and must not be affected by
  // whatever the ambient shell/CI environment happens to have set — clear
  // both vars by default so those tests stay deterministic regardless of
  // the real dev/prod env.
  beforeEach(() => {
    vi.stubEnv('TELNYX_API_KEY', '')
    vi.stubEnv('TELNYX_PHONE', '')
  })
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('prefers telnyx_phone over sms_number when both are set', () => {
    const creds = resolveTenantSmsCredentials({
      telnyx_api_key: 'key-1',
      telnyx_phone: '+15551234567',
      sms_number: '+15559999999',
    })
    expect(creds).toEqual({ apiKey: 'key-1', phone: '+15551234567' })
  })

  it('BUG-CLASS PROBE: falls back to sms_number when telnyx_phone is unset', () => {
    // The gap this closes: jefe/actions.ts already applies telnyx_phone ||
    // sms_number (provisionChecklist + notifyTenantOwner), but every other
    // caller read telnyx_phone alone — a tenant with only the legacy
    // sms_number column populated silently looked "not configured" for SMS
    // everywhere except Jefe.
    const creds = resolveTenantSmsCredentials({
      telnyx_api_key: 'key-1',
      telnyx_phone: null,
      sms_number: '+15559999999',
    })
    expect(creds).toEqual({ apiKey: 'key-1', phone: '+15559999999' })
  })

  it('falls back to sms_number when telnyx_phone is an empty string', () => {
    const creds = resolveTenantSmsCredentials({
      telnyx_api_key: 'key-1',
      telnyx_phone: '',
      sms_number: '+15559999999',
    })
    expect(creds.phone).toBe('+15559999999')
  })

  it('returns null phone when neither column is set', () => {
    const creds = resolveTenantSmsCredentials({ telnyx_api_key: 'key-1', telnyx_phone: null, sms_number: null })
    expect(creds.phone).toBeNull()
  })

  it('returns null apiKey when telnyx_api_key is unset, independent of phone resolution', () => {
    const creds = resolveTenantSmsCredentials({ telnyx_api_key: null, telnyx_phone: '+15551234567', sms_number: null })
    expect(creds).toEqual({ apiKey: null, phone: '+15551234567' })
  })

  it('handles a null/undefined tenant without throwing', () => {
    expect(resolveTenantSmsCredentials(null)).toEqual({ apiKey: null, phone: null })
    expect(resolveTenantSmsCredentials(undefined)).toEqual({ apiKey: null, phone: null })
  })

  it('WRONG-TENANT PROBE: resolving credentials for one tenant never leaks another tenant\'s fields — each call is independent, no shared state', () => {
    const tenantA = { telnyx_api_key: 'a-key', telnyx_phone: null, sms_number: 'a-sms-number' }
    const tenantB = { telnyx_api_key: 'b-key', telnyx_phone: 'b-telnyx-phone', sms_number: 'b-sms-number' }

    const credsA1 = resolveTenantSmsCredentials(tenantA)
    const credsB = resolveTenantSmsCredentials(tenantB)
    const credsA2 = resolveTenantSmsCredentials(tenantA)

    expect(credsA1).toEqual({ apiKey: 'a-key', phone: 'a-sms-number' })
    expect(credsB).toEqual({ apiKey: 'b-key', phone: 'b-telnyx-phone' })
    // Re-resolving A after resolving B must give the exact same result — no
    // cross-call contamination from B's fields leaking into A's resolution.
    expect(credsA2).toEqual(credsA1)
    expect(credsA2.phone).not.toBe(tenantB.sms_number)
    expect(credsA2.apiKey).not.toBe(tenantB.telnyx_api_key)
  })

  describe('platform fallback', () => {
    it('BUG-CLASS PROBE: falls back to the platform Telnyx account when the tenant has configured neither field', () => {
      // Before this fix, a tenant with no telnyx_api_key/telnyx_phone of its
      // own resolved to { apiKey: null, phone: null } even when the platform
      // maintains its own shared Telnyx account for exactly this case — the
      // same tenant-first-then-platform precedence already live for email
      // (defaultResend), Stripe (getStripe), and voice (resolveTenantVoiceConfig).
      vi.stubEnv('TELNYX_API_KEY', 'platform-key')
      vi.stubEnv('TELNYX_PHONE', '+18885550000')

      const creds = resolveTenantSmsCredentials({ telnyx_api_key: null, telnyx_phone: null, sms_number: null })
      expect(creds).toEqual({ apiKey: 'platform-key', phone: '+18885550000' })
    })

    it('a tenant with its OWN key/phone never falls through to the platform account, even when one is configured', () => {
      vi.stubEnv('TELNYX_API_KEY', 'platform-key')
      vi.stubEnv('TELNYX_PHONE', '+18885550000')

      const creds = resolveTenantSmsCredentials({
        telnyx_api_key: 'tenant-own-key',
        telnyx_phone: '+15551234567',
        sms_number: null,
      })
      expect(creds).toEqual({ apiKey: 'tenant-own-key', phone: '+15551234567' })
    })

    it('falls back independently per field — tenant\'s own key with the platform phone, and vice versa', () => {
      vi.stubEnv('TELNYX_API_KEY', 'platform-key')
      vi.stubEnv('TELNYX_PHONE', '+18885550000')

      const tenantHasKeyOnly = resolveTenantSmsCredentials({ telnyx_api_key: 'tenant-key', telnyx_phone: null, sms_number: null })
      expect(tenantHasKeyOnly).toEqual({ apiKey: 'tenant-key', phone: '+18885550000' })

      const tenantHasPhoneOnly = resolveTenantSmsCredentials({ telnyx_api_key: null, telnyx_phone: '+15551234567', sms_number: null })
      expect(tenantHasPhoneOnly).toEqual({ apiKey: 'platform-key', phone: '+15551234567' })
    })

    it('platformFallback: false opts out entirely, even when the platform account is configured', () => {
      // lib/jefe/actions.ts's notifyTenantOwner() contract: the tenant's OWN
      // channel or manual_contact — never a silent send off the shared
      // platform account on the owner's behalf.
      vi.stubEnv('TELNYX_API_KEY', 'platform-key')
      vi.stubEnv('TELNYX_PHONE', '+18885550000')

      const creds = resolveTenantSmsCredentials(
        { telnyx_api_key: null, telnyx_phone: null, sms_number: null },
        { platformFallback: false },
      )
      expect(creds).toEqual({ apiKey: null, phone: null })
    })

    it('does not fall back when the platform env vars are unset or blank', () => {
      vi.stubEnv('TELNYX_API_KEY', '')
      vi.stubEnv('TELNYX_PHONE', '   ')

      const creds = resolveTenantSmsCredentials({ telnyx_api_key: null, telnyx_phone: null, sms_number: null })
      expect(creds).toEqual({ apiKey: null, phone: null })
    })

    it('WRONG-TENANT PROBE: the platform fallback is a shared constant, never derived from another tenant\'s row', () => {
      vi.stubEnv('TELNYX_API_KEY', 'platform-key')
      vi.stubEnv('TELNYX_PHONE', '+18885550000')

      const tenantA = { telnyx_api_key: null, telnyx_phone: null, sms_number: null }
      const tenantB = { telnyx_api_key: 'b-key', telnyx_phone: 'b-phone', sms_number: null }

      const credsA1 = resolveTenantSmsCredentials(tenantA)
      const credsB = resolveTenantSmsCredentials(tenantB)
      const credsA2 = resolveTenantSmsCredentials(tenantA)

      // A falls back to the platform account both times, completely
      // unaffected by resolving B (tenant B's own key/phone) in between.
      expect(credsA1).toEqual({ apiKey: 'platform-key', phone: '+18885550000' })
      expect(credsA2).toEqual(credsA1)
      expect(credsB).toEqual({ apiKey: 'b-key', phone: 'b-phone' })
      expect(credsA2.apiKey).not.toBe(tenantB.telnyx_api_key)
      expect(credsA2.phone).not.toBe(tenantB.telnyx_phone)
    })
  })
})

describe('hasTenantSms', () => {
  beforeEach(() => {
    vi.stubEnv('TELNYX_API_KEY', '')
    vi.stubEnv('TELNYX_PHONE', '')
  })
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('true when both api key and telnyx_phone are set', () => {
    expect(hasTenantSms({ telnyx_api_key: 'k', telnyx_phone: '+15551234567', sms_number: null })).toBe(true)
  })

  it('BUG-CLASS PROBE: true when api key set and only sms_number (legacy) is set', () => {
    expect(hasTenantSms({ telnyx_api_key: 'k', telnyx_phone: null, sms_number: '+15559999999' })).toBe(true)
  })

  it('false when api key is missing even if a phone column is set', () => {
    expect(hasTenantSms({ telnyx_api_key: null, telnyx_phone: '+15551234567', sms_number: '+15559999999' })).toBe(false)
  })

  it('false when neither phone column is set even if api key is present', () => {
    expect(hasTenantSms({ telnyx_api_key: 'k', telnyx_phone: null, sms_number: null })).toBe(false)
  })

  it('false for a null tenant', () => {
    expect(hasTenantSms(null)).toBe(false)
  })

  it('BUG-CLASS PROBE: true when the tenant has no fields but the platform account is configured', () => {
    vi.stubEnv('TELNYX_API_KEY', 'platform-key')
    vi.stubEnv('TELNYX_PHONE', '+18885550000')
    expect(hasTenantSms({ telnyx_api_key: null, telnyx_phone: null, sms_number: null })).toBe(true)
  })

  it('false when the tenant has no fields and platformFallback is explicitly disabled', () => {
    vi.stubEnv('TELNYX_API_KEY', 'platform-key')
    vi.stubEnv('TELNYX_PHONE', '+18885550000')
    expect(
      hasTenantSms({ telnyx_api_key: null, telnyx_phone: null, sms_number: null }, { platformFallback: false }),
    ).toBe(false)
  })
})
