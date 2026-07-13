import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * telnyx-voice webhook — previously 0 tests. Regression coverage for a
 * real bug flagged in deploy-prep/telnyx-voice-tenant-scope-fix-proposal.md
 * (Finding 1): the inbound-call handler called
 * `comhub_get_or_create_contact_by_phone` / `comhub_get_or_create_thread`
 * without the required `p_tenant_id` argument. Both Postgres functions
 * (migrations/2026_05_19_comhub.sql) declare `p_tenant_id UUID` with no
 * default, so PostgREST can't resolve the call — every other caller in the
 * repo (admin/comhub/voice/dial, etc.) passes it. Without it, `rpc()` errors,
 * `data` comes back null, and the handler early-returns before ever
 * answering the inbound call — i.e. no live call was ever getting answered
 * through this codepath. Fixed by passing the file's existing
 * `NYCMAID_TENANT_ID` constant (already used for every write in this file).
 */

let capturedRpcCalls: Array<{ name: string; args: Record<string, unknown> }>

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    rpc: (name: string, args: Record<string, unknown>) => {
      capturedRpcCalls.push({ name, args })
      if (name === 'comhub_get_or_create_contact_by_phone') {
        return Promise.resolve({ data: 'contact-1', error: null })
      }
      if (name === 'comhub_get_or_create_thread') {
        return Promise.resolve({ data: 'thread-1', error: null })
      }
      return Promise.resolve({ data: null, error: null })
    },
    from: () => {
      const chain = {
        select: () => chain,
        insert: () => chain,
        update: () => chain,
        eq: () => chain,
        gte: () => chain,
        limit: () => chain,
        order: () => chain,
        single: () => Promise.resolve({ data: { id: 'row-1' }, error: null }),
        then: (resolve: (v: unknown) => void) => resolve({ data: [], error: null }),
      }
      return chain
    },
  },
}))

vi.mock('@/lib/nycmaid/sms', () => ({
  sendSMS: async () => ({ success: true }),
}))

// telnyxAction() reads TELNYX_API_KEY into a module-level const at import
// time, so deleting it from process.env in beforeEach is too late to stop a
// real outbound call if the ambient shell environment has one set (it does
// in this sandbox — TELNYX_API_KEY is exported globally, unrelated to this
// repo). Stub fetch unconditionally so this test can never hit the live
// Telnyx API no matter what the environment holds.
const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
  new Response(JSON.stringify({ data: {} }), { status: 200 }),
)

import { POST } from './route'

beforeEach(() => {
  capturedRpcCalls = []
  fetchSpy.mockClear()
  delete process.env.TELNYX_PUBLIC_KEY
  // This suite tests inbound-call business logic (comhub RPC tenant scoping),
  // not signature verification (see route.auth.test.ts for that) — bypass the
  // fail-closed Ed25519 gate so these requests reach the RPC calls.
  process.env.TELNYX_VOICE_WEBHOOK_VERIFY = 'off'
  delete process.env.ADMIN_RING_LIST
  delete process.env.ADMIN_FORWARD_PHONE
})

function inboundCallRequest() {
  return new NextRequest('http://localhost/api/webhooks/telnyx-voice', {
    method: 'POST',
    body: JSON.stringify({
      data: {
        event_type: 'call.initiated',
        payload: {
          call_control_id: 'call-abc',
          from: '+15551234567',
          to: '+18883164019',
          direction: 'incoming',
          custom_headers: [],
        },
      },
    }),
  })
}

describe('POST /api/webhooks/telnyx-voice — inbound call, comhub RPC tenant scoping', () => {
  it('passes p_tenant_id (the NYCMAID_TENANT_ID constant) to comhub_get_or_create_contact_by_phone', async () => {
    await POST(inboundCallRequest())
    const call = capturedRpcCalls.find((c) => c.name === 'comhub_get_or_create_contact_by_phone')
    expect(call).toBeDefined()
    expect(call?.args.p_tenant_id).toBe('00000000-0000-0000-0000-000000000001')
    expect(call?.args.p_phone).toBe('+15551234567')
  })

  it('passes p_tenant_id (the NYCMAID_TENANT_ID constant) to comhub_get_or_create_thread', async () => {
    await POST(inboundCallRequest())
    const call = capturedRpcCalls.find((c) => c.name === 'comhub_get_or_create_thread')
    expect(call).toBeDefined()
    expect(call?.args.p_tenant_id).toBe('00000000-0000-0000-0000-000000000001')
    expect(call?.args.p_contact_id).toBe('contact-1')
    expect(call?.args.p_channel).toBe('voice')
  })
})
