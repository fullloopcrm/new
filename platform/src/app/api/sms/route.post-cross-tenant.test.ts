import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * W4 — regression lock for POST /api/sms conversation_id FK-injection.
 *
 * A client-supplied `conversation_id` was used to insert an outbound message
 * (and bump last_message_at) with no check that it belonged to the caller's
 * tenant — any tenant member could inject a message into ANOTHER tenant's SMS
 * conversation thread just by guessing/supplying that tenant's convo id.
 * Same bug class as the finance FK-injection fixes (409cd020, ae527e02).
 *
 *   • NEGATIVE: tenant-A supplies tenant-B's conversation_id → 404, no insert.
 *   • POSITIVE CONTROL: tenant-A supplies its own conversation_id → succeeds.
 */

const CALLER_TENANT = 'tenant-A'
const VICTIM_TENANT = 'tenant-B'
const CALLER_CLIENT = 'client-A'
const VICTIM_CONVO = 'convo-B-victim'
const CALLER_CONVO = 'convo-A-own'

type Eqs = Record<string, unknown>
const insertedMessages: Array<Record<string, unknown>> = []
const updatedConvos: Array<{ id: unknown; patch: Record<string, unknown> }> = []

const convoStore = [
  { id: VICTIM_CONVO, tenant_id: VICTIM_TENANT, client_id: 'client-B' },
  { id: CALLER_CONVO, tenant_id: CALLER_TENANT, client_id: CALLER_CLIENT },
]

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: vi.fn(async () => ({ userId: 'op-a', tenantId: CALLER_TENANT, tenant: {}, role: 'owner' })),
  AuthError: class AuthError extends Error {},
}))

vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn() }))

vi.mock('@/lib/supabase', () => {
  function rowsFor(table: string, eqs: Eqs): unknown[] {
    if (table === 'sms_conversations') {
      return convoStore.filter((r) => Object.entries(eqs).every(([k, v]) => (r as Eqs)[k] === v))
    }
    return []
  }
  function from(table: string) {
    const eqs: Eqs = {}
    const chain: Record<string, unknown> = {
      select: () => chain,
      eq: (col: string, val: unknown) => { eqs[col] = val; return chain },
      is: () => chain,
      order: () => chain,
      limit: () => chain,
      maybeSingle: () => {
        const rows = rowsFor(table, eqs)
        return Promise.resolve({ data: rows[0] || null, error: null })
      },
      single: () => {
        const rows = rowsFor(table, eqs)
        return Promise.resolve(rows[0] ? { data: rows[0], error: null } : { data: null, error: { message: 'no rows' } })
      },
      insert: (row: Record<string, unknown>) => {
        if (table === 'sms_conversation_messages') insertedMessages.push(row)
        const insertChain = {
          select: () => insertChain,
          single: () => Promise.resolve({ data: { id: 'new-msg', ...row }, error: null }),
        }
        return insertChain
      },
      update: (patch: Record<string, unknown>) => ({
        eq: (col: string, val: unknown) => {
          if (table === 'sms_conversations' && col === 'id') updatedConvos.push({ id: val, patch })
          return Promise.resolve({ data: null, error: null })
        },
      }),
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
  updatedConvos.length = 0
})

describe('POST /api/sms — conversation_id FK-injection isolation', () => {
  it('NEGATIVE (regression lock): tenant-A supplying tenant-B\'s conversation_id gets 404, no insert', async () => {
    const res = await POST(postReq({ conversation_id: VICTIM_CONVO, client_id: CALLER_CLIENT, message: 'hijacked' }))
    expect(res.status).toBe(404)
    expect(insertedMessages).toHaveLength(0)
    expect(updatedConvos).toHaveLength(0)
  })

  it('POSITIVE CONTROL: tenant-A supplying its own conversation_id succeeds', async () => {
    const res = await POST(postReq({ conversation_id: CALLER_CONVO, client_id: CALLER_CLIENT, message: 'hello' }))
    expect(res.status).toBe(201)
    expect(insertedMessages).toHaveLength(1)
    expect(insertedMessages[0]).toMatchObject({ conversation_id: CALLER_CONVO, message: 'hello' })
  })
})
