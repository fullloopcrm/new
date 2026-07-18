import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * PATCH /api/quotes/[id] (autosave/edit) previously copied
 * title/description/contact fields/service_address/terms/notes straight from
 * the request body with no length cap -- a second, independently-reachable
 * write path to the same uncapped-string class fixed on POST /api/quotes.
 */

const TENANT = 'aaaaaaaa-1111-2222-3333-444444444444'
const QUOTE_ID = 'quote-1'

type Row = Record<string, any>
const store: Record<string, Row[]> = {
  quotes: [{ id: QUOTE_ID, tenant_id: TENANT, status: 'draft', line_items: [], tax_rate_bps: 0, discount_cents: 0 }],
}

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
      single: async () => {
        const found = (store[table] || []).find(match)
        return { data: found ?? null, error: found ? null : { message: 'not found' } }
      },
      maybeSingle: async () => {
        if (kind === 'update') {
          const idx = (store[table] || []).findIndex(match)
          if (idx === -1) return { data: null, error: null }
          store[table][idx] = { ...store[table][idx], ...payload }
          return { data: store[table][idx], error: null }
        }
        const found = (store[table] || []).find(match)
        return { data: found ?? null, error: null }
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

describe('PATCH /api/quotes/[id] — field caps', () => {
  beforeEach(() => {
    store.quotes = [{ id: QUOTE_ID, tenant_id: TENANT, status: 'draft', line_items: [], tax_rate_bps: 0, discount_cents: 0 }]
  })

  it('truncates an oversized notes/terms edit instead of storing it unbounded', async () => {
    const res = await PATCH(jsonReq({ notes: 'N'.repeat(9999), terms: 'X'.repeat(99999) }), { params: Promise.resolve({ id: QUOTE_ID }) })
    expect(res.status).toBe(200)
    const quote = (await res.json()).quote as Row
    expect(quote.notes.length).toBe(2000)
    expect(quote.terms.length).toBe(10000)
  })

  it('leaves a short edit untouched', async () => {
    const res = await PATCH(jsonReq({ title: 'Updated title' }), { params: Promise.resolve({ id: QUOTE_ID }) })
    expect(res.status).toBe(200)
    const quote = (await res.json()).quote as Row
    expect(quote.title).toBe('Updated title')
  })
})
