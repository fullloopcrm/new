import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * comhub-voice-config.ts resolves the outbound caller-ID number (fromNumber)
 * for the ComHub softphone (click-to-call, admin/comhub/voice/dial). Until
 * this fix it read tenants.telnyx_phone alone, unlike resolveTenantSmsCredentials()
 * (lib/sms-credentials.ts) which established telnyx_phone||sms_number as the
 * correct precedence — sms_number predates telnyx_phone and is still
 * independently writable via the admin settings API. A tenant with its own
 * full Telnyx voice account (api key + connection id) but only the legacy
 * sms_number column populated would silently dial FROM the platform's shared
 * number instead of its own — a real caller-ID mismatch, and likely a hard
 * Telnyx rejection since a connection generally can't originate from a number
 * it doesn't own.
 *
 * The module's ENV block is a plain const captured at import time (unlike
 * sms-credentials.ts's platform*() helpers, which deliberately read
 * process.env at call time so tests can stub per-case). So every test here
 * stubs env vars THEN dynamically re-imports the module via
 * vi.resetModules() to get a fresh ENV snapshot, instead of relying on a
 * top-level import picking up a beforeEach stub.
 */

let tenantRow: Record<string, unknown> | null = null

vi.mock('./supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: tenantRow }),
        }),
      }),
    }),
  },
}))

vi.mock('./secret-crypto', () => ({
  decryptSecret: (v: string) => v, // identity for plaintext test fixtures, matches real passthrough behavior
}))

async function loadResolver() {
  vi.resetModules()
  const mod = await import('./comhub-voice-config')
  return mod.resolveTenantVoiceConfig
}

