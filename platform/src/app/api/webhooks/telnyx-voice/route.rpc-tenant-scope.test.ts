import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * The comhub RPCs `comhub_get_or_create_contact_by_phone` and
 * `comhub_get_or_create_thread` both require `p_tenant_id` (no SQL default —
 * see migrations/2026_05_19_comhub.sql). This webhook previously called both
 * WITHOUT p_tenant_id, which Postgres rejects as "function does not exist"
 * for that argument list. Because the call is only answered (telnyxAction
 * 'answer') *after* this contact/thread resolution succeeds, the bug meant
 * every inbound call silently short-circuited with `note: 'contact create
 * failed'` and was never answered. Fixed by stamping NYCMAID_TENANT_ID on
 * both RPC calls, matching every other write in this file.
 */

const rpcCalls: Array<{ fn: string; args: Record<string, unknown> }> = []

function chainable(): unknown {
  const node: Record<string, unknown> = {}
  const methods = ['select', 'eq', 'gte', 'order', 'limit', 'update', 'insert', 'upsert']
  for (const m of methods) node[m] = () => node
  node.single = () => Promise.resolve({ data: { id: 'msg-1' }, error: null })
  node.maybeSingle = () => Promise.resolve({ data: null, error: null })
  // Allow `await` directly on a chain (e.g. plain .update().eq(...) with no terminal select).
  node.then = (resolve: (v: { data: unknown[]; error: null }) => void) => resolve({ data: [], error: null })
  return node
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => chainable(),
    rpc: (fn: string, args: Record<string, unknown>) => {
      rpcCalls.push({ fn, args })
      if (fn === 'comhub_get_or_create_contact_by_phone') return Promise.resolve({ data: 'contact-1', error: null })
      if (fn === 'comhub_get_or_create_thread') return Promise.resolve({ data: 'thread-1', error: null })
      return Promise.resolve({ data: null, error: null })
    },
  },
}))
vi.mock('@/lib/nycmaid/sms', () => ({ sendSMS: async () => ({ success: true }) }))

function inboundCallReq(): Request {
  const body = JSON.stringify({
    data: {
      event_type: 'call.initiated',
      payload: { call_control_id: 'cc1', from: '+15550001111', direction: 'incoming' },
    },
  })
  return {
    text: async () => body,
    headers: { get: () => null },
  } as unknown as Request
}

describe('telnyx-voice webhook — comhub RPC tenant scoping', () => {
  beforeEach(() => {
    vi.resetModules()
    rpcCalls.length = 0
    delete process.env.TELNYX_PUBLIC_KEY
    // Must be unset before the module loads (TELNYX_API_KEY is read into a
    // module-scope const) so telnyxAction() no-ops instead of making a real
    // outbound call to Telnyx's live API.
    delete process.env.TELNYX_API_KEY
  })

  it('passes p_tenant_id on comhub_get_or_create_contact_by_phone and comhub_get_or_create_thread', async () => {
    const { POST } = await import('./route')
    const res = await POST(inboundCallReq() as never)

    expect(res.status).toBe(200)
    const body = await res.json()
    // A regression back to the missing-param bug returns { ok: true, note: 'contact create failed' }
    // and never reaches the answer step — assert we did NOT short-circuit.
    expect(body.note).not.toBe('contact create failed')
    expect(body.note).not.toBe('thread create failed')

    const contactCall = rpcCalls.find((c) => c.fn === 'comhub_get_or_create_contact_by_phone')
    const threadCall = rpcCalls.find((c) => c.fn === 'comhub_get_or_create_thread')
    expect(contactCall?.args.p_tenant_id).toBe('00000000-0000-0000-0000-000000000001')
    expect(threadCall?.args.p_tenant_id).toBe('00000000-0000-0000-0000-000000000001')
  })
})
