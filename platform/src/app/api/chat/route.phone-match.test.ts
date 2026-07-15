import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { signTenantHeader } from '@/lib/tenant-header-sig'

/**
 * POST /api/chat's new-conversation "returning client" phone lookup used
 * `.ilike('phone', '%<last-10-digits>%')` with NO length floor -- a short/
 * garbage phone (e.g. a single digit) matched an ARBITRARY unrelated client
 * in the tenant, and the route then set `insertData.client_id` to that
 * wrong client + copied their real `name` into the new conversation's
 * booking_checklist. Downstream tool handlers (e.g. selena-legacy's
 * capture-name path) WRITE to `clients` keyed off this conversation's
 * client_id, so a garbage phone from an anonymous visitor could silently
 * misattribute (and later corrupt) an unrelated client's record. Same bug
 * class as the sibling getClientProfile fix in selena-legacy.ts/core.ts.
 */

const SECRET = 'chat-route-phone-match-secret'

const UNRELATED_CLIENT = { id: 'unrelated-client-1', name: 'Unrelated Real Client', phone: '2125551234' }

const h = vi.hoisted(() => {
  const captured = { convoInsert: null as Record<string, unknown> | null }

  function makeBuilder(table: string) {
    // Simulates a real ilike('phone', '%x%') substring match against the
    // seeded client, so pre-fix (vulnerable) code exercises the same
    // substring-match bug it has in production, not just a missing-method error.
    let ilikePattern: RegExp | null = null
    const clientsRows = () => {
      if (table !== 'clients') return []
      const all = [{ ...UNRELATED_CLIENT }]
      return ilikePattern ? all.filter((c) => ilikePattern!.test(c.phone)) : all
    }
    const builder: Record<string, unknown> = {}
    Object.assign(builder, {
      select: () => builder,
      eq: () => builder,
      ilike: (_col: string, pattern: string) => {
        const inner = pattern.replace(/^%|%$/g, '')
        ilikePattern = new RegExp(inner.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
        return builder
      },
      limit: () => builder,
      gte: () => builder,
      single: () => {
        const rows = clientsRows()
        return Promise.resolve({ data: rows[0] || null, error: null })
      },
      maybeSingle: () => {
        const rows = clientsRows()
        return Promise.resolve({ data: rows[0] || null, error: null })
      },
      then: (resolve: (v: unknown) => unknown) => {
        if (table === 'clients') return resolve({ data: clientsRows(), error: null })
        return resolve({ count: 0, error: null })
      },
      insert: (payload: Record<string, unknown>) => {
        if (table === 'sms_conversations') captured.convoInsert = payload
        return {
          select: () => ({ single: () => Promise.resolve({ data: { id: 'convo-1' }, error: null }) }),
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
vi.mock('@/lib/nycmaid/tenant', () => ({ isNycMaid: () => false }))
vi.mock('@/lib/selena/agent', () => ({ askSelena: vi.fn(async () => ({ text: 'yinez', bookingCreated: false })) }))
vi.mock('@/lib/selena-legacy', () => ({
  EMPTY_CHECKLIST: {},
  getNextStep: () => 'next',
  getQuickReplies: () => [],
  askSelena: vi.fn(async () => ({ text: 'hello from selena', checklist: {}, bookingCreated: false })),
}))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))

import { POST } from './route'

const TENANT_A = 'tenant-a'

function post(phone: string) {
  const sig = signTenantHeader(TENANT_A)
  return new NextRequest('https://app.fullloop.example/api/chat', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-tenant-id': TENANT_A,
      'x-tenant-sig': sig,
    },
    body: JSON.stringify({ message: 'hi', phone }),
  })
}

beforeAll(() => {
  process.env.TENANT_HEADER_SIG_SECRET = SECRET
})

beforeEach(() => {
  h.captured.convoInsert = null
})

describe('POST /api/chat — new conversation phone-link match', () => {
  it('does NOT attach an unrelated client via a malformed 1-digit phone', async () => {
    const res = await POST(post('1'))
    expect(res.status).toBe(200)
    expect(h.captured.convoInsert?.client_id).toBeUndefined()
  })

  it('CONTROL: still links the correct client on an exact 10-digit match', async () => {
    const res = await POST(post('2125551234'))
    expect(res.status).toBe(200)
    expect(h.captured.convoInsert?.client_id).toBe(UNRELATED_CLIENT.id)
  })
})
