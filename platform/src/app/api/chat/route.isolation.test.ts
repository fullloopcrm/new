import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * tenantDb conversion probe — chat/route.ts.
 * Converts the returning-client lookup (`clients`) and the new-conversation
 * insert (`sms_conversations`) to tenantDb(tenantId) — both are genuinely
 * tenant-owned tables. Proves a phone number shared across two tenants'
 * client lists (plausible — phones aren't globally unique across separate
 * businesses) never cross-links tenant A's new web-chat session to tenant
 * B's client record.
 */

type Row = Record<string, unknown>
let store: Record<string, Row[]>

function matchesEq(row: Row, eqs: Record<string, unknown>): boolean {
  return Object.entries(eqs).every(([k, v]) => row[k] === v)
}

function matchesIlike(row: Row, ilikes: Record<string, string>): boolean {
  return Object.entries(ilikes).every(([k, pattern]) => {
    const val = String(row[k] ?? '')
    const re = new RegExp(pattern.split('%').map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*'), 'i')
    return re.test(val)
  })
}

function builder(table: string) {
  const eqs: Record<string, unknown> = {}
  const ilikes: Record<string, string> = {}
  let limitN: number | undefined
  let insertedRows: Row[] | null = null

  const rows = (): Row[] => {
    if (insertedRows) return insertedRows
    let r = (store[table] || []).filter((row) => matchesEq(row, eqs) && matchesIlike(row, ilikes))
    if (limitN != null) r = r.slice(0, limitN)
    return r
  }

  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    ilike: (col: string, pattern: string) => {
      ilikes[col] = pattern
      return chain
    },
    limit: (n: number) => {
      limitN = n
      return chain
    },
    order: () => chain,
    insert: (payload: Row | Row[]) => {
      const arr = Array.isArray(payload) ? payload : [payload]
      const withIds = arr.map((r, i) => ({ id: (r.id as string) || `${table}-${(store[table]?.length || 0) + i + 1}`, ...r }))
      store[table] = [...(store[table] || []), ...withIds]
      insertedRows = withIds
      return chain
    },
    single: () => Promise.resolve({ data: rows()[0] || null, error: null }),
    maybeSingle: () => Promise.resolve({ data: rows()[0] || null, error: null }),
    then: (resolve: (v: { data: Row[]; error: null }) => unknown) => resolve({ data: rows(), error: null }),
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
}))

vi.mock('@/lib/nycmaid/tenant', () => ({ isNycMaid: () => false }))
vi.mock('@/lib/notify', () => ({ notify: async () => {} }))
vi.mock('@/lib/settings', () => ({ getSettings: async () => ({ service_types: [] }) }))
vi.mock('@/lib/tenant-header-sig', () => ({
  verifyTenantHeaderSig: (tenantId: string, sig: string | null | undefined) => sig === `sig-${tenantId}`,
}))
vi.mock('@/lib/selena/agent', () => ({
  askSelena: async () => ({ text: 'yinez reply', bookingCreated: false }),
}))
vi.mock('@/lib/selena-legacy', () => ({
  EMPTY_CHECKLIST: {
    status: 'greeting', service_type: null, bedrooms: null, bathrooms: null, rate: null,
    day: null, date: null, time: null, name: null, phone: null, address: null, email: null, notes: null,
  },
  askSelena: async () => ({
    text: 'legacy reply',
    checklist: { status: 'collecting', service_type: null, bedrooms: null, bathrooms: null, rate: null, day: null, date: null, time: null, name: null, phone: null, address: null, email: null, notes: null },
    bookingCreated: false,
  }),
  getNextStep: () => ({ field: null, instruction: '' }),
  getQuickReplies: () => [],
  getSelenaConfig: async () => ({}),
}))

import { POST } from './route'

function postChat(tenantId: string, body: Record<string, unknown>) {
  return POST(
    new Request('http://x/api/chat', {
      method: 'POST',
      headers: { 'x-tenant-id': tenantId, 'x-tenant-sig': `sig-${tenantId}` },
      body: JSON.stringify(body),
    }) as never,
  )
}

beforeEach(() => {
  store = {
    clients: [
      { id: 'client-A1', tenant_id: 'tenant-A', name: 'Alice A', phone: '5551234567' },
      { id: 'client-B1', tenant_id: 'tenant-B', name: 'Bob B', phone: '5551234567' },
    ],
    sms_conversations: [],
    sms_conversation_messages: [],
  }
})

describe('chat/route POST — tenantDb isolation (clients lookup + sms_conversations insert)', () => {
  it('a new web-chat session for tenant A links to tenant A\'s client, never tenant B\'s, despite a shared phone number', async () => {
    const res = await postChat('tenant-A', { message: 'hi', phone: '5551234567' })
    expect(res.status).toBe(200)

    expect(store.sms_conversations).toHaveLength(1)
    const convo = store.sms_conversations[0]
    expect(convo.tenant_id).toBe('tenant-A')
    expect(convo.client_id).toBe('client-A1')
    expect((convo.booking_checklist as { name?: string }).name).toBe('Alice A')
  })

  it('the same phone number for tenant B links to tenant B\'s own client record', async () => {
    const res = await postChat('tenant-B', { message: 'hi', phone: '5551234567' })
    expect(res.status).toBe(200)

    expect(store.sms_conversations).toHaveLength(1)
    const convo = store.sms_conversations[0]
    expect(convo.tenant_id).toBe('tenant-B')
    expect(convo.client_id).toBe('client-B1')
    expect((convo.booking_checklist as { name?: string }).name).toBe('Bob B')
  })
})
