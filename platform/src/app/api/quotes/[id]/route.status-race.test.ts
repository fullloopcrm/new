import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * PATCH and DELETE /api/quotes/[id] both read `status` via a plain SELECT
 * snapshot, check it's not accepted/converted, then used to write
 * unconditionally. A concurrent customer accept() landing in the gap
 * between that read and the write let the staff edit/delete go through
 * anyway -- silently rewriting line items/totals/deposit on a quote the
 * customer just accepted, or deleting it outright while a deposit-checkout
 * flow may already be in progress. Fixed with the same
 * compare-and-swap-on-read-status pattern already used on the public quote
 * view route.
 */

const TENANT = 'aaaaaaaa-1111-2222-3333-444444444444'
const QUOTE_ID = 'quote-1'

type Row = Record<string, any>
const store: Record<string, Row[]> = {}

let selectHits = 0
let raceAtSelect: number | null = null
let raceMutation: ((row: Row) => void) | null = null

vi.mock('@/lib/quote', () => ({
  normalizeLineItems: (items: unknown[]) => items,
  computeTotals: () => ({ subtotal_cents: 0, tax_cents: 0, discount_cents: 0, total_cents: 0 }),
  logQuoteEvent: vi.fn(async () => {}),
  capQuoteTextField: (_key: string, value: unknown) => (value == null || value === '' ? null : String(value)),
}))

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const eqs: Row = {}
    let kind: 'read' | 'update' | 'delete' = 'read'
    let payload: Row = {}
    const match = (r: Row) => Object.entries(eqs).every(([k, v]) => r[k] === v)
    function doUpdate(): Row[] {
      const rows = (store[table] || []).filter(match)
      rows.forEach((r) => Object.assign(r, payload))
      return rows
    }
    function doDelete(): Row[] {
      const rows = (store[table] || []).filter(match)
      store[table] = (store[table] || []).filter((r) => !match(r))
      return rows
    }
    function readOne(): Row | null {
      const found = (store[table] || []).find(match) || null
      if (!found) return null
      selectHits += 1
      const snapshot = { ...found }
      if (selectHits === raceAtSelect && raceMutation) raceMutation(found)
      return snapshot
    }
    const c: Record<string, unknown> = {
      select: () => c,
      update: (p: Row) => { kind = 'update'; payload = p; return c },
      delete: () => { kind = 'delete'; return c },
      eq: (col: string, val: unknown) => { eqs[col] = val; return c },
      single: async () => {
        if (kind === 'update') { const [row] = doUpdate(); return { data: row ?? null, error: row ? null : { message: 'not found' } } }
        const row = readOne()
        return { data: row, error: row ? null : { message: 'not found' } }
      },
      maybeSingle: async () => {
        if (kind === 'update') { const [row] = doUpdate(); return { data: row ?? null, error: null } }
        if (kind === 'delete') { const [row] = doDelete(); return { data: row ?? null, error: null } }
        return { data: readOne(), error: null }
      },
      then: (resolve: (v: unknown) => void, reject: (e: unknown) => void) => {
        if (kind === 'update') { const rows = doUpdate(); return Promise.resolve({ data: rows, error: null }).then(resolve, reject) }
        if (kind === 'delete') { const rows = doDelete(); return Promise.resolve({ data: rows, error: null }).then(resolve, reject) }
        const rows = (store[table] || []).filter(match)
        return Promise.resolve({ data: rows, error: null }).then(resolve, reject)
      },
    }
    return c
  }
  return { supabaseAdmin: { from: (t: string) => chain(t) } }
})

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT }, error: null }),
}))
vi.mock('@/lib/tenant-query', () => ({
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) { super(message); this.status = status }
  },
}))

import { PATCH, DELETE } from '@/app/api/quotes/[id]/route'

function patchReq(body: Row): Request {
  return new Request(`http://t.test/api/quotes/${QUOTE_ID}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ silent: true, ...body }),
  })
}
function deleteReq(): Request {
  return new Request(`http://t.test/api/quotes/${QUOTE_ID}`, { method: 'DELETE' })
}
const params = { params: Promise.resolve({ id: QUOTE_ID }) }

describe('PATCH /api/quotes/[id] — status race with a concurrent accept', () => {
  beforeEach(() => {
    store.quotes = [{ id: QUOTE_ID, tenant_id: TENANT, status: 'sent', title: 'Old title' }]
    selectHits = 0
    raceAtSelect = null
    raceMutation = null
  })

  it('does not clobber a quote that turned "accepted" underneath the edit', async () => {
    raceAtSelect = 1
    raceMutation = (row) => { row.status = 'accepted' }

    const res = await PATCH(patchReq({ title: 'New title' }), params)

    expect(res.status).toBe(409)
    expect(store.quotes[0].status).toBe('accepted')
    expect(store.quotes[0].title).toBe('Old title')
  })

  it('still applies the edit with no concurrent change (no regression)', async () => {
    const res = await PATCH(patchReq({ title: 'New title' }), params)
    expect(res.status).toBe(200)
    expect(store.quotes[0].title).toBe('New title')
  })
})

describe('DELETE /api/quotes/[id] — status race with a concurrent accept', () => {
  beforeEach(() => {
    store.quotes = [{ id: QUOTE_ID, tenant_id: TENANT, status: 'sent' }]
    selectHits = 0
    raceAtSelect = null
    raceMutation = null
  })

  it('does not delete a quote that turned "accepted" underneath the request', async () => {
    raceAtSelect = 1
    raceMutation = (row) => { row.status = 'accepted' }

    const res = await DELETE(deleteReq(), params)

    expect(res.status).toBe(409)
    expect(store.quotes).toHaveLength(1)
    expect(store.quotes[0].status).toBe('accepted')
  })

  it('still deletes with no concurrent change (no regression)', async () => {
    const res = await DELETE(deleteReq(), params)
    expect(res.status).toBe(200)
    expect(store.quotes).toHaveLength(0)
  })
})
