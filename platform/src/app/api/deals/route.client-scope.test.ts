import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/deals previously inserted `body.client_id` verbatim with no
 * check that it belongs to the authenticated tenant. Both this route's
 * create response and GET /api/deals join clients(name, email, phone,
 * address), so a foreign id let a staff member of tenant A pull another
 * tenant's client PII into a deal that still lives under tenant A's own
 * tenant_id (cross-tenant PII leak, same class already fixed on
 * bookings/quotes/invoices in 534a5834/7907701b).
 */

const TENANT = 'aaaaaaaa-1111-2222-3333-444444444444'
const OTHER_TENANT = 'cccccccc-9999-8888-7777-666666666666'
const OWN_CLIENT = 'dddddddd-0001-0001-0001-000000000001'
const FOREIGN_CLIENT = 'dddddddd-0002-0002-0002-000000000002'

type Row = Record<string, any>
const store: Record<string, Row[]> = {}
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
    function doUpdate(): Row[] {
      const rows = (store[table] || []).filter(match)
      const updated = rows.map((r) => ({ ...r, ...(payload as Row) }))
      store[table] = (store[table] || []).map((r) => (match(r) ? { ...r, ...(payload as Row) } : r))
      return updated
    }
    const c: Record<string, unknown> = {
      select: () => c,
      insert: (p: Row | Row[]) => { kind = 'insert'; payload = p; return c },
      update: (p: Row) => { kind = 'update'; payload = p; return c },
      eq: (col: string, val: unknown) => { eqs[col] = val; return c },
      in: () => c,
      order: () => c,
      limit: () => c,
      single: async () => {
        if (kind === 'insert') { const [row] = doInsert(); return { data: row, error: null } }
        if (kind === 'update') { const [row] = doUpdate(); return { data: row ?? null, error: row ? null : { message: 'not found' } } }
        const found = (store[table] || []).find(match)
        return { data: found ?? null, error: found ? null : { message: 'not found' } }
      },
      then: (res: (v: { data: unknown; error: unknown; count?: number }) => unknown) => {
        if (kind === 'insert') { const rows = doInsert(); return res({ data: rows, error: null }) }
        const rows = (store[table] || []).filter(match)
        return res({ data: rows, error: null, count: rows.length })
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

import { POST as CREATE } from '@/app/api/deals/route'

function jsonReq(body: Row): Request {
  return new Request('http://t.test/api/deals', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/deals — client tenant scoping', () => {
  beforeEach(() => {
    store.deals = []
    store.deal_activities = []
    store.clients = [
      { id: OWN_CLIENT, tenant_id: TENANT, name: 'Own Client', email: 'own@test.com', phone: '+15550001111', address: '1 Own St' },
      { id: FOREIGN_CLIENT, tenant_id: OTHER_TENANT, name: 'Foreign Client', email: 'foreign@test.com', phone: '+15559998888', address: '1 Foreign St' },
    ]
    idSeq = 0
  })

  it('rejects a client_id belonging to another tenant', async () => {
    const res = await CREATE(jsonReq({ client_id: FOREIGN_CLIENT, title: 'Sneaky deal' }))
    expect(res.status).toBe(404)
    expect(store.deals.length).toBe(0)
  })

  it('accepts a client_id belonging to the authenticated tenant', async () => {
    const res = await CREATE(jsonReq({ client_id: OWN_CLIENT, title: 'Legit deal' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.client_id).toBe(OWN_CLIENT)
    expect(store.deals.length).toBe(1)
  })
})
