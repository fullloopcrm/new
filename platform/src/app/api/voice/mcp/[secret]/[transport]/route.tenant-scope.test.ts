import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * This one URL shape serves TWO agents: FullLoop's own prospect line (global
 * VOICE_MCP_TOKEN) and any tenant's customer-facing agent
 * (tenants.voice_agent_mcp_secret) — same path, so an xAI assistant already
 * configured with this URL never needs reconfiguring after a domain cutover.
 * Proves: the global secret still serves prospect tools, a tenant secret
 * serves ONLY that tenant's customer tools, tenant A's secret never reaches
 * tenant B's tools, and an unmatched/shared secret fails closed (404).
 */

const TENANT_A = 'tenant-a'
const TENANT_B = 'tenant-b'
const SECRET_A = 'secret-for-a'
const SECRET_B = 'secret-for-b'
const PROSPECT_SECRET = 'prospect-global-secret'

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
vi.mock('@/lib/voice-agent/tools', () => ({
  getPricing: vi.fn(async () => 'pricing'),
  checkSlotAvailability: vi.fn(),
  submitApplication: vi.fn(),
  logCallNote: vi.fn(),
}))

vi.hoisted(() => {
  // Module-level `const SECRET = process.env.VOICE_MCP_TOKEN` in route.ts is
  // read at import time — must be set before the route module is imported.
  // (Literal, not the outer PROSPECT_SECRET const — vi.hoisted bodies run
  // before that binding exists.)
  process.env.VOICE_MCP_TOKEN = 'prospect-global-secret'
})

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
  return new Request(`http://x/api/voice/mcp/${secret}/mcp`, { method: 'POST', body: JSON.stringify(body) })
}

describe('voice MCP route — serves prospect vs tenant agents by secret', () => {
  it('wrong secret -> 404', async () => {
    const res = await POST(rpcReq('nope', { jsonrpc: '2.0', id: 1, method: 'tools/list' }), {
      params: Promise.resolve({ secret: 'nope', transport: 'mcp' }),
    })
    expect(res.status).toBe(404)
  })

  it('the global prospect secret still lists FullLoop prospect tools', async () => {
    const res = await POST(rpcReq(PROSPECT_SECRET, { jsonrpc: '2.0', id: 1, method: 'tools/list' }), {
      params: Promise.resolve({ secret: PROSPECT_SECRET, transport: 'mcp' }),
    })
    const body = await res.json()
    const names = body.result.tools.map((t: { name: string }) => t.name)
    expect(names).toContain('submit_application')
    expect(names).not.toContain('create_booking')
  })

  it("tenant A's secret only ever calls tools with tenant A's id", async () => {
    const res = await POST(
      rpcReq(SECRET_A, {
        jsonrpc: '2.0', id: 1, method: 'tools/call',
        params: { name: 'lookup_client', arguments: { caller_phone: '2125551234' } },
      }),
      { params: Promise.resolve({ secret: SECRET_A, transport: 'mcp' }) },
    )
    expect(res.status).toBe(200)
    expect(lookupClientSpy).toHaveBeenCalledWith(TENANT_A, '2125551234')
    expect(lookupClientSpy).not.toHaveBeenCalledWith(TENANT_B, expect.anything())
  })

  it("tenant B's secret lists customer tools, never FullLoop's prospect tools", async () => {
    const res = await POST(rpcReq(SECRET_B, { jsonrpc: '2.0', id: 1, method: 'tools/list' }), {
      params: Promise.resolve({ secret: SECRET_B, transport: 'mcp' }),
    })
    const body = await res.json()
    const names = body.result.tools.map((t: { name: string }) => t.name)
    expect(names).toContain('create_booking')
    expect(names).not.toContain('submit_application')
  })

  it('a secret shared by two tenants (misconfiguration) fails closed', async () => {
    fake._seed('tenants', [{ id: 'tenant-c', voice_agent_mcp_secret: SECRET_A }])
    const res = await GET(new Request(`http://x/api/voice/mcp/${SECRET_A}/mcp`), {
      params: Promise.resolve({ secret: SECRET_A, transport: 'mcp' }),
    })
    expect(res.status).toBe(404)
  })
})
