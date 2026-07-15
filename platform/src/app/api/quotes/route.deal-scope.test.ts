import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/quotes previously inserted `body.deal_id` verbatim with no check
 * that the deal belongs to the authenticated tenant -- the same class already
 * guarded for client_id in this same handler. A foreign deal_id creates a
 * dangling cross-tenant FK: the deal_activities row inserted right after
 * carries this tenant's tenant_id but points at another tenant's deal_id.
 */

const TENANT = 'aaaaaaaa-1111-2222-3333-444444444444'
const OTHER_TENANT = 'cccccccc-9999-8888-7777-666666666666'
const OWN_DEAL = 'deal-own-1'
const FOREIGN_DEAL = 'deal-foreign-1'

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

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT }, error: null }),
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

describe('POST /api/quotes — deal_id tenant scoping', () => {
  beforeEach(() => {
    store.quotes = []
    store.deal_activities = []
    store.clients = []
    store.deals = [
      { id: OWN_DEAL, tenant_id: TENANT, stage: 'new' },
      { id: FOREIGN_DEAL, tenant_id: OTHER_TENANT, stage: 'new' },
    ]
    idSeq = 0
  })

  it('rejects a deal_id belonging to another tenant', async () => {
    const res = await CREATE(jsonReq({
      deal_id: FOREIGN_DEAL,
      line_items: [{ name: 'Deep clean', quantity: 1, unit_price_cents: 10000 }],
    }))
    expect(res.status).toBe(404)
    expect(store.quotes.length).toBe(0)
    expect(store.deal_activities.length).toBe(0)
  })

  it('accepts a deal_id belonging to the authenticated tenant', async () => {
    const res = await CREATE(jsonReq({
      deal_id: OWN_DEAL,
      silent: true,
      line_items: [{ name: 'Deep clean', quantity: 1, unit_price_cents: 10000 }],
    }))
    expect(res.status).toBe(200)
    const quote = (await res.json()).quote as Row
    expect(quote.deal_id).toBe(OWN_DEAL)
  })

  it('allows omitting deal_id entirely', async () => {
    const res = await CREATE(jsonReq({
      line_items: [{ name: 'Deep clean', quantity: 1, unit_price_cents: 10000 }],
    }))
    expect(res.status).toBe(200)
    const quote = (await res.json()).quote as Row
    expect(quote.deal_id).toBe(null)
  })
})
