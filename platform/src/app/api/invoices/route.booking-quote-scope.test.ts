import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/invoices previously inserted directly-supplied `body.booking_id`
 * and `body.quote_id` verbatim with no ownership check -- unlike
 * from_booking_id/from_quote_id, which are already tenant-scoped by the
 * prefill lookups. A foreign booking_id/quote_id is a dangling cross-tenant
 * FK, the same class already guarded for client_id/entity_id in this handler.
 */

const TENANT = 'aaaaaaaa-1111-2222-3333-444444444444'
const OTHER_TENANT = 'cccccccc-9999-8888-7777-666666666666'
const OWN_BOOKING = 'booking-own-1'
const FOREIGN_BOOKING = 'booking-foreign-1'
const OWN_QUOTE = 'quote-own-1'
const FOREIGN_QUOTE = 'quote-foreign-1'

type Row = Record<string, any>
const store: Record<string, Row[]> = { invoices: [], clients: [], bookings: [], quotes: [] }
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
  getTenantForRequest: async () => ({ tenantId: TENANT }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) { super(message); this.status = status }
  },
}))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT }, error: null }),
}))

vi.mock('@/lib/entity', () => ({
  entityIdFromUrl: () => null,
  getDefaultEntityId: async () => null,
}))

vi.mock('@/lib/invoice', async (orig) => {
  const actual = await orig<typeof import('@/lib/invoice')>()
  return {
    ...actual,
    generateInvoiceNumber: async () => 'INV-TEST-0001',
    logInvoiceEvent: async () => {},
  }
})

import { POST as CREATE } from '@/app/api/invoices/route'

function jsonReq(body: Row): Request {
  return new Request('http://t.test/api/invoices', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/invoices — booking_id / quote_id tenant scoping', () => {
  beforeEach(() => {
    store.invoices = []
    store.clients = []
    store.bookings = [
      { id: OWN_BOOKING, tenant_id: TENANT },
      { id: FOREIGN_BOOKING, tenant_id: OTHER_TENANT },
    ]
    store.quotes = [
      { id: OWN_QUOTE, tenant_id: TENANT, line_items: [] },
      { id: FOREIGN_QUOTE, tenant_id: OTHER_TENANT, line_items: [] },
    ]
    idSeq = 0
  })

  it('rejects a directly-supplied booking_id belonging to another tenant', async () => {
    const res = await CREATE(jsonReq({
      booking_id: FOREIGN_BOOKING,
      line_items: [{ name: 'Deep clean', quantity: 1, unit_price_cents: 10000 }],
    }))
    expect(res.status).toBe(404)
    expect(store.invoices.length).toBe(0)
  })

  it('accepts a booking_id belonging to the authenticated tenant', async () => {
    const res = await CREATE(jsonReq({
      booking_id: OWN_BOOKING,
      line_items: [{ name: 'Deep clean', quantity: 1, unit_price_cents: 10000 }],
    }))
    expect(res.status).toBe(200)
    const invoice = (await res.json()).invoice as Row
    expect(invoice.booking_id).toBe(OWN_BOOKING)
  })

  it('rejects a directly-supplied quote_id belonging to another tenant', async () => {
    const res = await CREATE(jsonReq({
      quote_id: FOREIGN_QUOTE,
      line_items: [{ name: 'Deep clean', quantity: 1, unit_price_cents: 10000 }],
    }))
    expect(res.status).toBe(404)
    expect(store.invoices.length).toBe(0)
  })

  it('accepts a quote_id belonging to the authenticated tenant', async () => {
    const res = await CREATE(jsonReq({
      quote_id: OWN_QUOTE,
      line_items: [{ name: 'Deep clean', quantity: 1, unit_price_cents: 10000 }],
    }))
    expect(res.status).toBe(200)
    const invoice = (await res.json()).invoice as Row
    expect(invoice.quote_id).toBe(OWN_QUOTE)
  })

  it('allows omitting booking_id and quote_id entirely', async () => {
    const res = await CREATE(jsonReq({
      line_items: [{ name: 'Deep clean', quantity: 1, unit_price_cents: 10000 }],
    }))
    expect(res.status).toBe(200)
    const invoice = (await res.json()).invoice as Row
    expect(invoice.booking_id).toBe(null)
    expect(invoice.quote_id).toBe(null)
  })
})
