import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { signTenantHeader } from '@/lib/tenant-header-sig'

/**
 * Regression: /api/yinez used to trust a RAW x-tenant-id header with no signature
 * check, unlike its siblings /api/chat + /api/errors. On the main host a caller
 * could forge `x-tenant-id: <victim>` and (a) have the returning-client phone
 * lookup read that victim's clients, and (b) scope the new conversation into the
 * victim's tenant. The fix routes tenant derivation through verifyTenantHeaderSig,
 * so an unsigned/forged id is dropped to undefined.
 *
 * These tests prove: a forged/unsigned x-tenant-id performs NO tenant-scoped read
 * and writes NO tenant_id; only a middleware-signed id selects the tenant.
 */

const SECRET = 'yinez-route-test-secret'

// Shared capture + chainable supabase mock, hoisted so vi.mock can reference it.
const h = vi.hoisted(() => {
  const captured = {
    clientLookups: [] as unknown[], // tenant_id values the clients table was filtered by
    convoInsert: null as Record<string, unknown> | null,
    convoLookupIds: [] as string[], // ids the sms_conversations table was looked up by (reuse path)
  }
  // Configurable per-test: what an existing-conversation-by-id lookup returns.
  let existingConvo: { id: string; tenant_id: string | null } | null = null

  function makeBuilder(table: string) {
    const builder: Record<string, unknown> = {}
    let lastIdEq: unknown = undefined
    Object.assign(builder, {
      select: () => builder,
      eq: (col: string, val: unknown) => {
        if (table === 'clients' && col === 'tenant_id') captured.clientLookups.push(val)
        if (table === 'sms_conversations' && col === 'id') lastIdEq = val
        return builder
      },
      ilike: () => builder,
      limit: () => builder,
      // clients returning-client lookup terminates here
      single: () => Promise.resolve({ data: null, error: null }),
      // sms_conversations reuse-check lookup terminates here
      maybeSingle: () => {
        if (table === 'sms_conversations' && lastIdEq !== undefined) {
          captured.convoLookupIds.push(lastIdEq as string)
          return Promise.resolve({ data: existingConvo, error: null })
        }
        return Promise.resolve({ data: null, error: null })
      },
      insert: (payload: Record<string, unknown>) => {
        if (table === 'sms_conversations') captured.convoInsert = payload
        // Supports both shapes: `.insert(x)` awaited directly (messages) and
        // `.insert(x).select('id').single()` (conversation create).
        const ins: Record<string, unknown> = {
          select: () => ({
            single: () => Promise.resolve({ data: { id: 'convo-1' }, error: null }),
          }),
          then: (resolve: (v: unknown) => unknown) => resolve({ data: null, error: null }),
        }
        return ins
      },
    })
    return builder
  }

  const supabaseAdmin = { from: (table: string) => makeBuilder(table) }
  return {
    captured,
    supabaseAdmin,
    setExistingConvo: (v: { id: string; tenant_id: string | null } | null) => { existingConvo = v },
  }
})

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: h.supabaseAdmin }))
vi.mock('@/lib/selena/core', () => ({ EMPTY_CHECKLIST: {} }))
vi.mock('@/lib/selena/agent', () => ({
  askSelena: vi.fn(async (_channel: string, _message: string, conversationId: string) =>
    ({ text: 'hello from yinez', bookingCreated: false, conversationId })),
}))
vi.mock('@/lib/nycmaid/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/nycmaid/conversation-scorer', () => ({
  scoreConversation: vi.fn(async () => {}),
  selfReviewConversation: vi.fn(async () => {}),
}))

// Import the route AFTER the mocks are registered.
import { POST } from './route'
import { askSelena } from '@/lib/selena/agent'

const VICTIM = 'tenant-victim'
const ATTACKER_TENANT = 'tenant-attacker'

function post(headers: Record<string, string>, body: Record<string, unknown> = {}) {
  return new NextRequest('https://app.fullloop.example/api/yinez', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify({ message: 'hi', phone: '5551234567', ...body }),
  })
}

beforeAll(() => {
  process.env.TENANT_HEADER_SIG_SECRET = SECRET
})

beforeEach(() => {
  h.captured.clientLookups = []
  h.captured.convoInsert = null
  h.captured.convoLookupIds = []
  h.setExistingConvo(null)
  vi.mocked(askSelena).mockClear()
})

