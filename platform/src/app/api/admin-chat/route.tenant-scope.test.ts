import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/admin-chat accepted a client-supplied sessionId with no check
 * that the underlying sms_conversations row belonged to the authenticated
 * tenant. lib/selena/agent.ts's resolveTenantForConversation() derives the
 * AI agent's tenant context purely from that conversation row's tenant_id,
 * so an unverified sessionId let a Tenant-A staffer (any role with
 * settings.view, e.g. manager+) hijack Tenant-B's admin-chat thread: insert
 * messages into it and run Selena tool calls against Tenant B's data using
 * Tenant B's own Anthropic key -- a cross-tenant IDOR / authorization bypass.
 */

const TENANT = 'aaaaaaaa-1111-2222-3333-444444444444'
const OTHER_TENANT = 'cccccccc-9999-8888-7777-666666666666'
const OWN_CONVO = 'convo-own-1'
const FOREIGN_CONVO = 'convo-foreign-1'

type Row = Record<string, any>
const store: Record<string, Row[]> = {}
let askSelenaCalls: string[] = []

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const eqs: Row = {}
    let kind: 'read' | 'update' | 'insert' = 'read'
    let payload: Row = {}
    const match = (r: Row) => Object.entries(eqs).every(([k, v]) => r[k] === v)
    const c: Record<string, unknown> = {
      select: () => c,
      insert: (p: Row) => {
        kind = 'insert'
        payload = { id: `generated-${(store[table] || []).length + 1}`, ...p }
        store[table] = [...(store[table] || []), payload]
        return c
      },
      eq: (col: string, val: unknown) => { eqs[col] = val; return c },
      is: (col: string, val: unknown) => { eqs[col] = val === null ? null : val; return c },
      order: () => c,
      limit: () => c,
      maybeSingle: async () => {
        if (kind === 'insert') return { data: payload, error: null }
        const found = (store[table] || []).find(match)
        return { data: found ?? null, error: null }
      },
      single: async () => {
        if (kind === 'insert') return { data: payload, error: null }
        const found = (store[table] || []).find(match)
        return { data: found ?? null, error: found ? null : { message: 'not found' } }
      },
      then: (res: (v: { data: unknown; error: unknown }) => unknown) => {
        const rows = kind === 'insert' ? [payload] : (store[table] || []).filter(match)
        return res({ data: rows, error: null })
      },
    }
    return c
  }
  return { supabaseAdmin: { from: (t: string) => chain(t) } }
})

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT }, error: null }),
}))

vi.mock('@/lib/selena/agent', () => ({
  askSelena: async (_channel: string, _message: string, conversationId: string) => {
    askSelenaCalls.push(conversationId)
    return { text: 'reply', toolsCalled: [] }
  },
}))

import { NextRequest } from 'next/server'
import { POST } from '@/app/api/admin-chat/route'

function jsonReq(body: Row): NextRequest {
  return new NextRequest('http://t.test/api/admin-chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/admin-chat — sessionId tenant scoping', () => {
  beforeEach(() => {
    askSelenaCalls = []
    store.sms_conversations = [
      { id: OWN_CONVO, tenant_id: TENANT, phone: '+12122029220', state: 'admin-dashboard', completed_at: null },
      { id: FOREIGN_CONVO, tenant_id: OTHER_TENANT, phone: '+12122029220', state: 'admin-dashboard', completed_at: null },
    ]
    store.sms_conversation_messages = []
  })

  it('rejects a sessionId belonging to another tenant and does not run the agent against it', async () => {
    const res = await POST(jsonReq({ message: 'hi', sessionId: FOREIGN_CONVO }))
    expect(res.status).toBe(200)
    expect(askSelenaCalls).toHaveLength(1)
    expect(askSelenaCalls[0]).not.toBe(FOREIGN_CONVO)
    // No message was written into the foreign tenant's conversation.
    expect(store.sms_conversation_messages.some((m) => m.conversation_id === FOREIGN_CONVO)).toBe(false)
  })

  it('accepts a sessionId belonging to the authenticated tenant', async () => {
    const res = await POST(jsonReq({ message: 'hi', sessionId: OWN_CONVO }))
    expect(res.status).toBe(200)
    expect(askSelenaCalls).toEqual([OWN_CONVO])
  })
})
