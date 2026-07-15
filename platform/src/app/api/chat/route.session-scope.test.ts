import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { signTenantHeader } from '@/lib/tenant-header-sig'

/**
 * POST /api/chat previously trusted a caller-supplied sessionId with zero
 * check that the underlying sms_conversations row belongs to the calling
 * tenant. Same FK-injection class already fixed on /api/sms, /api/admin-chat,
 * and sibling /api/yinez: a foreign sessionId would let this tenant's public
 * web widget append to, and have Selena act on, another tenant's SMS
 * conversation thread.
 */

process.env.TENANT_HEADER_SIG_SECRET = 'chat-route-test-secret'

const TENANT_A = 'tenant-A'
const TENANT_B = 'tenant-B'

type Row = Record<string, unknown>
const store: Record<string, Row[]> = {}
let idSeq = 0
const genId = (table: string) => `${table}-${++idSeq}`

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const eqs: Row = {}
    let kind: 'read' | 'insert' = 'read'
    let payload: Row | Row[] = {}
    const match = (r: Row) => Object.entries(eqs).every(([k, v]) => r[k] === v)
    function doInsert(): Row[] {
      const rows = Array.isArray(payload) ? payload : [payload]
      const inserted = rows.map((r) => ({ id: r.id ?? genId(table), ...r }))
      store[table] = [...(store[table] || []), ...inserted]
      return inserted
    }
    const c: Record<string, unknown> = {
      select: () => c,
      insert: (p: Row | Row[]) => { kind = 'insert'; payload = p; return c },
      eq: (col: string, val: unknown) => { eqs[col] = val; return c },
      ilike: () => c,
      limit: () => c,
      single: async () => {
        if (kind === 'insert') { const [row] = doInsert(); return { data: row, error: null } }
        const found = (store[table] || []).find(match)
        return { data: found ?? null, error: found ? null : { message: 'not found' } }
      },
      maybeSingle: async () => {
        if (kind === 'insert') { const [row] = doInsert(); return { data: row, error: null } }
        const found = (store[table] || []).find(match)
        return { data: found ?? null, error: null }
      },
      then: (res: (v: { data: unknown; error: unknown }) => unknown) => {
        if (kind === 'insert') { doInsert(); return res({ data: null, error: null }) }
        return res({ data: (store[table] || []).filter(match), error: null })
      },
    }
    return c
  }
  return { supabaseAdmin: { from: (t: string) => chain(t) } }
})

vi.mock('@/lib/nycmaid/tenant', () => ({ isNycMaid: () => false }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/selena/agent', () => ({
  askSelena: vi.fn(async (_channel: string, _message: string, conversationId: string) =>
    ({ text: 'yinez reply', bookingCreated: false, conversationId })),
}))
vi.mock('@/lib/selena-legacy', () => ({
  EMPTY_CHECKLIST: {},
  getNextStep: () => ({ field: null, instruction: '' }),
  getQuickReplies: () => [],
  askSelena: vi.fn(async (_tenantId: string, _channel: string, _message: string, conversationId: string) =>
    ({ text: 'legacy reply', checklist: {}, bookingCreated: false, conversationId })),
}))

import { POST } from './route'
import { askSelena as legacyAskSelena } from '@/lib/selena-legacy'

function post(headers: Record<string, string>, body: Record<string, unknown> = {}) {
  return new NextRequest('https://app.fullloop.example/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify({ message: 'hi', ...body }),
  })
}

beforeEach(() => {
  idSeq = 0
  store.sms_conversations = [
    { id: 'convo-A1', tenant_id: TENANT_A },
    { id: 'convo-B1', tenant_id: TENANT_B },
  ]
  store.sms_conversation_messages = []
  store.clients = []
  vi.mocked(legacyAskSelena).mockClear()
})

describe("POST /api/chat — caller-supplied sessionId cannot hijack another tenant's conversation", () => {
  it('rejects a sessionId belonging to a DIFFERENT tenant — starts a fresh conversation instead of reusing the victim\'s', async () => {
    const sig = signTenantHeader(TENANT_A)
    const res = await POST(post({ 'x-tenant-id': TENANT_A, 'x-tenant-sig': sig }, { sessionId: 'convo-B1' }))

    expect(res.status).toBe(200)
    // askSelena must never see the victim's conversation id.
    const usedConvoId = vi.mocked(legacyAskSelena).mock.calls[0]?.[3]
    expect(usedConvoId).not.toBe('convo-B1')
    // The victim's conversation received no injected message.
    const injected = (store.sms_conversation_messages || []).filter((m) => m.conversation_id === 'convo-B1')
    expect(injected.length).toBe(0)
  })

  it('reuses the conversation when the sessionId genuinely belongs to the calling tenant', async () => {
    const sig = signTenantHeader(TENANT_A)
    const res = await POST(post({ 'x-tenant-id': TENANT_A, 'x-tenant-sig': sig }, { sessionId: 'convo-A1' }))

    expect(res.status).toBe(200)
    const usedConvoId = vi.mocked(legacyAskSelena).mock.calls[0]?.[3]
    expect(usedConvoId).toBe('convo-A1')
  })
})
