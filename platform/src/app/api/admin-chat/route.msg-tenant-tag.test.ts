import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * W4 — REGRESSION LOCK for a write-side tenant-tagging gap in POST
 * /api/admin-chat.
 *
 * Same gap as chat/route.msg-tenant-tag.test.ts and
 * yinez/route.msg-tenant-tag.test.ts: sms_conversation_messages.tenant_id
 * defaults to 'nycmaid' (migrations/2026_05_09_tenant_id_core.sql) when
 * omitted on insert, mis-tagging every other tenant's admin-chat message.
 * Tracked as P2 "write-side siblings" in
 * deploy-prep/idor-remediation-status.md.
 *
 * FIX: both message inserts now carry `tenant_id: tenant.tenantId` — the
 * authenticated caller's own tenant (requirePermission), never caller-supplied.
 */

const TENANT = 'tenant-msg-tag'
const CONVO = 'convo-own-1'

const h = vi.hoisted(() => {
  const captured = { messageInserts: [] as Record<string, unknown>[] }

  function makeBuilder(table: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const builder: any = {
      select: () => builder,
      eq: () => builder,
      is: () => builder,
      order: () => builder,
      limit: () => builder,
      maybeSingle: () => {
        if (table === 'sms_conversations') {
          return Promise.resolve({ data: { id: CONVO, tenant_id: TENANT, phone: '+12122029220' }, error: null })
        }
        return Promise.resolve({ data: null, error: null })
      },
      then: (resolve: (v: { data: unknown; error: null }) => unknown) =>
        Promise.resolve({ data: null, error: null }).then(resolve),
      insert: (payload: Record<string, unknown>) => {
        if (table === 'sms_conversation_messages') captured.messageInserts.push(payload)
        return {
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
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT }, error: null }),
}))
vi.mock('@/lib/selena/agent', () => ({
  askSelena: vi.fn(async () => ({ text: 'reply', toolsCalled: [] })),
}))
vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: async () => ({ allowed: true, remaining: 29 }),
}))

import { POST } from './route'

function post(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://t.test/api/admin-chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  h.captured.messageInserts = []
})

describe('POST /api/admin-chat — sms_conversation_messages inserts carry tenant_id', () => {
  it('stamps tenant_id on both the inbound and outbound message inserts', async () => {
    const res = await POST(post({ message: 'hi', sessionId: CONVO }))
    expect(res.status).toBe(200)

    expect(h.captured.messageInserts).toHaveLength(2)
    for (const insert of h.captured.messageInserts) {
      expect(insert.tenant_id).toBe(TENANT)
    }
  })
})
