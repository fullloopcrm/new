import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

/**
 * /api/webhooks/telnyx-voice — flag-gated SIP routing to the Yinez/Selena
 * voice agent (port of nycmaid's 25c162bf), tenant-scoped.
 *
 * Covers: (1) a resolved, non-nycmaid tenant with voice_agent_enabled=true
 * gets its call transferred to xAI over SIP, marked 'bridged', and never
 * reaches the ring/voicemail flow; (2) a resolved tenant with the agent
 * disabled (or resolution failing) falls through unchanged to ring/
 * voicemail, matching pre-existing behavior.
 */

const sendSMS = vi.fn(async (..._args: unknown[]) => ({ success: true }))
vi.mock('@/lib/nycmaid/sms', () => ({ sendSMS: (...args: unknown[]) => sendSMS(...args) }))

let resolvedTenant: { id: string } | null = { id: 'tenant-other' }
vi.mock('@/lib/voice/tenant-by-phone', () => ({
  resolveTenantByToNumber: vi.fn(async () => resolvedTenant),
}))

let xaiConfig = { enabled: false, sipUsername: '', sipPassword: '' }
vi.mock('@/lib/voice/xai-voice-config', () => ({
  resolveXaiVoiceAgentConfig: vi.fn(async () => xaiConfig),
}))

vi.mock('@/lib/comhub-voice-config', () => ({
  resolveTenantVoiceConfig: vi.fn(async () => ({
    apiKey: 'tenant-telnyx-key',
    voiceConnectionId: '',
    telephonyCredentialId: '',
    credentialConnectionId: '',
    fromNumber: '+18883164019',
  })),
}))

const updates: Array<{ table: string; values: Record<string, unknown> }> = []
const rpc = vi.fn(async (name: string) => {
  if (name === 'comhub_get_or_create_contact_by_phone') return { data: 'contact1', error: null }
  if (name === 'comhub_get_or_create_thread') return { data: 'thread1', error: null }
  return { data: null, error: null }
})

function chainable(table: string) {
  const obj: Record<string, unknown> = {}
  const methods = ['select', 'eq', 'gte', 'order', 'limit', 'or']
  for (const m of methods) obj[m] = vi.fn(() => obj)
  obj.update = vi.fn((values: Record<string, unknown>) => {
    updates.push({ table, values })
    return obj
  })
  obj.insert = vi.fn(() => obj)
  obj.single = vi.fn(async () => ({ data: { status: 'active', id: 'msg1' }, error: null }))
  obj.then = (resolve: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(resolve)
  return obj
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => chainable(table),
    rpc,
  },
}))

const originalFetch = global.fetch
const fetchCalls: string[] = []

function req(body: object): Request {
  const rawBody = JSON.stringify(body)
  return {
    text: async () => rawBody,
    headers: { get: () => null },
  } as unknown as Request
}

function callInitiatedPayload() {
  return {
    data: {
      event_type: 'call.initiated',
      payload: {
        call_control_id: 'call1',
        call_session_id: 'sess1',
        from: '+15551234567',
        to: '+15559998888',
        direction: 'incoming',
      },
    },
  }
}

beforeEach(() => {
  vi.resetModules()
  rpc.mockClear()
  sendSMS.mockClear()
  updates.length = 0
  fetchCalls.length = 0
  resolvedTenant = { id: 'tenant-other' }
  xaiConfig = { enabled: false, sipUsername: '', sipPassword: '' }
  global.fetch = vi.fn(async (url: string) => {
    fetchCalls.push(String(url))
    return { ok: true, json: async () => ({ data: {} }), text: async () => '' } as unknown as Response
  }) as unknown as typeof fetch
})

afterEach(() => {
  // fetch is a global we set manually — restore it explicitly so later
  // test files aren't affected.
  global.fetch = originalFetch
})

describe('telnyx-voice webhook — voice agent SIP routing', () => {
  it('routes to the agent and marks the call bridged when the resolved tenant has it enabled', async () => {
    xaiConfig = { enabled: true, sipUsername: 'xai-user', sipPassword: 'xai-pass' }
    const { POST } = await import('./route')
    const res = await POST(req(callInitiatedPayload()) as unknown as import('next/server').NextRequest)
    const body = await res.json()

    expect(body).toEqual({ ok: true, routed: 'agent' })
    // The transfer call hit Telnyx's transfer action.
    expect(fetchCalls.some((u) => u.includes('/actions/transfer'))).toBe(true)
    // The active-call row was marked bridged so the hangup handler won't
    // fire a missed-call SMS for a call the agent actually answered.
    expect(updates.some((u) => u.table === 'comhub_active_calls' && u.values.status === 'bridged')).toBe(true)
  })

  it('falls through to ring/voicemail when the resolved tenant has the agent disabled', async () => {
    xaiConfig = { enabled: false, sipUsername: '', sipPassword: '' }
    const { POST } = await import('./route')
    const res = await POST(req(callInitiatedPayload()) as unknown as import('next/server').NextRequest)
    const body = await res.json()

    expect(body.routed).toBeUndefined()
    expect(fetchCalls.some((u) => u.includes('/actions/transfer'))).toBe(false)
  })

  it('falls back to nycmaid and still processes the call when tenant-by-phone resolution fails', async () => {
    resolvedTenant = null
    xaiConfig = { enabled: false, sipUsername: '', sipPassword: '' }
    const { POST } = await import('./route')
    const res = await POST(req(callInitiatedPayload()) as unknown as import('next/server').NextRequest)
    const body = await res.json()

    expect(body.skip).not.toBe('tenant_not_active')
    expect(rpc).toHaveBeenCalledWith('comhub_get_or_create_contact_by_phone', expect.objectContaining({
      p_tenant_id: '00000000-0000-0000-0000-000000000001',
    }))
  })
})
