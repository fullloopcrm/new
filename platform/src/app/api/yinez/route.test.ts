import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { signTenantHeader } from '@/lib/tenant-header-sig'

/**
 * /api/yinez is a fully public, unauthenticated web-chat widget endpoint
 * (isPublicRoute skips Clerk on the main host). Two bugs, both closed here:
 *
 * 1) It trusted a RAW x-tenant-id header with no signature check, unlike its
 *    sibling /api/chat. On the main host a caller could forge
 *    `x-tenant-id: <victim>` and (a) have the returning-client phone lookup
 *    read that victim's clients, and (b) scope the new conversation into the
 *    victim's tenant. Fixed by routing tenant derivation through
 *    verifyTenantHeaderSig, so an unsigned/forged id is dropped to undefined.
 *
 * 2) A caller-supplied sessionId was reused with zero ownership check.
 *    askSelena() resolves the AI agent's entire tenant context (Anthropic
 *    key, business config, client PII, message history) purely from
 *    sms_conversations.tenant_id for that id, so any caller could pass
 *    another tenant's conversation id and hijack it end-to-end. Fixed by
 *    verifying the conversation's tenant_id matches the request's verified
 *    tenant before reuse; otherwise a fresh conversation is created.
 *
 * Also covers the per-tenant+IP rate limit added alongside these (a
 * scripted caller could otherwise loop this to run up real Anthropic spend).
 */

const SECRET = 'yinez-route-test-secret'

const h = vi.hoisted(() => {
  const captured = {
    clientLookups: [] as unknown[],
    convoInsert: null as Record<string, unknown> | null,
    convoLookupIds: [] as string[],
  }
  let existingConvo: { id: string; tenant_id: string | null } | null = null
  let rateLimited = false

  function makeBuilder(table: string) {
    const builder: Record<string, unknown> = {}
    let lastIdEq: unknown = undefined
    let lastTenantEq: unknown = undefined
    Object.assign(builder, {
      select: () => builder,
      eq: (col: string, val: unknown) => {
        if (table === 'clients' && col === 'tenant_id') captured.clientLookups.push(val)
        if (table === 'sms_conversations' && col === 'id') lastIdEq = val
        if (table === 'sms_conversations' && col === 'tenant_id') lastTenantEq = val
        return builder
      },
      ilike: () => builder,
      limit: () => builder,
      gte: () => builder,
      single: () => Promise.resolve({ data: null, error: null }),
      maybeSingle: () => {
        if (table === 'sms_conversations' && lastIdEq !== undefined) {
          captured.convoLookupIds.push(lastIdEq as string)
          // Mirrors a real DB: the query also filters by tenant_id, so a
          // convo owned by a DIFFERENT tenant than the one being queried
          // for must come back empty.
          const matches = existingConvo && existingConvo.tenant_id === lastTenantEq
          return Promise.resolve({ data: matches ? existingConvo : null, error: null })
        }
        return Promise.resolve({ data: null, error: null })
      },
      // rateLimitDb's count query (rate_limit_events) awaits the chain directly.
      then: (resolve: (v: { count: number; error: null }) => unknown) =>
        resolve({ count: rateLimited ? 999 : 0, error: null }),
      insert: (payload: Record<string, unknown>) => {
        if (table === 'sms_conversations') captured.convoInsert = payload
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
    setRateLimited: (v: boolean) => { rateLimited = v },
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
  h.setRateLimited(false)
  vi.mocked(askSelena).mockClear()
})

describe('POST /api/yinez — forgeable x-tenant-id tenant wall', () => {
  it('forged x-tenant-id (no signature) does NOT read the victim tenant and does NOT scope the write', async () => {
    const res = await POST(post({ 'x-tenant-id': VICTIM }))

    expect(res.status).toBe(200)
    expect(h.captured.clientLookups).toEqual([])
    expect(h.captured.convoInsert?.tenant_id).toBeUndefined()
  })

  it('forged x-tenant-id with a bogus signature is also rejected', async () => {
    const res = await POST(post({ 'x-tenant-id': VICTIM, 'x-tenant-sig': 'deadbeef'.repeat(8) }))

    expect(res.status).toBe(200)
    expect(h.captured.clientLookups).toEqual([])
    expect(h.captured.convoInsert?.tenant_id).toBeUndefined()
  })

  it("another tenant's valid signature cannot select the victim (sig is bound to its own id)", async () => {
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
    expect(h.captured.clientLookups).toEqual([VICTIM])
    expect(h.captured.convoInsert?.tenant_id).toBe(VICTIM)
  })
})

describe("POST /api/yinez — caller-supplied sessionId cannot hijack another tenant's conversation", () => {
  it("rejects a sessionId belonging to a DIFFERENT tenant than the caller's signed header — starts a fresh conversation instead of reusing the victim's", async () => {
    h.setExistingConvo({ id: 'victim-convo-1', tenant_id: VICTIM })
    const sig = signTenantHeader(ATTACKER_TENANT)

    const res = await POST(post(
      { 'x-tenant-id': ATTACKER_TENANT, 'x-tenant-sig': sig },
      { sessionId: 'victim-convo-1' },
    ))

    expect(res.status).toBe(200)
    expect(h.captured.convoLookupIds).toEqual(['victim-convo-1'])
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
    expect(h.captured.convoInsert).toBeNull()
  })
})

describe('POST /api/yinez — rate limit', () => {
  it('returns 429 and never calls askSelena once the bucket is exhausted', async () => {
    h.setRateLimited(true)
    const res = await POST(post({}))

    expect(res.status).toBe(429)
    expect(askSelena).not.toHaveBeenCalled()
  })
})
