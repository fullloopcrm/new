import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * PATCH /api/quotes/[id] previously allow-listed client_id for update with
 * no check that it belonged to the authenticated tenant (unlike its sibling
 * deals/[id] PATCH, which already has this check). GET /api/quotes/[id]
 * joins clients(id, name, email, phone, address), so a foreign client_id
 * let a staff member of tenant A pull another tenant's client PII into
 * their own quote on edit -- same class already fixed on quote/invoice
 * create (7907701b) and deals update.
 */

const TENANT = 'aaaaaaaa-1111-2222-3333-444444444444'
const OTHER_TENANT = 'cccccccc-9999-8888-7777-666666666666'
const OWN_CLIENT = 'dddddddd-0001-0001-0001-000000000001'
const FOREIGN_CLIENT = 'dddddddd-0002-0002-0002-000000000002'
const QUOTE_ID = 'quote-1'

type Row = Record<string, any>
const store: Record<string, Row[]> = {}

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const eqs: Row = {}
    let kind: 'read' | 'update' = 'read'
    let payload: Row = {}
    const match = (r: Row) => Object.entries(eqs).every(([k, v]) => r[k] === v)
    function doUpdate(): Row[] {
      const rows = (store[table] || []).filter(match)
      rows.forEach((r) => Object.assign(r, payload))
      return rows
    }
    const c: Record<string, unknown> = {
      select: () => c,
      update: (p: Row) => { kind = 'update'; payload = p; return c },
      eq: (col: string, val: unknown) => { eqs[col] = val; return c },
      order: () => c,
      limit: () => c,
      single: async () => {
        if (kind === 'update') { const [row] = doUpdate(); return { data: row ?? null, error: row ? null : { message: 'not found' } } }
        const found = (store[table] || []).find(match)
        return { data: found ?? null, error: found ? null : { message: 'not found' } }
      },
      maybeSingle: async () => {
        const found = (store[table] || []).find(match)
        return { data: found ?? null, error: null }
      },
      then: (res: (v: { data: unknown; error: unknown }) => unknown) => {
        const rows = (store[table] || []).filter(match)
        return res({ data: rows, error: null })
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

import { PATCH as UPDATE } from '@/app/api/quotes/[id]/route'

function jsonReq(body: Row): Request {
  return new Request(`http://t.test/api/quotes/${QUOTE_ID}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ silent: true, ...body }),
  })
}

describe('PATCH /api/quotes/[id] — client_id tenant scoping', () => {
  beforeEach(() => {
    store.quotes = [{ id: QUOTE_ID, tenant_id: TENANT, status: 'draft', client_id: OWN_CLIENT }]
    store.clients = [
      { id: OWN_CLIENT, tenant_id: TENANT, name: 'Own Client' },
      { id: FOREIGN_CLIENT, tenant_id: OTHER_TENANT, name: 'Foreign Client' },
    ]
  })

  it('rejects a client_id belonging to another tenant', async () => {
    const res = await UPDATE(jsonReq({ client_id: FOREIGN_CLIENT }), { params: Promise.resolve({ id: QUOTE_ID }) })
    expect(res.status).toBe(404)
    expect(store.quotes[0].client_id).toBe(OWN_CLIENT)
  })

  it('accepts a client_id belonging to the authenticated tenant', async () => {
    const res = await UPDATE(jsonReq({ client_id: OWN_CLIENT }), { params: Promise.resolve({ id: QUOTE_ID }) })
    expect(res.status).toBe(200)
    expect(store.quotes[0].client_id).toBe(OWN_CLIENT)
  })

  it('accepts an update that does not touch client_id', async () => {
    const res = await UPDATE(jsonReq({ notes: 'hello' }), { params: Promise.resolve({ id: QUOTE_ID }) })
    expect(res.status).toBe(200)
    expect(store.quotes[0].notes).toBe('hello')
  })
})
