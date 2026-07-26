import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Voice-agent (Yinez over xAI SIP) hand-off gate, tenant-scoped.
 *
 * A tenant with both xai_sip_username + xai_sip_password set gets inbound
 * calls transferred to xAI via a Telnyx Call Control `transfer` action
 * instead of the normal admin-ring flow. Absence of either cred, or a failed
 * transfer, must fall through to the existing ring/voicemail path — a down
 * or unconfigured agent must never mean dead air. Also proves tenant B's
 * creds never leak into tenant A's call.
 */

const TENANT_A = 'tenant-a'
const TENANT_B = 'tenant-b'
const DID_A = '+15550001111'

const mock = vi.hoisted(() => {
  process.env.TELNYX_API_KEY = 'test-key'
  process.env.TELNYX_VOICE_CONNECTION_ID = 'conn-1'

  const state = {
    tenantRows: [] as Array<{ id: string; name: string }>,
    tenantCreds: {} as Record<string, { xai_sip_username: string | null; xai_sip_password: string | null }>,
    voiceSettingsRows: [] as Array<{ tenant_id: string; admin_id: string; fallback_cell_phone: string }>,
    fetchCalls: [] as Array<{ url: string; to: string | null; body: Record<string, unknown> | null }>,
    transferShouldFail: false,
  }

  function makeChain(table: string) {
    let idFilter: string | null = null
    let tenantFilter: string | null = null
    const chain: Record<string, unknown> = {
      select: () => chain,
      insert: () => chain,
      update: () => chain,
      eq: (col: string, val: string) => {
        if (col === 'id') idFilter = val
        if (col === 'tenant_id') tenantFilter = val
        return chain
      },
      or: () => chain,
      gte: () => chain,
      order: () => chain,
      limit: async () =>
        table === 'tenants' ? { data: state.tenantRows, error: null } : { data: [], error: null },
      single: async () => {
        if (table === 'tenants' && idFilter) {
          return { data: state.tenantCreds[idFilter] ?? null, error: null }
        }
        return { data: null, error: null }
      },
      then: (resolve: (v: { data: unknown; error: null }) => void) => {
        if (table === 'comhub_admin_voice_settings') {
          resolve({ data: state.voiceSettingsRows.filter((r) => r.tenant_id === tenantFilter), error: null })
          return
        }
        resolve({ data: null, error: null })
      },
    }
    return chain
  }

  const supabaseAdmin = {
    from: (table: string) => makeChain(table),
    rpc: async (fn: string) => {
      if (fn === 'comhub_get_or_create_contact_by_phone') return { data: 'contact-1', error: null }
      if (fn === 'comhub_get_or_create_thread') return { data: 'thread-1', error: null }
      return { data: null, error: null }
    },
  }

  return { state, supabaseAdmin }
})

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: mock.supabaseAdmin }))
vi.mock('@/lib/nycmaid/sms', () => ({ sendSMS: vi.fn(async () => ({ success: true })) }))
vi.mock('@/lib/secret-crypto', () => ({ decryptSecret: (v: string) => v }))

import { POST } from './route'

function makeRequest(body: string): Request {
  return new Request('http://localhost/api/webhooks/telnyx-voice', { method: 'POST', headers: new Headers({}), body })
}

function inboundCall(to: string): string {
  return JSON.stringify({
    data: {
      event_type: 'call.initiated',
      payload: { call_control_id: 'cc-1', from: '+15559998888', to, direction: 'incoming' },
    },
  })
}

beforeEach(() => {
  mock.state.tenantRows = []
  mock.state.tenantCreds = {}
  mock.state.voiceSettingsRows = []
  mock.state.fetchCalls = []
  mock.state.transferShouldFail = false
  process.env.TELNYX_VOICE_WEBHOOK_VERIFY = 'off'
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: { body?: string }) => {
      let body: Record<string, unknown> | null = null
      try {
        body = init?.body ? JSON.parse(init.body) : null
      } catch {
        body = null
      }
      mock.state.fetchCalls.push({ url: String(url), to: (body?.to as string) ?? null, body })
      if (String(url).includes('/actions/transfer') && mock.state.transferShouldFail) {
        return { ok: false, json: async () => ({}), text: async () => 'transfer rejected' }
      }
      return { ok: true, json: async () => ({ data: { call_control_id: 'admin-cc-1' } }), text: async () => '' }
    }),
  )
})

