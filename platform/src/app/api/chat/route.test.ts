import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { signTenantHeader } from '@/lib/tenant-header-sig'

/**
 * /api/chat is a fully public, unauthenticated web-chat widget endpoint.
 * Two gaps closed here (ported from a sibling branch, never landed on this
 * one): a caller-supplied sessionId was reused with zero ownership check —
 * askSelena/askYinez derive the AI agent's entire tenant context (Anthropic
 * key, business config, client PII, message history) purely from
 * sms_conversations.tenant_id for that id, so any caller could pass another
 * tenant's conversation id and hijack it end-to-end. Fixed by verifying the
 * conversation's tenant_id matches the request's verified (signed) tenant
 * before reuse; otherwise a fresh conversation is created. Also adds a
 * per-tenant+IP rate limit (unauthenticated + no limit == a scripted caller
 * could loop this to run up real Anthropic spend).
 *
 * The existing x-tenant-id signature gate (pre-dates this change) is
 * exercised only as a sanity check here.
 */

const SECRET = 'chat-route-test-secret'

const h = vi.hoisted(() => {
  const captured = {
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
          const matches = existingConvo && existingConvo.tenant_id === lastTenantEq
          return Promise.resolve({ data: matches ? existingConvo : null, error: null })
        }
        return Promise.resolve({ data: null, error: null })
      },
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
vi.mock('@/lib/nycmaid/tenant', () => ({ isNycMaid: () => false }))
vi.mock('@/lib/selena/agent', () => ({ askSelena: vi.fn(async () => ({ text: 'yinez', bookingCreated: false })) }))
vi.mock('@/lib/selena-legacy', () => ({
  EMPTY_CHECKLIST: {},
  getNextStep: () => 'next',
  getQuickReplies: () => [],
  askSelena: vi.fn(async (_tenantId: string, _channel: string, _message: string, conversationId: string) =>
    ({ text: 'hello from selena', checklist: {}, bookingCreated: false, conversationId })),
}))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))

import { POST } from './route'
import { askSelena } from '@/lib/selena-legacy'

const TENANT_A = 'tenant-a'
const VICTIM = 'tenant-victim'

function post(headers: Record<string, string>, body: Record<string, unknown> = {}) {
  return new NextRequest('https://app.fullloop.example/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify({ message: 'hi', ...body }),
  })
}

beforeAll(() => {
  process.env.TENANT_HEADER_SIG_SECRET = SECRET
})

beforeEach(() => {
  h.captured.convoInsert = null
  h.captured.convoLookupIds = []
  h.setExistingConvo(null)
  h.setRateLimited(false)
  vi.mocked(askSelena).mockClear()
})

describe('POST /api/chat — tenant header sig gate (existing behavior, sanity check)', () => {
  it('rejects a request with no signed tenant header', async () => {
    const res = await POST(post({}))
    expect(res.status).toBe(400)
  })
})

describe("POST /api/chat — caller-supplied sessionId cannot hijack another tenant's conversation", () => {
  it("rejects a sessionId belonging to a DIFFERENT tenant than the caller's signed header — starts a fresh conversation instead of reusing the victim's", async () => {
    h.setExistingConvo({ id: 'victim-convo-1', tenant_id: VICTIM })
    const sig = signTenantHeader(TENANT_A)

    const res = await POST(post(
      { 'x-tenant-id': TENANT_A, 'x-tenant-sig': sig },
      { sessionId: 'victim-convo-1' },
    ))

    expect(res.status).toBe(200)
    expect(h.captured.convoLookupIds).toEqual(['victim-convo-1'])
    expect(vi.mocked(askSelena).mock.calls[0]?.[3]).toBe('convo-1')
    expect(h.captured.convoInsert?.tenant_id).toBe(TENANT_A)
  })

  it('reuses the conversation when the sessionId genuinely belongs to the signed-in tenant', async () => {
    h.setExistingConvo({ id: 'own-convo-1', tenant_id: TENANT_A })
    const sig = signTenantHeader(TENANT_A)

    const res = await POST(post(
      { 'x-tenant-id': TENANT_A, 'x-tenant-sig': sig },
      { sessionId: 'own-convo-1' },
    ))

    expect(res.status).toBe(200)
    expect(vi.mocked(askSelena).mock.calls[0]?.[3]).toBe('own-convo-1')
    expect(h.captured.convoInsert).toBeNull()
  })
})

describe('POST /api/chat — rate limit', () => {
  it('returns 429 and never calls askSelena once the bucket is exhausted', async () => {
    h.setRateLimited(true)
    const sig = signTenantHeader(TENANT_A)
    const res = await POST(post({ 'x-tenant-id': TENANT_A, 'x-tenant-sig': sig }))

    expect(res.status).toBe(429)
    expect(askSelena).not.toHaveBeenCalled()
  })
})
