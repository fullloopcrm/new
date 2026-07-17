import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * PUT /api/bookings/[id]/team updates bookings.team_member_id/team_size,
 * THEN deletes+re-inserts booking_team_members rows with no rollback if the
 * insert fails. That leaves the booking pointing at a new lead/team_size
 * with zero booking_team_members rows -- payroll (cleaner-payout),
 * closeout-summary, and team notifications all join off booking_team_members,
 * so the "assigned" team silently vanishes from every downstream read. Same
 * orphaned-write rollback class already fixed on the recurring-schedule
 * create paths this session (9d11f102).
 */

const TENANT = 'aaaaaaaa-1111-2222-3333-444444444444'
const OWN_MEMBER = 'ffffffff-0001-0001-0001-000000000001'
const OWN_MEMBER_2 = 'ffffffff-0003-0003-0003-000000000003'
const BOOKING_ID = 'booking-1'

type Row = Record<string, any>
const store: Record<string, Row[]> = {}
let failTeamInsert = false

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
    function doInsert(): { rows: Row[]; error: Row | null } {
      if (table === 'booking_team_members' && failTeamInsert) {
        failTeamInsert = false // only fail the first (replacement) insert; the rollback re-insert must succeed
        return { rows: [], error: { message: 'simulated insert failure' } }
      }
      const rows = Array.isArray(payload) ? payload : [payload]
      const inserted = rows.map((r) => ({ ...r }))
      store[table] = [...(store[table] || []), ...inserted]
      return { rows: inserted, error: null }
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
        if (kind === 'insert') { const { rows, error } = doInsert(); return { data: rows[0] ?? null, error } }
        if (kind === 'update') { const rows = doUpdate(); return { data: rows[0] ? { ...rows[0] } : null, error: rows[0] ? null : { message: 'not found' } } }
        // Real Supabase returns a fresh JSON payload per call, not a live reference
        // into server state -- clone so callers can't accidentally alias/mutate the store.
        const found = (store[table] || []).find(match)
        return { data: found ? { ...found } : null, error: found ? null : { message: 'not found' } }
      },
      then: (res: (v: { data: unknown; error: unknown }) => unknown) => {
        if (kind === 'insert') { const { rows, error } = doInsert(); return res({ data: error ? null : rows, error }) }
        if (kind === 'update') { const rows = doUpdate(); return res({ data: rows, error: null }) }
        if (kind === 'delete') { doDelete(); return res({ data: null, error: null }) }
        const rows = (store[table] || []).filter(match).map((r) => ({ ...r }))
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

describe('PUT /api/bookings/[id]/team — orphaned write rollback', () => {
  beforeEach(() => {
    failTeamInsert = false
    store.bookings = [{ id: BOOKING_ID, tenant_id: TENANT, team_member_id: OWN_MEMBER, team_size: 1, start_time: null, clients: null }]
    store.booking_team_members = [{ tenant_id: TENANT, booking_id: BOOKING_ID, team_member_id: OWN_MEMBER, is_lead: true, position: 1 }]
    store.tenants = [{ id: TENANT, name: 'Own Biz' }]
    store.team_members = [
      { id: OWN_MEMBER, tenant_id: TENANT },
      { id: OWN_MEMBER_2, tenant_id: TENANT },
    ]
  })

  it('rolls back bookings + booking_team_members when the replacement insert fails', async () => {
    failTeamInsert = true
    const res = await UPDATE_TEAM(jsonReq({ lead_id: OWN_MEMBER_2, extra_team_member_ids: [] }), { params: Promise.resolve({ id: BOOKING_ID }) })

    expect(res.status).toBe(500)
    // bookings row restored to the pre-write lead/team_size, not left pointing at OWN_MEMBER_2
    expect(store.bookings[0].team_member_id).toBe(OWN_MEMBER)
    expect(store.bookings[0].team_size).toBe(1)
    // booking_team_members restored to the original row, not left empty
    expect(store.booking_team_members.length).toBe(1)
    expect(store.booking_team_members[0].team_member_id).toBe(OWN_MEMBER)
  })

  it('succeeds normally when the insert does not fail', async () => {
    const res = await UPDATE_TEAM(jsonReq({ lead_id: OWN_MEMBER_2, extra_team_member_ids: [] }), { params: Promise.resolve({ id: BOOKING_ID }) })

    expect(res.status).toBe(200)
    expect(store.bookings[0].team_member_id).toBe(OWN_MEMBER_2)
    expect(store.booking_team_members.length).toBe(1)
    expect(store.booking_team_members[0].team_member_id).toBe(OWN_MEMBER_2)
  })
})
