import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { signTenantHeader } from '@/lib/tenant-header-sig'

/**
 * Regression: /api/yinez used to trust a RAW x-tenant-id header with no signature
 * check, unlike its siblings /api/chat + /api/errors. On the main host a caller
 * could forge `x-tenant-id: <victim>` and (a) have the returning-client phone
 * lookup read that victim's clients, and (b) scope the new conversation into the
 * victim's tenant. The fix routes tenant derivation through verifyTenantHeaderSig
 * and fails CLOSED: an unsigned/forged id is rejected outright (400) rather
 * than silently degrading to an unscoped request.
 *
 * These tests prove: a forged/unsigned x-tenant-id is rejected before any
 * tenant-scoped read or write happens; only a middleware-signed id selects
 * the tenant.
 */

const SECRET = 'yinez-route-test-secret'

// Shared capture + chainable supabase mock, hoisted so vi.mock can reference it.
const h = vi.hoisted(() => {
  const captured = {
    clientLookups: [] as unknown[], // tenant_id values the clients table was filtered by
    convoInsert: null as Record<string, unknown> | null,
  }

  function makeBuilder(table: string) {
    const builder: Record<string, unknown> = {}
    Object.assign(builder, {
      select: () => builder,
      eq: (col: string, val: unknown) => {
        if (table === 'clients' && col === 'tenant_id') captured.clientLookups.push(val)
        return builder
      },
      ilike: () => builder,
      limit: () => builder,
      // clients returning-client lookup terminates here
      single: () => Promise.resolve({ data: null, error: null }),
      // insertConversationMessage() resolves tenant_id from the parent
      // conversation via .select('tenant_id').eq('id', ...).maybeSingle() —
      // every conversation created in this suite belongs to VICTIM.
      maybeSingle: () =>
        table === 'sms_conversations'
          ? Promise.resolve({ data: { tenant_id: 'tenant-victim' }, error: null })
          : Promise.resolve({ data: null, error: null }),
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
  return { captured, supabaseAdmin }
})

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: h.supabaseAdmin }))
vi.mock('@/lib/selena/core', () => ({ EMPTY_CHECKLIST: {} }))
vi.mock('@/lib/selena/agent', () => ({
  askSelena: vi.fn(async () => ({ text: 'hello from yinez', bookingCreated: false })),
}))
vi.mock('@/lib/nycmaid/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/nycmaid/conversation-scorer', () => ({
  scoreConversation: vi.fn(async () => {}),
  selfReviewConversation: vi.fn(async () => {}),
}))

// Import the route AFTER the mocks are registered.
import { POST } from './route'

const VICTIM = 'tenant-victim'

function post(headers: Record<string, string>) {
  return new NextRequest('https://app.fullloop.example/api/yinez', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify({ message: 'hi', phone: '5551234567' }),
  })
}

beforeAll(() => {
  process.env.TENANT_HEADER_SIG_SECRET = SECRET
})

beforeEach(() => {
  h.captured.clientLookups = []
  h.captured.convoInsert = null
})

describe('POST /api/yinez — forgeable x-tenant-id tenant wall', () => {
  it('forged x-tenant-id (no signature) is rejected — no tenant-scoped read or write', async () => {
    const res = await POST(post({ 'x-tenant-id': VICTIM }))

    expect(res.status).toBe(400)
    // No tenant-scoped client read happened.
    expect(h.captured.clientLookups).toEqual([])
    // The conversation was NOT written into the victim tenant.
    expect(h.captured.convoInsert?.tenant_id).toBeUndefined()
  })

  it('forged x-tenant-id with a bogus signature is also rejected', async () => {
    const res = await POST(post({ 'x-tenant-id': VICTIM, 'x-tenant-sig': 'deadbeef'.repeat(8) }))

    expect(res.status).toBe(400)
    expect(h.captured.clientLookups).toEqual([])
    expect(h.captured.convoInsert?.tenant_id).toBeUndefined()
  })

  it("another tenant's valid signature cannot select the victim (sig is bound to its own id)", async () => {
    // Attacker holds a legit sig for tenant-other but sends x-tenant-id: victim.
    const otherSig = signTenantHeader('tenant-other')
    const res = await POST(post({ 'x-tenant-id': VICTIM, 'x-tenant-sig': otherSig }))

    expect(res.status).toBe(400)
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
