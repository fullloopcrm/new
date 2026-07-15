import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * PUT /api/bookings/[id]/team previously wrote caller-supplied lead_id /
 * extra_team_member_ids verbatim into bookings.team_member_id +
 * booking_team_members with no check that they belong to the authenticated
 * tenant. closeout-summary and other reads join team_members(name, phone,
 * hourly_rate) off booking_team_members, so a foreign id let a staff member
 * of tenant A pull another tenant's staff PII into a booking's team (same
 * class already fixed on routes 995bd7f1 / bookings 534a5834).
 */

const TENANT = 'aaaaaaaa-1111-2222-3333-444444444444'
const OTHER_TENANT = 'cccccccc-9999-8888-7777-666666666666'
const OWN_MEMBER = 'ffffffff-0001-0001-0001-000000000001'
const OWN_MEMBER_2 = 'ffffffff-0003-0003-0003-000000000003'
const FOREIGN_MEMBER = 'ffffffff-0002-0002-0002-000000000002'
const BOOKING_ID = 'booking-1'

type Row = Record<string, any>
const store: Record<string, Row[]> = {}

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const eqs: Row = {}
    let inCol: { col: string; vals: unknown[] } | null = null
    let kind: 'read' | 'insert' | 'update' | 'delete' = 'read'
    let payload: Row | Row[] = {}
    const match = (r: Row) => {
      if (!Object.entries(eqs).every(([k, v]) => r[k] === v)) return false
      if (inCol && !inCol.vals.includes(r[inCol.col])) return false
      return true
    }
    function doInsert(): Row[] {
      const rows = Array.isArray(payload) ? payload : [payload]
      const inserted = rows.map((r) => ({ ...r }))
      store[table] = [...(store[table] || []), ...inserted]
      return inserted
    }
    function doUpdate(): Row[] {
      const rows = (store[table] || []).filter(match)
      rows.forEach((r) => Object.assign(r, payload))
      return rows
    }
    function doDelete(): void {
      store[table] = (store[table] || []).filter((r) => !match(r))
    }
    const c: Record<string, unknown> = {
      select: () => c,
      insert: (p: Row | Row[]) => { kind = 'insert'; payload = p; return c },
      update: (p: Row) => { kind = 'update'; payload = p; return c },
      delete: () => { kind = 'delete'; return c },
      eq: (col: string, val: unknown) => { eqs[col] = val; return c },
      in: (col: string, vals: unknown[]) => { inCol = { col, vals }; return c },
      order: () => c,
      single: async () => {
        if (kind === 'insert') { const [row] = doInsert(); return { data: row, error: null } }
        if (kind === 'update') { const [row] = doUpdate(); return { data: row ?? null, error: row ? null : { message: 'not found' } } }
        const found = (store[table] || []).find(match)
        return { data: found ?? null, error: found ? null : { message: 'not found' } }
      },
      then: (res: (v: { data: unknown; error: unknown }) => unknown) => {
        if (kind === 'insert') { const rows = doInsert(); return res({ data: rows, error: null }) }
        if (kind === 'update') { const rows = doUpdate(); return res({ data: rows, error: null }) }
        if (kind === 'delete') { doDelete(); return res({ data: null, error: null }) }
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

vi.mock('@/lib/notify-team', () => ({
  notifyTeamMember: async () => ({ teamMemberName: 'x' }),
  formatDeliveryReport: () => '',
}))
vi.mock('@/lib/sms-templates', () => ({ smsJobAssignment: () => '' }))

import { PUT as UPDATE_TEAM } from '@/app/api/bookings/[id]/team/route'

function jsonReq(body: Row): Request {
  return new Request(`http://t.test/api/bookings/${BOOKING_ID}/team`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('PUT /api/bookings/[id]/team — tenant scoping', () => {
  beforeEach(() => {
    store.bookings = [{ id: BOOKING_ID, tenant_id: TENANT, team_member_id: null, team_size: 1, start_time: null, clients: null }]
    store.booking_team_members = []
    store.tenants = [{ id: TENANT, name: 'Own Biz' }]
    store.team_members = [
      { id: OWN_MEMBER, tenant_id: TENANT },
      { id: OWN_MEMBER_2, tenant_id: TENANT },
      { id: FOREIGN_MEMBER, tenant_id: OTHER_TENANT },
    ]
  })

  it('rejects a lead_id belonging to another tenant', async () => {
    const res = await UPDATE_TEAM(jsonReq({ lead_id: FOREIGN_MEMBER, extra_team_member_ids: [] }), { params: Promise.resolve({ id: BOOKING_ID }) })
    expect(res.status).toBe(400)
    expect(store.bookings[0].team_member_id).toBe(null)
    expect(store.booking_team_members.length).toBe(0)
  })

  it('rejects an extra_team_member_ids entry belonging to another tenant', async () => {
    const res = await UPDATE_TEAM(jsonReq({ lead_id: OWN_MEMBER, extra_team_member_ids: [FOREIGN_MEMBER] }), { params: Promise.resolve({ id: BOOKING_ID }) })
    expect(res.status).toBe(400)
    expect(store.bookings[0].team_member_id).toBe(null)
    expect(store.booking_team_members.length).toBe(0)
  })

  it('accepts lead_id/extras all belonging to the authenticated tenant', async () => {
    const res = await UPDATE_TEAM(jsonReq({ lead_id: OWN_MEMBER, extra_team_member_ids: [OWN_MEMBER_2] }), { params: Promise.resolve({ id: BOOKING_ID }) })
    expect(res.status).toBe(200)
    expect(store.bookings[0].team_member_id).toBe(OWN_MEMBER)
    expect(store.booking_team_members.length).toBe(2)
  })
})
