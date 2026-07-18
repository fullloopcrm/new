import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { signTenantHeader } from '@/lib/tenant-header-sig'

/**
 * W4 — REGRESSION LOCK for a write-side tenant-tagging gap in POST /api/yinez.
 *
 * Same gap as chat/route.msg-tenant-tag.test.ts: sms_conversation_messages.
 * tenant_id defaults to 'nycmaid' (migrations/2026_05_09_tenant_id_core.sql)
 * when omitted on insert, mis-tagging every other tenant's message. Tracked
 * as P2 "write-side siblings" in deploy-prep/idor-remediation-status.md.
 *
 * FIX: both message inserts now carry `tenant_id: reqTenantId` when the
 * caller's tenant header is verified. This route is fully unauthenticated,
 * so an UNVERIFIED caller (no reqTenantId) must NOT have tenant_id stamped
 * either — that's covered by the second test below.
 */

const SECRET = 'yinez-route-msg-tenant-tag-test-secret'
const TENANT = 'tenant-msg-tag'

const h = vi.hoisted(() => {
  const captured = { messageInserts: [] as Record<string, unknown>[] }

  function makeBuilder(table: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const builder: any = {
      select: () => builder,
      eq: () => builder,
      ilike: () => builder,
      limit: () => builder,
      gte: () => builder,
      single: () => Promise.resolve({ data: null, error: null }),
      then: (resolve: (v: { data: unknown; count: number; error: null }) => unknown) =>
        Promise.resolve({ data: null, count: 0, error: null }).then(resolve),
      insert: (payload: Record<string, unknown>) => {
        if (table === 'sms_conversation_messages') captured.messageInserts.push(payload)
        return {
          select: () => ({ single: () => Promise.resolve({ data: { id: 'convo-1' }, error: null }) }),
          then: (resolve: (v: unknown) => unknown) => resolve({ data: null, error: null }),
        }
      },
    }
    return builder
  }

  const supabaseAdmin = { from: (table: string) => makeBuilder(table) }
  return { captured, supabaseAdmin }
})

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: h.supabaseAdmin }))
vi.mock('@/lib/selena/core', () => ({ EMPTY_CHECKLIST: {} }))
vi.mock('@/lib/selena/agent', () => ({
  askSelena: vi.fn(async () => ({ text: 'ok', bookingCreated: false })),
  isOwnerOfTenant: vi.fn(async () => false),
}))
vi.mock('@/lib/nycmaid/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/nycmaid/conversation-scorer', () => ({
  scoreConversation: vi.fn(async () => {}),
  selfReviewConversation: vi.fn(async () => {}),
}))

import { POST } from './route'

function post(headers: Record<string, string>) {
  return new NextRequest('https://app.fullloop.example/api/yinez', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify({ message: 'hi' }),
  })
}

beforeAll(() => {
  process.env.TENANT_HEADER_SIG_SECRET = SECRET
})

beforeEach(() => {
  h.captured.messageInserts = []
})

describe('POST /api/yinez — sms_conversation_messages inserts carry tenant_id', () => {
  it('stamps tenant_id on both message inserts when the tenant header is verified', async () => {
    const res = await POST(post({ 'x-tenant-id': TENANT, 'x-tenant-sig': signTenantHeader(TENANT) }))
    expect(res.status).toBe(200)

    expect(h.captured.messageInserts).toHaveLength(2)
    for (const insert of h.captured.messageInserts) {
      expect(insert.tenant_id).toBe(TENANT)
    }
  })

  it('omits tenant_id (not a bogus value) when the caller has no verified tenant', async () => {
    const res = await POST(post({}))
    expect(res.status).toBe(200)

    expect(h.captured.messageInserts).toHaveLength(2)
    for (const insert of h.captured.messageInserts) {
      expect(insert.tenant_id).toBeUndefined()
    }
  })
})