describe('resolveTenantVoiceConfig', () => {
  beforeEach(() => {
    vi.stubEnv('TELNYX_API_KEY', 'platform-key')
    vi.stubEnv('TELNYX_VOICE_CONNECTION_ID', 'platform-conn')
    vi.stubEnv('TELNYX_TELEPHONY_CREDENTIAL_ID', 'platform-cred')
    vi.stubEnv('TELNYX_CREDENTIAL_CONNECTION_ID', 'platform-cred-conn')
    vi.stubEnv('TELNYX_FROM_NUMBER', '+18883164019')
    tenantRow = null
  })
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns platform env config when tenantId is null/undefined', async () => {
    const resolveTenantVoiceConfig = await loadResolver()
    const expected = {
      apiKey: 'platform-key',
      voiceConnectionId: 'platform-conn',
      telephonyCredentialId: 'platform-cred',
      credentialConnectionId: 'platform-cred-conn',
      fromNumber: '+18883164019',
    }
    expect(await resolveTenantVoiceConfig(null)).toEqual(expected)
    expect(await resolveTenantVoiceConfig(undefined)).toEqual(expected)
  })

  it('returns platform env config when no tenant row is found', async () => {
    const resolveTenantVoiceConfig = await loadResolver()
    tenantRow = null
    const cfg = await resolveTenantVoiceConfig('missing-tenant')
    expect(cfg.fromNumber).toBe('+18883164019')
  })

  it('prefers telnyx_phone over sms_number when both are set', async () => {
    const resolveTenantVoiceConfig = await loadResolver()
    tenantRow = {
      telnyx_api_key: 'tenant-key',
      telnyx_phone: '+15551234567',
      sms_number: '+15559999999',
      telnyx_voice_connection_id: 'tenant-conn',
      telnyx_telephony_credential_id: 'tenant-cred',
      telnyx_credential_connection_id: 'tenant-cred-conn',
    }
    const cfg = await resolveTenantVoiceConfig('t1')
    expect(cfg.fromNumber).toBe('+15551234567')
  })

  it('BUG-CLASS PROBE: falls back to sms_number for fromNumber when telnyx_phone is unset', async () => {
    // The gap this closes: a tenant with a fully-configured own Telnyx voice
    // account (api key + connection id) but only the legacy sms_number
    // column populated previously fell all the way through to the platform's
    // shared fromNumber, mismatched against its own account/connection.
    const resolveTenantVoiceConfig = await loadResolver()
    tenantRow = {
      telnyx_api_key: 'tenant-key',
      telnyx_phone: null,
      sms_number: '+15559999999',
      telnyx_voice_connection_id: 'tenant-conn',
      telnyx_telephony_credential_id: 'tenant-cred',
      telnyx_credential_connection_id: 'tenant-cred-conn',
    }
    const cfg = await resolveTenantVoiceConfig('t1')
    expect(cfg.fromNumber).toBe('+15559999999')
    expect(cfg.apiKey).toBe('tenant-key')
    expect(cfg.voiceConnectionId).toBe('tenant-conn')
  })

  it('falls back to the platform fromNumber only when neither telnyx_phone nor sms_number is set', async () => {
    const resolveTenantVoiceConfig = await loadResolver()
    tenantRow = {
      telnyx_api_key: 'tenant-key',
      telnyx_phone: null,
      sms_number: null,
      telnyx_voice_connection_id: 'tenant-conn',
      telnyx_telephony_credential_id: null,
      telnyx_credential_connection_id: null,
    }
    const cfg = await resolveTenantVoiceConfig('t1')
    expect(cfg.fromNumber).toBe('+18883164019')
    expect(cfg.telephonyCredentialId).toBe('platform-cred')
    expect(cfg.credentialConnectionId).toBe('platform-cred-conn')
  })

  it('falls back to sms_number even when telnyx_phone is an empty string', async () => {
    const resolveTenantVoiceConfig = await loadResolver()
    tenantRow = { telnyx_api_key: 'k', telnyx_phone: '', sms_number: '+15559999999' }
    const cfg = await resolveTenantVoiceConfig('t1')
    expect(cfg.fromNumber).toBe('+15559999999')
  })

  it('decrypts a stored telnyx_api_key and falls back to platform key when unset', async () => {
    const resolveTenantVoiceConfig = await loadResolver()
    tenantRow = { telnyx_api_key: null, telnyx_phone: '+15551234567', sms_number: null }
    const cfg = await resolveTenantVoiceConfig('t1')
    expect(cfg.apiKey).toBe('platform-key')
  })

  it('WRONG-TENANT PROBE: resolving one tenant\'s voice config never leaks another tenant\'s fields', async () => {
    const resolveTenantVoiceConfig = await loadResolver()
    const tenantA = {
      telnyx_api_key: 'a-key',
      telnyx_phone: null,
      sms_number: 'a-sms-number',
      telnyx_voice_connection_id: 'a-conn',
      telnyx_telephony_credential_id: 'a-cred',
      telnyx_credential_connection_id: 'a-cred-conn',
    }
    const tenantB = {
      telnyx_api_key: 'b-key',
      telnyx_phone: 'b-telnyx-phone',
      sms_number: 'b-sms-number',
      telnyx_voice_connection_id: 'b-conn',
      telnyx_telephony_credential_id: 'b-cred',
      telnyx_credential_connection_id: 'b-cred-conn',
    }

    tenantRow = tenantA
    const credsA1 = await resolveTenantVoiceConfig('tenant-a')

    tenantRow = tenantB
    const credsB = await resolveTenantVoiceConfig('tenant-b')

    tenantRow = tenantA
    const credsA2 = await resolveTenantVoiceConfig('tenant-a')

    expect(credsA1.fromNumber).toBe('a-sms-number')
    expect(credsB.fromNumber).toBe('b-telnyx-phone')
    expect(credsA2).toEqual(credsA1)
    expect(credsA2.fromNumber).not.toBe(tenantB.telnyx_phone)
    expect(credsA2.fromNumber).not.toBe(tenantB.sms_number)
    expect(credsA2.apiKey).not.toBe(tenantB.telnyx_api_key)
  })
})
