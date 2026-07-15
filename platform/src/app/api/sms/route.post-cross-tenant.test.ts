import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { NextRequest } from 'next/server'

/**
 * POST /api/sms trusted a client-supplied conversation_id with no check that
 * it belonged to the caller's tenant, so any authenticated tenant member
 * could inject an outbound message into ANOTHER tenant's SMS conversation
 * thread (and bump its last_message_at) just by supplying that tenant's
 * conversation id. Same bug class as the finance/booking-notes FK-injection
 * fixes (booking_id, entity_id).
 */

const CALLER_TENANT = 'tenant-A'
const VICTIM_TENANT = 'tenant-B'
const CALLER_CLIENT = 'client-A'
const VICTIM_CONVO = 'convo-B-victim'
const CALLER_CONVO = 'convo-A-own'

type Row = Record<string, unknown>
const store: Record<string, Row[]> = {}

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: { tenantId: CALLER_TENANT },
    error: null,
  })),
}))

vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn() }))

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const eqs: Row = {}
    let kind: 'read' | 'insert' | 'update' = 'read'
    let payload: Row = {}
    const match = (r: Row) => Object.entries(eqs).every(([k, v]) => r[k] === v)
    const c: Record<string, unknown> = {
      select: () => c,
      insert: (p: Row) => { kind = 'insert'; payload = p; return c },
      update: (p: Row) => { kind = 'update'; payload = p; return c },
      eq: (col: string, val: unknown) => { eqs[col] = val; return c },
      is: () => c,
      order: () => c,
      limit: () => c,
      single: async () => {
        if (kind === 'insert') {
          const row = { id: `${table}-new`, ...payload }
          store[table] = [...(store[table] || []), row]
          return { data: row, error: null }
        }
        if (kind === 'update') {
          store[table] = (store[table] || []).map((r) => (match(r) ? { ...r, ...payload } : r))
          return { data: null, error: null }
        }
        const found = (store[table] || []).find(match)
        return { data: found ?? null, error: found ? null : { message: 'not found' } }
      },
      maybeSingle: async () => {
        const found = (store[table] || []).find(match)
        return { data: found ?? null, error: null }
      },
    }
    return c
  }
  return { supabaseAdmin: { from: (t: string) => chain(t) } }
})

import { POST } from './route'

function postReq(body: Row): NextRequest {
  return new Request('http://t.test/api/sms', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as NextRequest
}

beforeEach(() => {
  store.sms_conversations = [
    { id: VICTIM_CONVO, tenant_id: VICTIM_TENANT, client_id: 'client-B' },
    { id: CALLER_CONVO, tenant_id: CALLER_TENANT, client_id: CALLER_CLIENT },
  ]
  store.sms_conversation_messages = []
  store.tenants = [{ id: CALLER_TENANT, telnyx_api_key: null, telnyx_phone: null }]
  store.clients = [{ id: CALLER_CLIENT, tenant_id: CALLER_TENANT, phone: '5551234567' }]
})

describe('POST /api/sms — conversation_id tenant scoping', () => {
  it('rejects a conversation_id belonging to another tenant, inserts nothing', async () => {
    const res = await POST(postReq({ conversation_id: VICTIM_CONVO, client_id: CALLER_CLIENT, message: 'hi' }))
    expect(res.status).toBe(404)
    expect(store.sms_conversation_messages.length).toBe(0)
  })

  it('accepts a conversation_id genuinely owned by the caller tenant', async () => {
    const res = await POST(postReq({ conversation_id: CALLER_CONVO, client_id: CALLER_CLIENT, message: 'hi' }))
    expect(res.status).toBe(201)
    expect(store.sms_conversation_messages.length).toBe(1)
    expect(store.sms_conversation_messages[0].conversation_id).toBe(CALLER_CONVO)
  })
})
