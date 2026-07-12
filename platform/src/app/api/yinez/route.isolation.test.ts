import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { signTenantHeader } from '@/lib/tenant-header-sig'

/**
 * W4 independent isolation regression for /api/yinez (fix 016ee7d).
 *
 * The sibling file route.test.ts proves a forged/unsigned x-tenant-id is dropped.
 * This file proves the COMPLEMENTARY property from the verification lane: the
 * route serves the *correct* tenant and only that tenant.
 *
 *   - a signed request for tenant A scopes to A; a signed request for tenant B
 *     scopes to B (the route is not pinned to one hard-coded tenant), and
 *   - a swap-forgery — a caller holding tenant A's genuine signature but sending
 *     `x-tenant-id: B` — scopes to NEITHER A nor B. The signature is bound to the
 *     id it was minted for, so pairing it with a different id fails the check and
 *     the request drops to tenant-less (no read, no write). This closes the
 *     cross-tenant swap that the raw-header route allowed.
 */

const SECRET = 'yinez-isolation-test-secret'

// Chainable supabase mock that records which tenant_id the clients lookup was
// scoped to and which tenant_id (if any) the conversation insert carried.
const h = vi.hoisted(() => {
  const captured = {
    clientLookups: [] as unknown[],
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
      single: () => Promise.resolve({ data: null, error: null }),
      maybeSingle:,      insert: (payload: Record<string, unknown>) => {
        if (table === 'sms_conversations') captured.convoInsert = payload
        return {
          select: () => ({
            single: () => Promise.resolve({ data: { id: 'convo-1' }, error: null }),
            maybeSingle:,          }),
          then: (resolve: (v: unknown) => unknown) => resolve({ data: null, error: null }),
        }
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

const TENANT_A = 'tenant-alpha'
const TENANT_B = 'tenant-bravo'

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

describe('POST /api/yinez — serves the correct tenant, and only that tenant', () => {
  it('a signed request for tenant A scopes the read and write to A', async () => {
    const res = await POST(post({ 'x-tenant-id': TENANT_A, 'x-tenant-sig': signTenantHeader(TENANT_A) }))

    expect(res.status).toBe(200)
    expect(h.captured.clientLookups).toEqual([TENANT_A])
    expect(h.captured.convoInsert?.tenant_id).toBe(TENANT_A)
  })

  it('a signed request for tenant B scopes to B — the route is not pinned to one tenant', async () => {
    const res = await POST(post({ 'x-tenant-id': TENANT_B, 'x-tenant-sig': signTenantHeader(TENANT_B) }))

    expect(res.status).toBe(200)
    expect(h.captured.clientLookups).toEqual([TENANT_B])
    expect(h.captured.convoInsert?.tenant_id).toBe(TENANT_B)
  })

  it('swap-forgery: tenant A\'s genuine signature paired with x-tenant-id B scopes to NEITHER', async () => {
    // Attacker legitimately holds A's signature (e.g. from their own signed
    // session) but swaps the id to target B. The sig is bound to A, so it does
    // not validate B — and it must NOT silently fall back to A either.
    const res = await POST(post({ 'x-tenant-id': TENANT_B, 'x-tenant-sig': signTenantHeader(TENANT_A) }))

    expect(res.status).toBe(200)
    // No tenant-scoped client read at all.
    expect(h.captured.clientLookups).toEqual([])
    // Not scoped to the forged target B, and not to the signature's true owner A.
    expect(h.captured.convoInsert?.tenant_id).toBeUndefined()
  })
})
