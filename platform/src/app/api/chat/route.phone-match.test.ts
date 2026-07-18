import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { signTenantHeader } from '@/lib/tenant-header-sig'

/**
 * POST /api/chat is fully unauthenticated (public web-chat widget). Its
 * new-conversation "returning client" link used to ilike-substring-match
 * clients.phone with only a `.slice(-10)` cap and NO minimum length floor —
 * a short/garbage `phone` (e.g. "5") could match an ARBITRARY client in the
 * tenant. Downstream Selena tool handlers (e.g. capture-name) WRITE to
 * `clients` keyed off the resulting client_id, so a false match is a
 * cross-client corruption vector, not just a read. Locks down the fix:
 * exact national-number match only, gated on digits.length >= 10.
 */

const SECRET = 'chat-route-phone-match-test-secret'
const TENANT = 'tenant-a'

// Real ILIKE '%pattern%' substring semantics so this mock can prove RED
// against the actual pre-fix code (not just a shape-mismatch crash).
function ilikeMatch(pattern: string, value: string): boolean {
  const needle = pattern.replace(/^%|%$/g, '').toLowerCase()
  return value.toLowerCase().includes(needle)
}

const h = vi.hoisted(() => {
  const captured = { convoInsert: null as Record<string, unknown> | null }
  const clientRows = [
    { id: 'client-victim', name: 'Victim Client', phone: '+12125551234' },
  ]

  function makeBuilder(table: string) {
    let ilikePattern: string | null = null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const builder: any = {
      select: () => builder,
      eq: () => builder,
      ilike: (_col: string, pattern: string) => { ilikePattern = pattern; return builder },
      limit: () => builder,
      gte: () => builder,
      single: () => {
        if (table === 'clients') {
          const rows = ilikePattern
            ? clientRows.filter(c => ilikeMatch(ilikePattern as string, c.phone))
            : clientRows
          return Promise.resolve({ data: rows[0] ?? null, error: null })
        }
        return Promise.resolve({ data: null, error: null })
      },
      // rate limit + tenant ownership checks await the chain directly.
      then: (resolve: (v: { data: unknown; count: number; error: null }) => unknown) => {
        if (table === 'clients') {
          const rows = ilikePattern
            ? clientRows.filter(c => ilikeMatch(ilikePattern as string, c.phone))
            : clientRows
          return Promise.resolve({ data: rows, count: rows.length, error: null }).then(resolve)
        }
        return Promise.resolve({ data: null, count: 0, error: null }).then(resolve)
      },
      insert: (payload: Record<string, unknown>) => {
        if (table === 'sms_conversations') captured.convoInsert = payload
        return {
          select: () => ({ single: () => Promise.resolve({ data: { id: 'convo-1' }, error: null }) }),
          then: (resolve: (v: unknown) => unknown) => resolve({ data: null, error: null }),
        }
      },
    }
    return builder
  }

  const supabaseAdmin = { from: (table: string) => makeBuilder(table) }
  return { captured, supabaseAdmin, clientRows }
})

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: h.supabaseAdmin }))
vi.mock('@/lib/selena-legacy', () => ({
  askSelena: vi.fn(async () => ({ text: 'ok', checklist: {}, bookingCreated: false })),
  EMPTY_CHECKLIST: {},
  getNextStep: () => null,
  getQuickReplies: () => [],
}))
vi.mock('@/lib/selena/agent', () => ({
  askSelena: vi.fn(async () => ({ text: 'ok', bookingCreated: false })),
  isOwnerOfTenant: vi.fn(async () => false),
}))
vi.mock('@/lib/nycmaid/tenant', () => ({ isNycMaid: () => false }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))

import { POST } from './route'

function post(phone: string | undefined) {
  const sig = signTenantHeader(TENANT)
  return new NextRequest('https://tenant-a.example.com/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-tenant-id': TENANT, 'x-tenant-sig': sig },
    body: JSON.stringify({ message: 'hi', phone }),
  })
}

beforeAll(() => {
  process.env.TENANT_HEADER_SIG_SECRET = SECRET
})

beforeEach(() => {
  h.captured.convoInsert = null
})

describe('POST /api/chat — new-conversation client-link phone match floor', () => {
  it('a short/garbage phone does NOT link the conversation to an arbitrary client', async () => {
    const res = await POST(post('5'))
    expect(res.status).toBe(200)
    expect(h.captured.convoInsert?.client_id).toBeUndefined()
  })

  it('a 9-digit phone (below the national-number floor) does NOT link', async () => {
    const res = await POST(post('212555123'))
    expect(res.status).toBe(200)
    expect(h.captured.convoInsert?.client_id).toBeUndefined()
  })

  it('an exact 10-digit match DOES link to the correct client', async () => {
    const res = await POST(post('2125551234'))
    expect(res.status).toBe(200)
    expect(h.captured.convoInsert?.client_id).toBe('client-victim')
  })
})
