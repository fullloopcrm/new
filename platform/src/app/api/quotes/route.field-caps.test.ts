import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/quotes previously inserted title/description/contact_name/
 * contact_email/contact_phone/service_address/terms/notes and line_items
 * with no length or array-count cap. A quote is rendered on the public,
 * unauthenticated /quote/[token] page, so an oversized field written by an
 * authenticated sales.edit session would still be served to anyone with the
 * link. Caps now applied via lib/quote.ts's capQuoteTextField/normalizeLineItems
 * (same mechanism, same convention as /api/import-clients's array+field caps).
 */

const TENANT = 'aaaaaaaa-1111-2222-3333-444444444444'

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
import { MAX_LINE_ITEMS } from '@/lib/quote'

function jsonReq(body: Row): Request {
  return new Request('http://t.test/api/quotes', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/quotes — field caps', () => {
  beforeEach(() => {
    store.quotes = []
    store.deals = []
    store.deal_activities = []
    store.clients = []
    idSeq = 0
  })

  it('truncates oversized title/notes/terms instead of storing them unbounded', async () => {
    const res = await CREATE(jsonReq({
      title: 'T'.repeat(9999),
      notes: 'N'.repeat(9999),
      terms: 'X'.repeat(99999),
      line_items: [{ name: 'Deep clean', quantity: 1, unit_price_cents: 10000 }],
    }))
    expect(res.status).toBe(200)
    const quote = (await res.json()).quote as Row
    expect(quote.title.length).toBe(200)
    expect(quote.notes.length).toBe(2000)
    expect(quote.terms.length).toBe(10000)
  })

  it('caps line_items array length instead of storing an unbounded row', async () => {
    const oversized = Array.from({ length: MAX_LINE_ITEMS + 100 }, (_, i) => ({
      name: `Item ${i}`, quantity: 1, unit_price_cents: 100,
    }))
    const res = await CREATE(jsonReq({ line_items: oversized }))
    expect(res.status).toBe(200)
    const quote = (await res.json()).quote as Row
    expect(quote.line_items).toHaveLength(MAX_LINE_ITEMS)
  })

  it('leaves normal-length fields untouched', async () => {
    const res = await CREATE(jsonReq({
      title: 'Deep clean quote',
      line_items: [{ name: 'Deep clean', quantity: 1, unit_price_cents: 10000 }],
    }))
    expect(res.status).toBe(200)
    const quote = (await res.json()).quote as Row
    expect(quote.title).toBe('Deep clean quote')
  })
})
