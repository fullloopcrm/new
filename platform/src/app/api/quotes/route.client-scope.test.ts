import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/quotes previously inserted `body.client_id` verbatim with no
 * check that the client belongs to the authenticated tenant. GET joins
 * `clients(id, name, email, phone, address)`, so a foreign client_id let a
 * staff member of tenant A pull another tenant's client PII into a quote
 * that still lives under tenant A's own tenant_id (cross-tenant PII leak,
 * not just a data-integrity issue).
 */

const TENANT = 'aaaaaaaa-1111-2222-3333-444444444444'
const OTHER_TENANT = 'cccccccc-9999-8888-7777-666666666666'
const OWN_CLIENT = 'client-own-1'
const FOREIGN_CLIENT = 'client-foreign-1'

type Row = Record<string, any>
const store: Record<string, Row[]> = { quotes: [], deals: [], deal_activities: [], clients: [] }
let idSeq = 0
const genId = (table: string) => `${table}-${++idSeq}`

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const eqs: Row = {}
    let kind: 'read' | 'insert' | 'update' = 'read'
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
      update: (p: Row) => { kind = 'update'; payload = p; return c },
      eq: (col: string, val: unknown) => { eqs[col] = val; return c },
      order: () => c,
      limit: () => c,
      single: async () => {
        if (kind === 'insert') { const [row] = doInsert(); return { data: row, error: null } }
        const found = (store[table] || []).find(match)
        return { data: found ?? null, error: found ? null : { message: 'not found' } }
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

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT, role: 'owner' }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) { super(message); this.status = status }
  },
}))

vi.mock('@/lib/quote', async (orig) => {
  const actual = await orig<typeof import('@/lib/quote')>()
  return {
    ...actual,
    generateQuoteNumber: async () => 'Q-TEST-0001',
    logQuoteEvent: async () => {},
  }
})

import { POST as CREATE } from '@/app/api/quotes/route'

function jsonReq(body: Row): Request {
  return new Request('http://t.test/api/quotes', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/quotes — client_id tenant scoping', () => {
  beforeEach(() => {
    store.quotes = []
    store.deals = []
    store.deal_activities = []
    store.clients = [
      { id: OWN_CLIENT, tenant_id: TENANT, name: 'Own Client', email: 'own@client.test', phone: '+15550001111' },
      { id: FOREIGN_CLIENT, tenant_id: OTHER_TENANT, name: 'Foreign Client', email: 'foreign@client.test', phone: '+15559998888' },
    ]
    idSeq = 0
  })

  it('rejects a client_id belonging to another tenant', async () => {
    const res = await CREATE(jsonReq({
      client_id: FOREIGN_CLIENT,
      line_items: [{ name: 'Deep clean', quantity: 1, unit_price_cents: 10000 }],
    }))
    expect(res.status).toBe(404)
    expect(store.quotes.length).toBe(0)
  })

  it('accepts a client_id belonging to the authenticated tenant', async () => {
    const res = await CREATE(jsonReq({
      client_id: OWN_CLIENT,
      line_items: [{ name: 'Deep clean', quantity: 1, unit_price_cents: 10000 }],
    }))
    expect(res.status).toBe(200)
    const quote = (await res.json()).quote as Row
    expect(quote.client_id).toBe(OWN_CLIENT)
  })

  it('allows omitting client_id entirely', async () => {
    const res = await CREATE(jsonReq({
      line_items: [{ name: 'Deep clean', quantity: 1, unit_price_cents: 10000 }],
    }))
    expect(res.status).toBe(200)
    const quote = (await res.json()).quote as Row
    expect(quote.client_id).toBe(null)
  })
})
