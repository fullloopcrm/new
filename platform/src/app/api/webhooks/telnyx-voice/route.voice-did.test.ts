import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * tenants.telnyx_phone doubles as the SMS "from" address across ~50 call
 * sites in this codebase — it must never be repurposed for a voice-only DID
 * (that regression happened once already: a tenant's inbound-call number got
 * written into telnyx_phone to fix voice routing, which silently broke every
 * outbound SMS for that tenant since telnyx_phone is also what sendSMS()
 * sends from). voice_did is the correct, separate column for that case.
 * resolveVoiceTenant() must match either column. This is the one test file
 * in this directory whose mock actually filters the tenants table by the
 * dialed DID (the others simulate found/not-found purely via seeded state) —
 * needed because .or() has to be proven to actually narrow to ONE tenant,
 * not just "return whatever was seeded."
 */

const TENANT_SMS_ONLY = 'tenant-sms-only'
const TENANT_SPLIT = 'tenant-split-voice'
const SMS_NUMBER = '+15550001111'
const VOICE_NUMBER = '+18885550000'

const mock = vi.hoisted(() => {
  process.env.TELNYX_API_KEY = 'test-key'
  process.env.TELNYX_VOICE_CONNECTION_ID = 'conn-1'

  const state = {
    tenants: [] as Array<{ id: string; name: string; telnyx_phone: string | null; voice_did: string | null }>,
  }

  function makeChain(table: string) {
    let orFilter: string | null = null
    const chain: Record<string, unknown> = {
      select: () => chain,
      insert: () => chain,
      update: () => chain,
      eq: () => chain,
      or: (filter: string) => {
        orFilter = filter
        return chain
      },
      gte: () => chain,
      order: () => chain,
      limit: async () => {
        if (table !== 'tenants') return { data: [], error: null }
        if (!orFilter) return { data: state.tenants, error: null }
        // Real (not no-op) parse of "telnyx_phone.eq.X,voice_did.eq.Y" — proves
        // the actual filter narrows correctly, not just "seeded state happens
        // to be right."
        const conditions = orFilter.split(',').map((c) => {
          const [col, , val] = c.split('.')
          return { col, val }
        })
        const matched = state.tenants.filter((t) =>
          conditions.some((c) => (t as Record<string, unknown>)[c.col] === c.val),
        )
        return { data: matched, error: null }
      },
      single: async () => ({ data: null, error: null }),
      then: (resolve: (v: { data: unknown; error: null }) => void) => resolve({ data: null, error: null }),
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
  mock.state.tenants = []
  process.env.TELNYX_VOICE_WEBHOOK_VERIFY = 'off'
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({}), text: async () => '' })))
})

describe('resolveVoiceTenant — matches telnyx_phone OR voice_did', () => {
  it('resolves via telnyx_phone for a tenant with no split (voice_did null)', async () => {
    mock.state.tenants = [{ id: TENANT_SMS_ONLY, name: 'SMS Only', telnyx_phone: SMS_NUMBER, voice_did: null }]
    const res = await POST(makeRequest(inboundCall(SMS_NUMBER)) as never)
    expect(res.status).toBe(200)
  })

  it('resolves via voice_did for a tenant whose SMS number differs from its voice DID', async () => {
    mock.state.tenants = [{ id: TENANT_SPLIT, name: 'Split Tenant', telnyx_phone: SMS_NUMBER, voice_did: VOICE_NUMBER }]
    const res = await POST(makeRequest(inboundCall(VOICE_NUMBER)) as never)
    expect(res.status).toBe(200)
  })

  it('a split tenant\'s SMS number still resolves to itself for voice too (both columns live)', async () => {
    mock.state.tenants = [{ id: TENANT_SPLIT, name: 'Split Tenant', telnyx_phone: SMS_NUMBER, voice_did: VOICE_NUMBER }]
    const res = await POST(makeRequest(inboundCall(SMS_NUMBER)) as never)
    expect(res.status).toBe(200)
  })

  it('rejects a DID matching neither column on any tenant (404, fail closed)', async () => {
    mock.state.tenants = [{ id: TENANT_SPLIT, name: 'Split Tenant', telnyx_phone: SMS_NUMBER, voice_did: VOICE_NUMBER }]
    const res = await POST(makeRequest(inboundCall('+19998887777')) as never)
    expect(res.status).toBe(404)
  })

  it('fails closed (409) when a DID matches telnyx_phone on one tenant and voice_did on another', async () => {
    mock.state.tenants = [
      { id: TENANT_SMS_ONLY, name: 'SMS Only', telnyx_phone: VOICE_NUMBER, voice_did: null },
      { id: TENANT_SPLIT, name: 'Split Tenant', telnyx_phone: SMS_NUMBER, voice_did: VOICE_NUMBER },
    ]
    const res = await POST(makeRequest(inboundCall(VOICE_NUMBER)) as never)
    expect(res.status).toBe(409)
  })
})
