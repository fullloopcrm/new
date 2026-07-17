import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * W4 — REGRESSION LOCK for a write-side tenant-tagging gap in POST /api/sms.
 *
 * sms_conversation_messages.tenant_id has a column DEFAULT of 'nycmaid' (the
 * rollout safety net added by migrations/2026_05_09_tenant_id_core.sql). The
 * outbound-message insert omitted tenant_id, so any OTHER tenant's manually
 * sent SMS got mis-tagged nycmaid's — hiding it from that tenant's own
 * tenant-scoped GET ?conversation_id read. Same gap already fixed on the
 * selena/chat/yinez/admin-chat siblings; tracked as P2 "write-side siblings"
 * in deploy-prep/idor-remediation-status.md.
 *
 * FIX: the insert now carries `tenant_id: tenantId` — the authenticated
 * caller's own tenant (requirePermission), never caller-supplied.
 */

const TENANT = 'tenant-msg-tag'
const CLIENT = 'client-1'
const CONVO = 'convo-own-1'

const insertedMessages: Array<Record<string, unknown>> = []

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: vi.fn(async () => ({ userId: 'op-a', tenantId: TENANT, tenant: {}, role: 'owner' })),
  AuthError: class AuthError extends Error {},
}))

vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn() }))

vi.mock('@/lib/supabase', () => {
  function from(table: string) {
    const eqs: Record<string, unknown> = {}
    const chain: Record<string, unknown> = {
      select: () => chain,
      eq: (col: string, val: unknown) => { eqs[col] = val; return chain },
      is: () => chain,
      order: () => chain,
      limit: () => chain,
      maybeSingle: () => {
        if (table === 'sms_conversations') {
          return Promise.resolve({ data: { id: CONVO, tenant_id: TENANT, client_id: CLIENT }, error: null })
        }
        return Promise.resolve({ data: null, error: null })
      },
      single: () => Promise.resolve({ data: null, error: null }),
      insert: (row: Record<string, unknown>) => {
        if (table === 'sms_conversation_messages') insertedMessages.push(row)
        const insertChain = {
          select: () => insertChain,
          single: () => Promise.resolve({ data: { id: 'new-msg', ...row }, error: null }),
        }
        return insertChain
      },
      update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
    }
    return chain
  }
  return { supabaseAdmin: { from } }
})

import { POST } from './route'

function postReq(body: Record<string, unknown>): NextRequest {
  return new NextRequest('https://app.fullloop.example/api/sms', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  insertedMessages.length = 0
})

describe('POST /api/sms — sms_conversation_messages insert carries tenant_id', () => {
  it('stamps tenant_id on the outbound message insert', async () => {
    const res = await POST(postReq({ conversation_id: CONVO, client_id: CLIENT, message: 'hello' }))
    expect(res.status).toBe(201)

    expect(insertedMessages).toHaveLength(1)
    expect(insertedMessages[0].tenant_id).toBe(TENANT)
  })
})
