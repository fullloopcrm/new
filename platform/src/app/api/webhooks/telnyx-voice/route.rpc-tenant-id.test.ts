import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 regression lock: comhub_get_or_create_contact_by_phone and
 * comhub_get_or_create_thread both require p_tenant_id (no default in the
 * Postgres function signature — see migrations/2026_05_19_comhub.sql). The
 * route previously called both RPCs WITHOUT p_tenant_id (and the thread RPC
 * without validating it either), which — against the REAL Postgres function —
 * fails to resolve (missing required argument) on every single inbound call,
 * silently short-circuiting to `{ ok: true, note: 'contact create failed' }`
 * before the customer's call is ever answered or an admin is rung. The
 * pre-existing route.admin-ring-scope.test.ts mock ignored the params object
 * entirely, so it could never catch this. This mock asserts on args to close
 * that gap.
 */

const mock = vi.hoisted(() => {
  process.env.TELNYX_API_KEY = 'test-key'
  process.env.TELNYX_VOICE_CONNECTION_ID = 'conn-1'

  const TENANT_A = 'tenant-a'
  const state = {
    tenantRows: [{ id: TENANT_A, name: 'Tenant A' }] as Array<{ id: string; name: string }>,
    rpcCalls: [] as Array<{ fn: string; params: Record<string, unknown> }>,
    fetchCalls: [] as Array<{ url: string }>,
  }

  function makeChain(table: string) {
    const chain: Record<string, unknown> = {
      select: () => chain,
      insert: () => chain,
      update: () => chain,
      eq: () => chain,
      or: () => chain,
      gte: () => chain,
      order: () => chain,
      limit: async () =>
        table === 'tenants' ? { data: state.tenantRows, error: null } : { data: [], error: null },
      single: async () => ({ data: null, error: null }),
      then: (resolve: (v: { data: unknown; error: null }) => void) => {
        resolve({ data: [], error: null })
      },
    }
    return chain
  }

  const supabaseAdmin = {
    from: (table: string) => makeChain(table),
    // Mirrors the REAL Postgres function contract: p_tenant_id is required
    // (no DEFAULT) for both RPCs — a call missing it must fail, exactly like
    // PostgREST would against the actual function signature.
    rpc: async (fn: string, params: Record<string, unknown> = {}) => {
      state.rpcCalls.push({ fn, params })
      if (fn === 'comhub_get_or_create_contact_by_phone') {
        if (!params.p_tenant_id) return { data: null, error: { message: 'p_tenant_id required' } }
        return { data: 'contact-1', error: null }
      }
      if (fn === 'comhub_get_or_create_thread') {
        if (!params.p_tenant_id) return { data: null, error: { message: 'p_tenant_id required' } }
        if (!params.p_channel) return { data: null, error: { message: 'p_channel required' } }
        return { data: 'thread-1', error: null }
      }
      return { data: null, error: null }
    },
  }

  return { state, supabaseAdmin }
})

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: mock.supabaseAdmin }))
vi.mock('@/lib/nycmaid/sms', () => ({ sendSMS: vi.fn(async () => ({ success: true })) }))

import { POST } from './route'

const TENANT_A = 'tenant-a'
const DID_A = '+15550001111'

function makeRequest(body: string): Request {
  return new Request('http://localhost/api/webhooks/telnyx-voice', {
    method: 'POST',
    headers: new Headers({}),
    body,
  })
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
  mock.state.rpcCalls = []
  mock.state.fetchCalls = []
  process.env.TELNYX_WEBHOOK_VERIFY = 'off'
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      mock.state.fetchCalls.push({ url: String(url) })
      return { ok: true, json: async () => ({ data: { call_control_id: 'admin-cc-1' } }), text: async () => '' }
    }),
  )
})

describe('telnyx-voice — get-or-create RPCs are called with the resolved tenant_id', () => {
  it('passes p_tenant_id to comhub_get_or_create_contact_by_phone', async () => {
    await POST(makeRequest(inboundCall(DID_A)) as never)
    const call = mock.state.rpcCalls.find(c => c.fn === 'comhub_get_or_create_contact_by_phone')
    expect(call).toBeDefined()
    expect(call!.params.p_tenant_id).toBe(TENANT_A)
  })

  it('passes p_tenant_id to comhub_get_or_create_thread', async () => {
    await POST(makeRequest(inboundCall(DID_A)) as never)
    const call = mock.state.rpcCalls.find(c => c.fn === 'comhub_get_or_create_thread')
    expect(call).toBeDefined()
    expect(call!.params.p_tenant_id).toBe(TENANT_A)
    expect(call!.params.p_channel).toBe('voice')
  })

  it('actually answers the customer leg (does not short-circuit on "contact create failed")', async () => {
    const res = await POST(makeRequest(inboundCall(DID_A)) as never)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.note).not.toBe('contact create failed')
    expect(body.note).not.toBe('thread create failed')
    const answerCall = mock.state.fetchCalls.find(c => c.url.includes('/actions/answer'))
    expect(answerCall).toBeDefined()
  })
})
