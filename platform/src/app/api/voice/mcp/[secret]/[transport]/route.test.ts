import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Voice MCP server — per-tenant secret gating. Each tenant's xAI Custom MCP
 * connector hits /api/voice/mcp/<their voice_mcp_token>/mcp with no other
 * auth (xAI's connector can't send a static Bearer header), so the
 * secret->tenant resolution here is the entire security boundary: a
 * wrong/unset secret must 404 rather than leak which tenant it belongs to
 * or fall back to any default tenant.
 */

let tokenTenant: { id: string } | null = { id: 'tenant-1' }
vi.mock('@/lib/voice/xai-voice-config', () => ({
  resolveTenantByVoiceMcpToken: vi.fn(async (secret: string) => (secret ? tokenTenant : null)),
}))

vi.mock('@/lib/voice/mcp-tools', () => ({
  voiceLookupClient: vi.fn(async () => '{}'),
  voiceLookupBookings: vi.fn(async () => '{}'),
  voiceCheckAvailability: vi.fn(async () => '{}'),
  voiceCreateBooking: vi.fn(async () => '{}'),
  voiceCheckPayment: vi.fn(async () => '{}'),
  voiceLogEscalation: vi.fn(async () => '{}'),
  voiceGetQuote: vi.fn(async () => '{}'),
  voiceSaveNote: vi.fn(async () => '{}'),
  voiceSaveCaller: vi.fn(async () => '{}'),
  voiceSendBookingLink: vi.fn(async () => '{}'),
}))

function ctx(secret: string) {
  return { params: Promise.resolve({ secret, transport: 'mcp' }) }
}

function rpcReq(body: object): Request {
  return { json: async () => body } as unknown as Request
}

beforeEach(() => {
  tokenTenant = { id: 'tenant-1' }
})

describe('voice MCP server — secret-to-tenant gating', () => {
  it('404s a wrong/unconfigured secret without leaking tenant info', async () => {
    tokenTenant = null
    const { POST } = await import('./route')
    const res = await POST(rpcReq({ jsonrpc: '2.0', id: 1, method: 'tools/list' }), ctx('wrong-secret'))
    expect(res.status).toBe(404)
  })

  it('404s an empty secret', async () => {
    const { POST } = await import('./route')
    const res = await POST(rpcReq({ jsonrpc: '2.0', id: 1, method: 'tools/list' }), ctx(''))
    expect(res.status).toBe(404)
  })

  it('serves tools/list for a valid tenant secret and exposes all 10 tools', async () => {
    const { POST } = await import('./route')
    const res = await POST(rpcReq({ jsonrpc: '2.0', id: 1, method: 'tools/list' }), ctx('good-secret'))
    expect(res.status).toBe(200)
    const body = await res.json()
    const names = body.result.tools.map((t: { name: string }) => t.name)
    expect(names).toEqual(
      expect.arrayContaining([
        'lookup_client', 'lookup_bookings', 'check_availability', 'create_booking',
        'check_payment', 'log_escalation', 'save_note', 'get_quote',
        'send_booking_link', 'save_caller',
      ]),
    )
  })

  it('dispatches tools/call to the matching tool implementation', async () => {
    const mcpTools = await import('@/lib/voice/mcp-tools')
    const { POST } = await import('./route')
    const res = await POST(
      rpcReq({
        jsonrpc: '2.0', id: 2, method: 'tools/call',
        params: { name: 'lookup_client', arguments: { caller_phone: '+15551234567' } },
      }),
      ctx('good-secret'),
    )
    expect(res.status).toBe(200)
    expect(mcpTools.voiceLookupClient).toHaveBeenCalledWith('tenant-1', '+15551234567')
  })

  it('GET probe 404s a wrong secret and 200s a valid one', async () => {
    const { GET } = await import('./route')
    tokenTenant = null
    const bad = await GET({} as Request, ctx('wrong'))
    expect(bad.status).toBe(404)

    tokenTenant = { id: 'tenant-1' }
    const good = await GET({} as Request, ctx('good-secret'))
    expect(good.status).toBe(200)
  })
})
