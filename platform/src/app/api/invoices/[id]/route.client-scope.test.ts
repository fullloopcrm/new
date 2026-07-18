import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * PATCH /api/invoices/[id] previously allow-listed client_id for update with
 * no check that it belonged to the authenticated tenant (unlike its sibling
 * deals/[id] PATCH, which already has this check). GET /api/invoices/[id]
 * joins clients(id, name, email, phone, address), so a foreign client_id
 * let a staff member of tenant A pull another tenant's client PII into
 * their own invoice on edit -- same class already fixed on quote/invoice
 * create (7907701b) and deals update.
 */

const TENANT = 'aaaaaaaa-1111-2222-3333-444444444444'
const OTHER_TENANT = 'cccccccc-9999-8888-7777-666666666666'
const OWN_CLIENT = 'dddddddd-0001-0001-0001-000000000001'
const FOREIGN_CLIENT = 'dddddddd-0002-0002-0002-000000000002'
const INVOICE_ID = 'invoice-1'

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
      insert: (p: Row) => { store[table] = [...(store[table] || []), p]; return Promise.resolve({ data: p, error: null }) },
      eq: (col: string, val: unknown) => { eqs[col] = val; return c },
      order: () => c,
      single: async () => {
        if (kind === 'update') { const [row] = doUpdate(); return { data: row ?? null, error: row ? null : { message: 'not found' } } }
        const found = (store[table] || []).find(match)
        return { data: found ?? null, error: found ? null : { message: 'not found' } }
      },
      maybeSingle: async () => {
        if (kind === 'update') { const [row] = doUpdate(); return { data: row ?? null, error: null } }
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
  getTenantForRequest: async () => ({ tenantId: TENANT }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) { super(message); this.status = status }
  },
}))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT }, error: null }),
}))

import { PATCH as UPDATE } from '@/app/api/invoices/[id]/route'

function jsonReq(body: Row): Request {
  return new Request(`http://t.test/api/invoices/${INVOICE_ID}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('PATCH /api/invoices/[id] — client_id tenant scoping', () => {
  beforeEach(() => {
    store.invoices = [{ id: INVOICE_ID, tenant_id: TENANT, status: 'draft', client_id: OWN_CLIENT }]
    store.clients = [
      { id: OWN_CLIENT, tenant_id: TENANT, name: 'Own Client' },
      { id: FOREIGN_CLIENT, tenant_id: OTHER_TENANT, name: 'Foreign Client' },
    ]
  })

  it('rejects a client_id belonging to another tenant', async () => {
    const res = await UPDATE(jsonReq({ client_id: FOREIGN_CLIENT }), { params: Promise.resolve({ id: INVOICE_ID }) })
    expect(res.status).toBe(404)
    expect(store.invoices[0].client_id).toBe(OWN_CLIENT)
  })

  it('accepts a client_id belonging to the authenticated tenant', async () => {
    const res = await UPDATE(jsonReq({ client_id: OWN_CLIENT }), { params: Promise.resolve({ id: INVOICE_ID }) })
    expect(res.status).toBe(200)
    expect(store.invoices[0].client_id).toBe(OWN_CLIENT)
  })

  it('accepts an update that does not touch client_id', async () => {
    const res = await UPDATE(jsonReq({ notes: 'hello' }), { params: Promise.resolve({ id: INVOICE_ID }) })
    expect(res.status).toBe(200)
    expect(store.invoices[0].notes).toBe('hello')
  })
})
