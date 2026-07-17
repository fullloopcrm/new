import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/dashboard/schedules/import matched staff by name against
 * team_members with no status filter — a 4th write path (alongside
 * bookings/[id] PUT, schedules POST, jobs/[id]/sessions POST) that could
 * assign a bulk-imported booking/recurring schedule onto an inactive or
 * terminated team member. Fixed by excluding inactive members from the
 * name-match map, so an inactive name resolves the same as any other
 * unmatched staff name: imported unassigned instead of erroring.
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
    let kind: 'read' | 'insert' = 'read'
    let payload: Row | Row[] = {}
    const match = (r: Row) => Object.entries(eqs).every(([k, v]) => r[k] === v)
    function doInsert(): Row[] {
      const rows = Array.isArray(payload) ? payload : [payload]
      const inserted = rows.map((r) => ({ id: r.id ?? genId(table), ...r }))
      store[table] = [...(store[table] || []), ...inserted]
      return inserted
    }
    const c: Record<string, unknown> = {
      select: (cols?: string) => { if (kind !== 'insert') return c; return { ...c, _cols: cols } },
      insert: (p: Row | Row[]) => { kind = 'insert'; payload = p; return c },
      eq: (col: string, val: unknown) => { eqs[col] = val; return c },
      then: (res: (v: { data: unknown; error: unknown }) => unknown) => {
        if (kind === 'insert') { const rows = doInsert(); return res({ data: rows, error: null }) }
        const rows = (store[table] || []).filter(match)
        return res({ data: rows, error: null })
      },
    }
    return c
  }
  return { supabaseAdmin: { from: (t: string) => chain(t) } }
})

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT }, error: null }),
}))

vi.mock('@/lib/audit', () => ({ audit: async () => {} }))

import { POST as IMPORT } from '@/app/api/dashboard/schedules/import/route'

function jsonReq(body: Row): Request {
  return new Request('http://t.test/api/dashboard/schedules/import', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/dashboard/schedules/import — excludes inactive team members from name match', () => {
  beforeEach(() => {
    store.bookings = []
    store.recurring_schedules = []
    store.clients = [{ id: OWN_CLIENT, tenant_id: TENANT, name: 'Own Client', phone: '5551234567' }]
    store.team_members = [
      { id: ACTIVE_MEMBER, tenant_id: TENANT, name: 'Active Member', status: 'active' },
      { id: INACTIVE_MEMBER, tenant_id: TENANT, name: 'Terminated Member', status: 'inactive' },
    ]
    idSeq = 0
  })

  it('imports a booking assigned to an inactive-named staffer as unassigned, not to the inactive id', async () => {
    const res = await IMPORT(jsonReq({
      rows: [{ client_phone: '5551234567', staff_name: 'Terminated Member', start: '2026-08-01T10:00:00Z' }],
    }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.importedBookings).toBe(1)
    expect(store.bookings.length).toBe(1)
    expect(store.bookings[0].team_member_id).toBeNull()
  })

  it('still resolves an active-named staffer to their id', async () => {
    const res = await IMPORT(jsonReq({
      rows: [{ client_phone: '5551234567', staff_name: 'Active Member', start: '2026-08-01T10:00:00Z' }],
    }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.importedBookings).toBe(1)
    expect(store.bookings[0].team_member_id).toBe(ACTIVE_MEMBER)
  })
})
