import { describe, it, expect } from 'vitest'
import { resolveTenantSmsCredentials, hasTenantSms } from './sms-credentials'

describe('resolveTenantSmsCredentials', () => {
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
})

describe('hasTenantSms', () => {
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
})