describe('telnyx-voice — voice-agent (xAI) hand-off gate', () => {
  it('transfers to xAI with the tenant\'s own SIP creds when both are configured', async () => {
    mock.state.tenantRows = [{ id: TENANT_A, name: 'Tenant A' }]
    mock.state.tenantCreds[TENANT_A] = { xai_sip_username: 'nycmaid-user', xai_sip_password: 'nycmaid-pass' }

    const res = await POST(makeRequest(inboundCall(DID_A)) as never)
    const json = await res.json()
    expect(json.routed).toBe('agent')

    const transferCall = mock.state.fetchCalls.find((c) => c.url.includes('/actions/transfer'))
    expect(transferCall).toBeDefined()
    expect(transferCall!.to).toBe('sip:+15550001111@sip.voice.x.ai;transport=tls')
    expect(transferCall!.body?.sip_auth_username).toBe('nycmaid-user')
    expect(transferCall!.body?.sip_auth_password).toBe('nycmaid-pass')

    // Never falls through to the ring/dial path once handed to the agent.
    const dialCall = mock.state.fetchCalls.find((c) => c.url === 'https://api.telnyx.com/v2/calls')
    expect(dialCall).toBeUndefined()
  })

  it('never uses tenant B\'s creds for tenant A\'s call', async () => {
    mock.state.tenantRows = [{ id: TENANT_A, name: 'Tenant A' }]
    mock.state.tenantCreds[TENANT_A] = { xai_sip_username: null, xai_sip_password: null }
    mock.state.tenantCreds[TENANT_B] = { xai_sip_username: 'other-tenant-user', xai_sip_password: 'other-tenant-pass' }
    mock.state.voiceSettingsRows = [{ tenant_id: TENANT_A, admin_id: 'admin-a', fallback_cell_phone: '+15551110000' }]

    await POST(makeRequest(inboundCall(DID_A)) as never)

    const transferCall = mock.state.fetchCalls.find((c) => c.url.includes('/actions/transfer'))
    expect(transferCall).toBeUndefined()
    const dialCall = mock.state.fetchCalls.find((c) => c.url === 'https://api.telnyx.com/v2/calls')
    expect(dialCall).toBeDefined()
    expect(dialCall!.to).toBe('+15551110000')
  })

  it('falls through to normal ring when creds are absent', async () => {
    mock.state.tenantRows = [{ id: TENANT_A, name: 'Tenant A' }]
    mock.state.tenantCreds[TENANT_A] = { xai_sip_username: null, xai_sip_password: null }
    mock.state.voiceSettingsRows = [{ tenant_id: TENANT_A, admin_id: 'admin-a', fallback_cell_phone: '+15551110000' }]

    const res = await POST(makeRequest(inboundCall(DID_A)) as never)
    const json = await res.json()
    expect(json.routed).not.toBe('agent')

    const dialCall = mock.state.fetchCalls.find((c) => c.url === 'https://api.telnyx.com/v2/calls')
    expect(dialCall).toBeDefined()
    expect(dialCall!.to).toBe('+15551110000')
  })

  it('falls through to normal ring when the xAI transfer itself fails (down agent never means dead air)', async () => {
    mock.state.tenantRows = [{ id: TENANT_A, name: 'Tenant A' }]
    mock.state.tenantCreds[TENANT_A] = { xai_sip_username: 'nycmaid-user', xai_sip_password: 'nycmaid-pass' }
    mock.state.voiceSettingsRows = [{ tenant_id: TENANT_A, admin_id: 'admin-a', fallback_cell_phone: '+15551110000' }]
    mock.state.transferShouldFail = true

    const res = await POST(makeRequest(inboundCall(DID_A)) as never)
    const json = await res.json()
    expect(json.routed).not.toBe('agent')

    const dialCall = mock.state.fetchCalls.find((c) => c.url === 'https://api.telnyx.com/v2/calls')
    expect(dialCall).toBeDefined()
    expect(dialCall!.to).toBe('+15551110000')
  })
})
