import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { signTenantHeader } from '@/lib/tenant-header-sig'

/**
 * POST /api/chat is fully unauthenticated (public web-chat widget) — unlike
 * the SMS/Telnyx channel, its `phone` field is entirely self-reported by the
 * caller with no carrier-verified sender. That same `phone` used to be
 * forwarded verbatim into askYinez/askSelena, which feed it into
 * isOwnerOfTenant() to decide whether the caller gets owner-gated tools
 * (Stripe refunds, SMS broadcasts to every client, revenue data, settings
 * writes). Anyone who knew or guessed a tenant's registered owner_phone could
 * paste it into this endpoint's request body and be granted full admin-tool
 * access with zero authentication. FIX: strip a caller-supplied phone that
 * would pass isOwnerOfTenant() before it ever reaches the agent.
 */

const SECRET = 'chat-route-owner-phone-spoof-test-secret'
const TENANT = 'tenant-owner-spoof'
const OWNER_PHONE = '+12125559999'

const h = vi.hoisted(() => {
  const captured = { yinezPhone: undefined as string | undefined }

  function makeBuilder(table: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const builder: any = {
      select: () => builder,
      eq: () => builder,
      ilike: () => builder,
      limit: () => builder,
      gte: () => builder,
      single: () => Promise.resolve({ data: null, error: null }),
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
      then: (resolve: (v: { data: unknown; count: number; error: null }) => unknown) =>
        Promise.resolve({ data: table === 'clients' ? [] : null, count: 0, error: null }).then(resolve),
      insert: () => ({
        select: () => ({ single: () => Promise.resolve({ data: { id: 'convo-1' }, error: null }) }),
        then: (resolve: (v: unknown) => unknown) => resolve({ data: null, error: null }),
      }),
    }
    return builder
  }

  const supabaseAdmin = { from: (table: string) => makeBuilder(table) }
  return { captured, supabaseAdmin }
})

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: h.supabaseAdmin }))
vi.mock('@/lib/selena-legacy', () => ({
  askSelena: vi.fn(async () => ({ text: 'ok', checklist: {}, bookingCreated: false })),
  EMPTY_CHECKLIST: {},
  getNextStep: () => null,
  getQuickReplies: () => [],
}))
vi.mock('@/lib/selena/agent', () => ({
  askSelena: vi.fn(async (_channel: string, _message: string, _convoId: string, phone?: string) => {
    h.captured.yinezPhone = phone
    return { text: 'ok', bookingCreated: false }
  }),
  // Real behavior: matches the tenant's registered owner_phone.
  isOwnerOfTenant: vi.fn(async (phone: string | null | undefined) => {
    if (!phone) return false
    return phone.replace(/\D/g, '').slice(-10) === OWNER_PHONE.replace(/\D/g, '').slice(-10)
  }),
}))
vi.mock('@/lib/nycmaid/tenant', () => ({ isNycMaid: () => true }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))

import { POST } from './route'

function post(phone: string | undefined) {
  const sig = signTenantHeader(TENANT)
  return new NextRequest('https://tenant-owner-spoof.example.com/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-tenant-id': TENANT, 'x-tenant-sig': sig },
    body: JSON.stringify({ message: 'hi', phone }),
  })
}

beforeAll(() => {
  process.env.TENANT_HEADER_SIG_SECRET = SECRET
})

beforeEach(() => {
  h.captured.yinezPhone = undefined
})

describe('POST /api/chat — unauthenticated owner-phone spoofing is blocked', () => {
  it('a caller claiming the tenant owner\'s phone does NOT reach the agent as that phone', async () => {
    const res = await POST(post(OWNER_PHONE))
    expect(res.status).toBe(200)
    expect(h.captured.yinezPhone).toBeUndefined()
  })

  it('a normal, non-owner phone still passes through unchanged', async () => {
    const res = await POST(post('2125551234'))
    expect(res.status).toBe(200)
    expect(h.captured.yinezPhone).toBe('2125551234')
  })
})
