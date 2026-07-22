import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * Tenant-resolution probe for the customer-facing voice-agent MCP route.
 * The whole security model here is: the URL secret is the ONLY auth, and it
 * must resolve to exactly one tenant. Proves a tenant A secret never reaches
 * tenant B's tools, and an unmatched/shared secret fails closed (404) rather
 * than picking an arbitrary tenant.
 */

const TENANT_A = 'tenant-a'
const TENANT_B = 'tenant-b'
const SECRET_A = 'secret-for-a'
const SECRET_B = 'secret-for-b'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

const lookupClientSpy = vi.fn(async (tenantId: string, _phone: string) => JSON.stringify({ tenantId }))
vi.mock('@/lib/voice-agent/customer-tools', () => ({
  voiceLookupClient: (tenantId: string, phone: string) => lookupClientSpy(tenantId, phone),
  voiceLookupBookings: vi.fn(),
  voiceCheckAvailability: vi.fn(),
  voiceCreateBooking: vi.fn(),
  voiceCheckPayment: vi.fn(),
  voiceLogEscalation: vi.fn(),
  voiceGetQuote: vi.fn(),
  voiceSaveNote: vi.fn(),
  voiceSaveCaller: vi.fn(),
  voiceSendBookingLink: vi.fn(),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { POST, GET } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  fake._store.clear()
  lookupClientSpy.mockClear()
  fake._seed('tenants', [
    { id: TENANT_A, voice_agent_mcp_secret: SECRET_A },
    { id: TENANT_B, voice_agent_mcp_secret: SECRET_B },
  ])
})

function rpcReq(secret: string, body: unknown): Request {
  return new Request(`http://x/api/voice/customer-mcp/${secret}/mcp`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('customer voice-agent MCP route — tenant resolution', () => {
  it('wrong secret -> 404, never leaks tool access', async () => {
    const res = await POST(rpcReq('not-a-real-secret', { jsonrpc: '2.0', id: 1, method: 'tools/list' }), {
      params: Promise.resolve({ secret: 'not-a-real-secret', transport: 'mcp' }),
    })
    expect(res.status).toBe(404)
  })

  it("tenant A's secret only ever calls tools with tenant A's id", async () => {
    const res = await POST(
      rpcReq(SECRET_A, {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'lookup_client', arguments: { caller_phone: '2125551234' } },
      }),
      { params: Promise.resolve({ secret: SECRET_A, transport: 'mcp' }) },
    )
    expect(res.status).toBe(200)
    expect(lookupClientSpy).toHaveBeenCalledWith(TENANT_A, '2125551234')
    expect(lookupClientSpy).not.toHaveBeenCalledWith(TENANT_B, expect.anything())
  })

  it("tenant B's secret resolves to tenant B, not A", async () => {
    await POST(
      rpcReq(SECRET_B, {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'lookup_client', arguments: { caller_phone: '2125559999' } },
      }),
      { params: Promise.resolve({ secret: SECRET_B, transport: 'mcp' }) },
    )
    expect(lookupClientSpy).toHaveBeenCalledWith(TENANT_B, '2125559999')
  })

  it('a secret shared by two tenants (misconfiguration) fails closed instead of picking one', async () => {
    fake._seed('tenants', [{ id: 'tenant-c', voice_agent_mcp_secret: SECRET_A }])
    const res = await GET(new Request(`http://x/api/voice/customer-mcp/${SECRET_A}/mcp`), {
      params: Promise.resolve({ secret: SECRET_A, transport: 'mcp' }),
    })
    expect(res.status).toBe(404)
  })

  it('tools/list reflects the full customer tool set', async () => {
    const res = await POST(rpcReq(SECRET_A, { jsonrpc: '2.0', id: 1, method: 'tools/list' }), {
      params: Promise.resolve({ secret: SECRET_A, transport: 'mcp' }),
    })
    const body = await res.json()
    const names = body.result.tools.map((t: { name: string }) => t.name)
    expect(names).toEqual(
      expect.arrayContaining([
        'lookup_client',
        'lookup_bookings',
        'check_availability',
        'create_booking',
        'check_payment',
        'log_escalation',
        'get_quote',
        'save_note',
        'save_caller',
        'send_booking_link',
      ]),
    )
  })
})
