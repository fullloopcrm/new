import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { signTenantHeader } from '@/lib/tenant-header-sig'

/**
 * W4 — REGRESSION LOCK for a write-side tenant-tagging gap in POST /api/chat.
 *
 * sms_conversation_messages.tenant_id has a column DEFAULT of 'nycmaid' (the
 * rollout safety net added by migrations/2026_05_09_tenant_id_core.sql). An
 * insert that omits tenant_id silently falls back to that default — for any
 * OTHER tenant, the row is mis-tagged nycmaid's, which then hides the message
 * from that tenant's own tenant-scoped GET /api/selena?convoId read (a
 * self-visibility bug) and — since the row's real tenant_id ends up 'nycmaid'
 * rather than NULL — makes it visible to a nycmaid operator who already knows
 * the foreign conversation id. Tracked as P2 "write-side siblings" in
 * deploy-prep/idor-remediation-status.md; identical gap already fixed on the
 * selena reset-insert sibling (route.reset-insert-tenant-tag.witness.test.ts).
 *
 * FIX: both the inbound and outbound sms_conversation_messages inserts now
 * carry `tenant_id: tenantId` explicitly (tenantId is the middleware-signed,
 * verified header tenant for this route — never caller-supplied).
 */

const SECRET = 'chat-route-msg-tenant-tag-test-secret'
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
vi.mock('@/lib/selena-legacy', () => ({
  askSelena: vi.fn(async () => ({ text: 'ok', checklist: {}, bookingCreated: false })),
  EMPTY_CHECKLIST: {},
  getNextStep: () => null,
  getQuickReplies: () => [],
}))
vi.mock('@/lib/selena/agent', () => ({ askSelena: vi.fn(async () => ({ text: 'ok', bookingCreated: false })) }))
vi.mock('@/lib/nycmaid/tenant', () => ({ isNycMaid: () => false }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))

import { POST } from './route'

function post() {
  return new NextRequest('https://tenant-a.example.com/api/chat', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-tenant-id': TENANT,
      'x-tenant-sig': signTenantHeader(TENANT),
    },
    body: JSON.stringify({ message: 'hi' }),
  })
}

beforeAll(() => {
  process.env.TENANT_HEADER_SIG_SECRET = SECRET
})

beforeEach(() => {
  h.captured.messageInserts = []
})

describe('POST /api/chat — sms_conversation_messages inserts carry tenant_id', () => {
  it('stamps tenant_id on both the inbound and outbound message inserts', async () => {
    const response = await POST(post())
    expect(response.status).toBe(200)

    expect(h.captured.messageInserts).toHaveLength(2)
    for (const insert of h.captured.messageInserts) {
      expect(insert.tenant_id).toBe(TENANT)
    }
  })
})
