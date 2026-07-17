import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/schedules verified team_member_id belonged to the caller's
 * tenant but never checked status — the "Create Recurring Schedule" form
 * (src/app/dashboard/schedules/page.tsx) lists every /api/team row with no
 * status filter, so an inactive/terminated employee could be picked as the
 * recurring assignee. That schedule would then spin off a booking onto them
 * every week via cron/generate-recurring, indefinitely.
 */

const TENANT = 'aaaaaaaa-1111-2222-3333-444444444444'
const OWN_CLIENT = 'dddddddd-0001-0001-0001-000000000001'
const ACTIVE_MEMBER = 'ffffffff-0001-0001-0001-000000000001'
const INACTIVE_MEMBER = 'ffffffff-0002-0002-0002-000000000002'

type Row = Record<string, any>
const store: Record<string, Row[]> = {}
let idSeq = 0
const genId = (table: string) => `${table}-${++idSeq}`

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const eqs: Row = {}
    const neqs: Row = {}
    let kind: 'read' | 'insert' | 'update' = 'read'
    let payload: Row | Row[] = {}
    const match = (r: Row) =>
      Object.entries(eqs).every(([k, v]) => r[k] === v) &&
      Object.entries(neqs).every(([k, v]) => r[k] !== v)
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
      neq: (col: string, val: unknown) => { neqs[col] = val; return c },
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
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT }, error: null }),
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

describe('POST /api/schedules — refuses to assign an inactive team member', () => {
  beforeEach(() => {
    store.recurring_schedules = []
    store.bookings = []
    store.service_types = []
    store.clients = [{ id: OWN_CLIENT, tenant_id: TENANT, name: 'Own Client' }]
    store.team_members = [
      { id: ACTIVE_MEMBER, tenant_id: TENANT, name: 'Active Member', status: 'active' },
      { id: INACTIVE_MEMBER, tenant_id: TENANT, name: 'Terminated Member', status: 'inactive' },
    ]
    idSeq = 0
  })

  it('rejects a team_member_id whose status is inactive', async () => {
    const res = await CREATE(jsonReq({ client_id: OWN_CLIENT, team_member_id: INACTIVE_MEMBER, recurring_type: 'weekly', day_of_week: 1 }))
    expect(res.status).toBe(400)
    expect(store.recurring_schedules.length).toBe(0)
    expect(store.bookings.length).toBe(0)
  })

  it('still accepts an active team_member_id', async () => {
    const res = await CREATE(jsonReq({ client_id: OWN_CLIENT, team_member_id: ACTIVE_MEMBER, recurring_type: 'weekly', day_of_week: 1 }))
    expect(res.status).toBe(201)
    expect(store.recurring_schedules.length).toBe(1)
  })
})
