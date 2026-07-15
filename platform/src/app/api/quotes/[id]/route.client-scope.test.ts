import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * PATCH /api/quotes/[id] previously assigned `body.client_id` verbatim with
 * no check that the client belongs to the authenticated tenant. GET joins
 * `clients(id, name, email, phone, address)`, so re-pointing an existing
 * quote at a foreign client_id let a staff member of tenant A pull another
 * tenant's client PII into a quote that still lives under tenant A's own
 * tenant_id (same cross-tenant PII leak already fixed on POST /api/quotes).
 */

const TENANT = 'aaaaaaaa-1111-2222-3333-444444444444'
const OTHER_TENANT = 'cccccccc-9999-8888-7777-666666666666'
const OWN_CLIENT = 'client-own-1'
const FOREIGN_CLIENT = 'client-foreign-1'
const QUOTE_ID = 'quote-1'

type Row = Record<string, any>
const store: Record<string, Row[]> = { quotes: [], clients: [] }

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const eqs: Row = {}
    let kind: 'read' | 'update' = 'read'
    let payload: Row = {}
    const match = (r: Row) => Object.entries(eqs).every(([k, v]) => r[k] === v)
    const c: Record<string, unknown> = {
      select: () => c,
      update: (p: Row) => { kind = 'update'; payload = p; return c },
      eq: (col: string, val: unknown) => { eqs[col] = val; return c },
      order: () => c,
      limit: () => c,
      single: async () => {
        if (kind === 'update') {
          const idx = (store[table] || []).findIndex(match)
          if (idx === -1) return { data: null, error: { message: 'not found' } }
          store[table][idx] = { ...store[table][idx], ...payload }
          return { data: store[table][idx], error: null }
        }
        const found = (store[table] || []).find(match)
        return { data: found ?? null, error: found ? null : { message: 'not found' } }
      },
      then: (res: (v: { data: unknown; error: unknown }) => unknown) => {
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

vi.mock('@/lib/quote', async (orig) => {
  const actual = await orig<typeof import('@/lib/quote')>()
  return { ...actual, logQuoteEvent: async () => {} }
})

import { PATCH } from '@/app/api/quotes/[id]/route'

function jsonReq(body: Row): Request {
  return new Request(`http://t.test/api/quotes/${QUOTE_ID}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const params = Promise.resolve({ id: QUOTE_ID })

describe('PATCH /api/quotes/[id] — client_id tenant scoping', () => {
  beforeEach(() => {
    store.quotes = [
      { id: QUOTE_ID, tenant_id: TENANT, status: 'draft', client_id: OWN_CLIENT, line_items: [], tax_rate_bps: 0, discount_cents: 0 },
    ]
    store.clients = [
      { id: OWN_CLIENT, tenant_id: TENANT, name: 'Own Client', email: 'own@client.test' },
      { id: FOREIGN_CLIENT, tenant_id: OTHER_TENANT, name: 'Foreign Client', email: 'foreign@client.test' },
    ]
  })

  it('rejects re-pointing a quote at a client_id belonging to another tenant', async () => {
    const res = await PATCH(jsonReq({ client_id: FOREIGN_CLIENT }), { params })
    expect(res.status).toBe(404)
    expect(store.quotes[0].client_id).toBe(OWN_CLIENT)
  })

  it('accepts re-pointing a quote at a client_id belonging to the authenticated tenant', async () => {
    const res = await PATCH(jsonReq({ client_id: OWN_CLIENT }), { params })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.quote.client_id).toBe(OWN_CLIENT)
  })

  it('allows other field edits without touching client_id', async () => {
    const res = await PATCH(jsonReq({ title: 'Updated title' }), { params })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.quote.title).toBe('Updated title')
    expect(body.quote.client_id).toBe(OWN_CLIENT)
  })
})
