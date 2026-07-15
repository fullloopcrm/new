import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * PATCH /api/deals/[id] previously allowed reassigning `client_id` to any
 * id verbatim with no check that it belongs to the authenticated tenant.
 * Both this route's response and every later GET join
 * clients(name, email, phone), so a foreign id let a staff member of
 * tenant A pull another tenant's client PII into their own deal
 * (cross-tenant PII leak, same class already fixed on
 * bookings/quotes/invoices in 534a5834/7907701b).
 */

const TENANT = 'aaaaaaaa-1111-2222-3333-444444444444'
const OTHER_TENANT = 'cccccccc-9999-8888-7777-666666666666'
const OWN_CLIENT = 'dddddddd-0001-0001-0001-000000000001'
const FOREIGN_CLIENT = 'dddddddd-0002-0002-0002-000000000002'
const DEAL_ID = 'deal-1'

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
      store[table] = (store[table] || []).map((r) => (match(r) ? { ...r, ...payload } : r))
      return rows.map((r) => ({ ...r, ...payload }))
    }
    const c: Record<string, unknown> = {
      select: () => c,
      update: (p: Row) => { kind = 'update'; payload = p; return c },
      eq: (col: string, val: unknown) => { eqs[col] = val; return c },
      single: async () => {
        if (kind === 'update') { const [row] = doUpdate(); return { data: row ?? null, error: row ? null : { message: 'not found' } } }
        const found = (store[table] || []).find(match)
        return { data: found ?? null, error: found ? null : { message: 'not found' } }
      },
      maybeSingle: async () => {
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

import { PATCH as UPDATE } from '@/app/api/deals/[id]/route'

function jsonReq(body: Row): Request {
  return new Request(`http://t.test/api/deals/${DEAL_ID}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('PATCH /api/deals/[id] — client tenant scoping', () => {
  beforeEach(() => {
    store.deals = [{ id: DEAL_ID, tenant_id: TENANT, title: 'Existing deal', client_id: OWN_CLIENT }]
    store.clients = [
      { id: OWN_CLIENT, tenant_id: TENANT, name: 'Own Client', email: 'own@test.com', phone: '+15550001111' },
      { id: FOREIGN_CLIENT, tenant_id: OTHER_TENANT, name: 'Foreign Client', email: 'foreign@test.com', phone: '+15559998888' },
    ]
    store.deal_activities = []
  })

  it('rejects reassigning client_id to another tenant\'s client', async () => {
    const res = await UPDATE(jsonReq({ client_id: FOREIGN_CLIENT }), { params: Promise.resolve({ id: DEAL_ID }) })
    expect(res.status).toBe(404)
    expect(store.deals[0].client_id).toBe(OWN_CLIENT)
  })

  it('accepts reassigning client_id to a client of the same tenant', async () => {
    const res = await UPDATE(jsonReq({ client_id: OWN_CLIENT, title: 'Renamed' }), { params: Promise.resolve({ id: DEAL_ID }) })
    expect(res.status).toBe(200)
    expect(store.deals[0].client_id).toBe(OWN_CLIENT)
  })
})