describe('POST /api/yinez — forgeable x-tenant-id tenant wall', () => {
  it('forged x-tenant-id (no signature) does NOT read the victim tenant and does NOT scope the write', async () => {
    const res = await POST(post({ 'x-tenant-id': VICTIM }))

    expect(res.status).toBe(200)
    // No tenant-scoped client read happened.
    expect(h.captured.clientLookups).toEqual([])
    // The conversation was NOT written into the victim tenant.
    expect(h.captured.convoInsert?.tenant_id).toBeUndefined()
  })

  it('forged x-tenant-id with a bogus signature is also rejected', async () => {
    const res = await POST(post({ 'x-tenant-id': VICTIM, 'x-tenant-sig': 'deadbeef'.repeat(8) }))

    expect(res.status).toBe(200)
    expect(h.captured.clientLookups).toEqual([])
    expect(h.captured.convoInsert?.tenant_id).toBeUndefined()
  })

  it("another tenant's valid signature cannot select the victim (sig is bound to its own id)", async () => {
    // Attacker holds a legit sig for tenant-other but sends x-tenant-id: victim.
    const otherSig = signTenantHeader('tenant-other')
    const res = await POST(post({ 'x-tenant-id': VICTIM, 'x-tenant-sig': otherSig }))

    expect(res.status).toBe(200)
    expect(h.captured.clientLookups).toEqual([])
    expect(h.captured.convoInsert?.tenant_id).toBeUndefined()
  })

  it('a middleware-signed x-tenant-id DOES scope both the read and the write', async () => {
    const sig = signTenantHeader(VICTIM)
    const res = await POST(post({ 'x-tenant-id': VICTIM, 'x-tenant-sig': sig }))

    expect(res.status).toBe(200)
    // Returning-client lookup is scoped to the signed tenant only.
    expect(h.captured.clientLookups).toEqual([VICTIM])
    // Conversation is written into the signed tenant.
    expect(h.captured.convoInsert?.tenant_id).toBe(VICTIM)
  })
})

describe('POST /api/yinez — caller-supplied sessionId cannot hijack another tenant\'s conversation', () => {
  it("rejects a sessionId belonging to a DIFFERENT tenant than the caller's signed header — starts a fresh conversation instead of reusing the victim's", async () => {
    h.setExistingConvo({ id: 'victim-convo-1', tenant_id: VICTIM })
    const sig = signTenantHeader(ATTACKER_TENANT)

    const res = await POST(post(
      { 'x-tenant-id': ATTACKER_TENANT, 'x-tenant-sig': sig },
      { sessionId: 'victim-convo-1' },
    ))

    expect(res.status).toBe(200)
    // The reuse-check looked up the supplied id...
    expect(h.captured.convoLookupIds).toEqual(['victim-convo-1'])
    // ...but it did NOT get reused: askSelena must never see the victim's
    // conversation id, and a brand-new conversation was created instead.
    expect(vi.mocked(askSelena).mock.calls[0]?.[2]).toBe('convo-1')
    expect(h.captured.convoInsert?.tenant_id).toBe(ATTACKER_TENANT)
  })

  it('rejects an unauthenticated caller (no signed tenant header) supplying a sessionId that belongs to a real tenant', async () => {
    h.setExistingConvo({ id: 'victim-convo-1', tenant_id: VICTIM })

    const res = await POST(post({}, { sessionId: 'victim-convo-1' }))

    expect(res.status).toBe(200)
    expect(vi.mocked(askSelena).mock.calls[0]?.[2]).toBe('convo-1')
    expect(h.captured.convoInsert?.tenant_id).toBeUndefined()
  })

  it('reuses the conversation when the sessionId genuinely belongs to the signed-in tenant', async () => {
    h.setExistingConvo({ id: 'own-convo-1', tenant_id: VICTIM })
    const sig = signTenantHeader(VICTIM)

    const res = await POST(post(
      { 'x-tenant-id': VICTIM, 'x-tenant-sig': sig },
      { sessionId: 'own-convo-1' },
    ))

    expect(res.status).toBe(200)
    expect(vi.mocked(askSelena).mock.calls[0]?.[2]).toBe('own-convo-1')
    // Reused, not recreated.
    expect(h.captured.convoInsert).toBeNull()
  })
})
