/**
 * Ownership WITNESS on `POST /api/sms` — Finding 1 of
 * `deploy-prep/sms-conversation-ownership-guard-spec.md`.
 *
 * When the caller supplies `conversation_id` directly in the body, the route
 * skips its own lookup-or-create branch (which IS tenant-scoped) and inserts
 * straight into `sms_conversation_messages` / updates `sms_conversations`
 * with no check that the supplied id belongs to the caller's tenant. This
 * test drives the real handler and proves that gap is present TODAY — a
 * foreign-tenant `conversation_id` gets an outbound message written against
 * it with no error. Expected to flip red the moment the fix in the spec
 * lands (a `.eq('tenant_id', tenantId)` ownership check before use); that
 * flip is the fix signal, not a bug in this test. Mirrors the shape of
 * `finance-expenses-mass-assignment.witness.test.ts`.
 *
 * No route edits. Real handler driven against a recording Supabase stub.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

const inserts: Array<{ table: string; payload: Record<string, unknown> }> = []
const updates: Array<{ table: string; id: string; payload: Record<string, unknown> }> = []

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: 'caller-tenant' }),
  AuthError: class AuthError extends Error {},
}))

vi.mock('@/lib/sms', () => ({
  sendSMS: async () => {},
}))

vi.mock('@/lib/supabase', () => {
  return {
    supabaseAdmin: {
      from: (table: string) => ({
        select: () => ({
          eq: () => ({
            eq: () => ({ single: async () => ({ data: null, error: null }) }),
            single: async () => ({ data: null, error: null }), // tenants lookup — no telnyx creds, skip send
          }),
        }),
        insert: (payload: Record<string, unknown>) => {
          inserts.push({ table, payload })
          return {
            select: () => ({
              single: async () => ({ data: { id: 'msg1', ...payload }, error: null }),
            }),
          }
        },
        update: (payload: Record<string, unknown>) => ({
          eq: (_col: string, id: string) => {
            updates.push({ table, id, payload })
            return Promise.resolve({ data: null, error: null })
          },
        }),
      }),
    },
  }
})

import { POST } from './route'

function post(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/sms', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  inserts.length = 0
  updates.length = 0
})

describe('POST /api/sms — un-checked caller-supplied conversation_id (WITNESS: cross-tenant write today)', () => {
  it('inserts a message against a FOREIGN conversation_id with no ownership check (the gap)', async () => {
    const res = await POST(
      post({ conversation_id: 'victim-tenant-convo', client_id: 'c1', message: 'injected' }),
    )
    expect(res.status).toBe(201)

    const msgInsert = inserts.find((i) => i.table === 'sms_conversation_messages')
    expect(msgInsert).toBeDefined()
    // THE GAP: the foreign conversation_id is used verbatim, no tenant check ran first.
    expect(msgInsert?.payload.conversation_id).toBe('victim-tenant-convo')
    expect(msgInsert?.payload.direction).toBe('outbound')

    const convoUpdate = updates.find((u) => u.table === 'sms_conversations')
    expect(convoUpdate).toBeDefined()
    // THE GAP: last_message_at on the victim's conversation gets touched too.
    expect(convoUpdate?.id).toBe('victim-tenant-convo')
  })

  it('does the same for a plausible same-shape id belonging to a different tenant (not a fluke of one id)', async () => {
    const res = await POST(
      post({ conversation_id: 'another-foreign-convo', client_id: 'c1', message: 'also injected' }),
    )
    expect(res.status).toBe(201)
    expect(inserts[0].payload.conversation_id).toBe('another-foreign-convo')
  })
})
