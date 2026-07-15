/**
 * POST /api/yinez -- fuzzy phone-substring cross-client misattribution on
 * the new-conversation client-link lookup.
 *
 * `digits = phone.replace(/\D/g, '').slice(-10)` had NO length floor before
 * `.ilike('phone', '%<digits>%')` -- a short phone typed into this public
 * unauthenticated web-chat widget would substring-match an ARBITRARY
 * unrelated client in the tenant, then link the new conversation to that
 * client_id and inject their name into booking_checklist.name, which feeds
 * straight into the Selena AI's context for what it treats as this
 * conversation's own identity. Same bug class already fixed on /api/chat's
 * identical new-conversation phone-link lookup (a sibling public web-chat
 * entry point), just unfixed here.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { signTenantHeader } from '@/lib/tenant-header-sig'

const SECRET = 'yinez-phone-match-test-secret'
const TENANT = 'tenant-1'
const UNRELATED_CLIENT = { id: 'unrelated-client-1', tenant_id: TENANT, name: 'Unrelated Client', phone: '12125551234' }

let clients: (typeof UNRELATED_CLIENT)[]
let convoInsert: Record<string, unknown> | null = null

function clientsChain(rows: (typeof UNRELATED_CLIENT)[]) {
  let filtered = rows
  const q: Record<string, unknown> = {
    eq: (col: string, val: unknown) => {
      filtered = filtered.filter((r) => (r as Record<string, unknown>)[col] === val)
      return q
    },
    ilike: (col: string, pattern: string) => {
      const needle = String(pattern).replace(/%/g, '').toLowerCase()
      filtered = filtered.filter((r) => String((r as Record<string, unknown>)[col] ?? '').toLowerCase().includes(needle))
      return q
    },
    limit: () => q,
    single: () => Promise.resolve({ data: filtered[0] ?? null, error: filtered[0] ? null : new Error('not found') }),
    then: (resolve: (v: unknown) => void) => Promise.resolve({ data: filtered, error: null }).then(resolve),
  }
  return q
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'clients') {
        return { select: () => clientsChain(clients.filter((c) => c.tenant_id === TENANT)) }
      }
      if (table === 'sms_conversations') {
        return {
          select: () => ({
            eq: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }),
          }),
          insert: (payload: Record<string, unknown>) => {
            convoInsert = payload
            return { select: () => ({ single: () => Promise.resolve({ data: { id: 'convo-1' }, error: null }) }) }
          },
        }
      }
      if (table === 'sms_conversation_messages') {
        return { insert: () => Promise.resolve({ data: null, error: null }) }
      }
      throw new Error(`unexpected table: ${table}`)
    },
  },
}))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: vi.fn(async () => ({ allowed: true, remaining: 19 })) }))
vi.mock('@/lib/selena/core', () => ({ EMPTY_CHECKLIST: {} }))
vi.mock('@/lib/selena/agent', () => ({
  askSelena: vi.fn(async (_channel: string, _message: string, conversationId: string) =>
    ({ text: 'hi', bookingCreated: false, conversationId })),
}))
vi.mock('@/lib/nycmaid/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/nycmaid/conversation-scorer', () => ({
  scoreConversation: vi.fn(async () => {}),
  selfReviewConversation: vi.fn(async () => {}),
}))

import { POST } from './route'

function post(phone: string): NextRequest {
  const sig = signTenantHeader(TENANT)
  return new NextRequest('https://app.fullloop.example/api/yinez', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-tenant-id': TENANT, 'x-tenant-sig': sig },
    body: JSON.stringify({ message: 'hi', phone }),
  })
}

describe('POST /api/yinez — new-conversation phone-link match', () => {
  beforeEach(() => {
    process.env.TENANT_HEADER_SIG_SECRET = SECRET
    clients = [{ ...UNRELATED_CLIENT }]
    convoInsert = null
  })

  it('does NOT link to an unrelated client via a single-digit phone', async () => {
    const res = await POST(post('1'))
    expect(res.status).toBe(200)
    expect(convoInsert?.client_id).toBeUndefined()
  })

  it('does NOT link to an unrelated client via a malformed 7-digit phone substring', async () => {
    const res = await POST(post('5551234'))
    expect(res.status).toBe(200)
    expect(convoInsert?.client_id).toBeUndefined()
  })

  it('CONTROL: still links when the phone exactly matches the existing client (10-digit national number)', async () => {
    const res = await POST(post('2125551234'))
    expect(res.status).toBe(200)
    expect(convoInsert?.client_id).toBe(UNRELATED_CLIENT.id)
  })

  it('CONTROL: still links when the phone includes a leading US country code (11 digits)', async () => {
    const res = await POST(post('12125551234'))
    expect(res.status).toBe(200)
    expect(convoInsert?.client_id).toBe(UNRELATED_CLIENT.id)
  })
})
