import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Regression lock for a real bug found live: an admin's cell dial for the
 * ring-cascade is created with answering_machine_detection:'detect_beep',
 * but the code bridged (and started recording) on the admin leg's plain
 * call.answered event alone — which Telnyx fires whether a HUMAN or a
 * MACHINE (voicemail) picks up. An admin who never actually answered (their
 * own carrier voicemail picked up while they were on another call) got
 * logged as "Admin picked up" and had the call bridged/recorded into their
 * own voicemail greeting.
 *
 * The real AMD result only arrives via the separate call.machine.detection.ended
 * event (payload.result: 'human' | 'machine'). Bridging must wait for that
 * and gate on result === 'human'; a 'machine' result must hang up the leg
 * instead, same as a real no-answer.
 */

const TENANT_A = 'tenant-a'
const DID_A = '+15550001111'
const CUSTOMER_CALL_ID = 'customer-cc-1'
const ADMIN_CALL_ID = 'admin-cc-1'

const mock = vi.hoisted(() => {
  process.env.TELNYX_API_KEY = 'test-key'
  process.env.TELNYX_VOICE_CONNECTION_ID = 'conn-1'

  const state = {
    tenantRows: [] as Array<{ id: string; name: string }>,
    fetchCalls: [] as Array<{ url: string; body: Record<string, unknown> | null }>,
    activeCalls: [] as Array<Record<string, unknown>>,
  }

  function makeChain(table: string) {
    let customerCallIdFilter: string | null = null
    let pendingPatch: Record<string, unknown> | null = null
    const chain: Record<string, unknown> = {
      select: () => chain,
      insert: (row: Record<string, unknown>) => {
        if (table === 'comhub_active_calls') state.activeCalls.push({ ...row })
        return chain
      },
      update: (patch: Record<string, unknown>) => {
        pendingPatch = patch
        return chain
      },
      eq: (col: string, val: string) => {
        if (col === 'customer_call_id') customerCallIdFilter = val
        if (table === 'comhub_active_calls' && pendingPatch && col === 'customer_call_id') {
          const row = state.activeCalls.find(r => r.customer_call_id === val)
          if (row) Object.assign(row, pendingPatch)
        }
        return chain
      },
      or: () => chain,
      gte: () => chain,
      order: () => chain,
      limit: async () =>
        table === 'tenants' ? { data: state.tenantRows, error: null } : { data: [], error: null },
      single: async () => {
        if (table === 'comhub_active_calls' && customerCallIdFilter) {
          const row = state.activeCalls.find(r => r.customer_call_id === customerCallIdFilter)
          return { data: row ?? null, error: null }
        }
        return { data: null, error: null }
      },
      then: (resolve: (v: { data: unknown; error: null }) => void) => resolve({ data: null, error: null }),
    }
    return chain
  }

  const supabaseAdmin = {
    from: (table: string) => makeChain(table),
    rpc: async () => ({ data: null, error: null }),
  }

  return { state, supabaseAdmin }
})

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: mock.supabaseAdmin }))
vi.mock('@/lib/nycmaid/sms', () => ({ sendSMS: vi.fn(async () => ({ success: true })) }))

import { POST } from './route'

function makeRequest(body: string): Request {
  return new Request('http://localhost/api/webhooks/telnyx-voice', { method: 'POST', headers: new Headers({}), body })
}

function adminLegEvent(eventType: string, extraPayload: Record<string, unknown> = {}): string {
  return JSON.stringify({
    data: {
      event_type: eventType,
      payload: {
        call_control_id: ADMIN_CALL_ID,
        ...extraPayload,
        custom_headers: [
          { name: 'X-Comhub-Leg', value: 'admin' },
          { name: 'X-Comhub-Customer-Call', value: CUSTOMER_CALL_ID },
          { name: 'X-Comhub-Ring-Index', value: '0' },
        ],
      },
    },
  })
}

beforeEach(() => {
  mock.state.tenantRows = [{ id: TENANT_A, name: 'Tenant A' }]
  mock.state.fetchCalls = []
  mock.state.activeCalls = [
    {
      tenant_id: TENANT_A,
      customer_call_id: CUSTOMER_CALL_ID,
      thread_id: 'thread-1',
      contact_id: 'contact-1',
      customer_phone: DID_A,
      direction: 'inbound',
      status: 'ringing',
      admin_phone: '+15551110000',
    },
  ]
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
      mock.state.fetchCalls.push({ url: String(url), body })
      return { ok: true, json: async () => ({ data: {} }), text: async () => '' }
    }),
  )
})

describe('telnyx-voice — admin-leg answered must not bridge without AMD confirming human', () => {
  it('call.answered alone does NOT bridge or start recording', async () => {
    await POST(makeRequest(adminLegEvent('call.answered')) as never)

    const bridgeCall = mock.state.fetchCalls.find(c => c.url.includes('/actions/bridge'))
    expect(bridgeCall).toBeUndefined()
    const recordCall = mock.state.fetchCalls.find(c => c.url.includes('/actions/record_start'))
    expect(recordCall).toBeUndefined()
    expect(mock.state.activeCalls[0].status).toBe('ringing')
  })

  it('call.machine.detection.ended with result:"machine" hangs up the leg, never bridges', async () => {
    await POST(makeRequest(adminLegEvent('call.answered')) as never)
    await POST(makeRequest(adminLegEvent('call.machine.detection.ended', { result: 'machine' })) as never)

    const bridgeCall = mock.state.fetchCalls.find(c => c.url.includes('/actions/bridge'))
    expect(bridgeCall).toBeUndefined()
    const hangupCall = mock.state.fetchCalls.find(c => c.url.includes(`/${ADMIN_CALL_ID}/actions/hangup`))
    expect(hangupCall).toBeDefined()
    expect(mock.state.activeCalls[0].status).toBe('ringing')
  })

  it('call.machine.detection.ended with result:"human" bridges and marks the call answered', async () => {
    await POST(makeRequest(adminLegEvent('call.answered')) as never)
    await POST(makeRequest(adminLegEvent('call.machine.detection.ended', { result: 'human' })) as never)

    const bridgeCall = mock.state.fetchCalls.find(c => c.url.includes('/actions/bridge'))
    expect(bridgeCall).toBeDefined()
    const recordCall = mock.state.fetchCalls.find(c => c.url.includes('/actions/record_start'))
    expect(recordCall).toBeDefined()
    expect(mock.state.activeCalls[0].status).toBe('bridged')
    expect(mock.state.activeCalls[0].answered_at).toBeTruthy()
  })
})
