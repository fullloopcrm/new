import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/schedules previously inserted `body.client_id`/`team_member_id`
 * verbatim into `recurring_schedules` (and every generated booking) with no
 * check that they belong to the authenticated tenant. Both the create
 * response and every later GET join clients(name)/team_members(name), so a
 * foreign id let a staff member of tenant A pull another tenant's client/staff
 * PII into a recurring schedule -- and the following 4 weeks of bookings --
 * that still live under tenant A's own tenant_id (cross-tenant PII leak, same
 * class already fixed on bookings/quotes/deals).
 */

const TENANT = 'aaaaaaaa-1111-2222-3333-444444444444'
const OTHER_TENANT = 'cccccccc-9999-8888-7777-666666666666'
const OWN_CLIENT = 'dddddddd-0001-0001-0001-000000000001'
const FOREIGN_CLIENT = 'dddddddd-0002-0002-0002-000000000002'
const OWN_MEMBER = 'ffffffff-0001-0001-0001-000000000001'
const FOREIGN_MEMBER = 'ffffffff-0002-0002-0002-000000000002'

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
    const c: Record<string, unknown> = {
      select: () => c,
      insert: (p: Row | Row[]) => { kind = 'insert'; payload = p; return c },
      update: (p: Row) => { kind = 'update'; payload = p; return c },
      eq: (col: string, val: unknown) => { eqs[col] = val; return c },
      order: () => c,
      range: () => c,
      limit: () => c,
      single: async () => {
        if (kind === 'insert') { const [row] = doInsert(); return { data: row, error: null } }
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
  getTenantForRequest: async () => ({ tenantId: TENANT, role: 'owner', tenant: {} }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) { super(message); this.status = status }
  },
}))

vi.mock('@/lib/audit', () => ({ audit: async () => {} }))

import { POST as CREATE } from '@/app/api/schedules/route'

function jsonReq(body: Row): Request {
  return new Request('http://t.test/api/schedules', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/schedules — client/team-member tenant scoping', () => {
  beforeEach(() => {
    store.recurring_schedules = []
    store.bookings = []
    store.service_types = []
    store.clients = [
      { id: OWN_CLIENT, tenant_id: TENANT, name: 'Own Client' },
      { id: FOREIGN_CLIENT, tenant_id: OTHER_TENANT, name: 'Foreign Client' },
    ]
    store.team_members = [
      { id: OWN_MEMBER, tenant_id: TENANT, name: 'Own Member' },
      { id: FOREIGN_MEMBER, tenant_id: OTHER_TENANT, name: 'Foreign Member' },
    ]
    idSeq = 0
  })

  it('rejects a client_id belonging to another tenant', async () => {
    const res = await CREATE(jsonReq({ client_id: FOREIGN_CLIENT, recurring_type: 'weekly', day_of_week: 1 }))
    expect(res.status).toBe(404)
    expect(store.recurring_schedules.length).toBe(0)
    expect(store.bookings.length).toBe(0)
  })

  it('rejects a team_member_id belonging to another tenant', async () => {
    const res = await CREATE(jsonReq({ client_id: OWN_CLIENT, team_member_id: FOREIGN_MEMBER, recurring_type: 'weekly', day_of_week: 1 }))
    expect(res.status).toBe(404)
    expect(store.recurring_schedules.length).toBe(0)
    expect(store.bookings.length).toBe(0)
  })

  it('accepts client_id/team_member_id both belonging to the authenticated tenant', async () => {
    const res = await CREATE(jsonReq({ client_id: OWN_CLIENT, team_member_id: OWN_MEMBER, recurring_type: 'weekly', day_of_week: 1 }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.schedule.client_id).toBe(OWN_CLIENT)
    expect(store.recurring_schedules.length).toBe(1)
    expect(store.bookings.length).toBeGreaterThan(0)
  })
})
