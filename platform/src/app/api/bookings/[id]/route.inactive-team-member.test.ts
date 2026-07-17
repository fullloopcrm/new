import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * PUT /api/bookings/[id] verified team_member_id belonged to the caller's
 * tenant but never checked status — an inactive/terminated team member could
 * still be assigned to a booking through the calendar drag-assign, the
 * dispatch timeline, and the fallback assign panel (none of which filter the
 * raw /api/team list client-side), and the server accepted it silently.
 */

const TENANT = 'aaaaaaaa-1111-2222-3333-444444444444'
const ACTIVE_MEMBER = 'ffffffff-0001-0001-0001-000000000001'
const INACTIVE_MEMBER = 'ffffffff-0002-0002-0002-000000000002'
const BOOKING_ID = 'booking-1'

type Row = Record<string, any>
const store: Record<string, Row[]> = {}

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const eqs: Row = {}
    const neqs: Row = {}
    let kind: 'read' | 'update' = 'read'
    let payload: Row = {}
    const match = (r: Row) =>
      Object.entries(eqs).every(([k, v]) => r[k] === v) &&
      Object.entries(neqs).every(([k, v]) => r[k] !== v)
    function doUpdate(): Row[] {
      const rows = (store[table] || []).filter(match)
      rows.forEach((r) => Object.assign(r, payload))
      return rows
    }
    const c: Record<string, unknown> = {
      select: () => c,
      update: (p: Row) => { kind = 'update'; payload = p; return c },
      eq: (col: string, val: unknown) => { eqs[col] = val; return c },
      neq: (col: string, val: unknown) => { neqs[col] = val; return c },
      maybeSingle: async () => {
        if (kind === 'update') { const [row] = doUpdate(); return { data: row ?? null, error: null } }
        const found = (store[table] || []).find(match)
        return { data: found ?? null, error: null }
      },
      single: async () => {
        if (kind === 'update') { const [row] = doUpdate(); return { data: row ?? null, error: row ? null : { message: 'not found' } } }
        const found = (store[table] || []).find(match)
        return { data: found ?? null, error: found ? null : { message: 'not found' } }
      },
    }
    return c
  }
  return { supabaseAdmin: { from: (t: string) => chain(t) } }
})

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT }, error: null }),
}))
vi.mock('@/lib/availability', () => ({ checkMemberDayOff: async () => ({ unavailable: false }) }))
vi.mock('@/lib/notify', () => ({ notify: async () => {} }))
vi.mock('@/lib/sms', () => ({ sendSMS: async () => {} }))
vi.mock('@/lib/sms-templates', () => ({ smsJobAssignment: () => '' }))
vi.mock('@/lib/messaging/client-sms', () => ({ clientSmsTemplatesFor: async () => ({}) }))
vi.mock('@/lib/audit', () => ({ audit: async () => {} }))

import { PUT as UPDATE } from '@/app/api/bookings/[id]/route'

function jsonReq(body: Row): Request {
  return new Request(`http://t.test/api/bookings/${BOOKING_ID}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('PUT /api/bookings/[id] — refuses to assign an inactive team member', () => {
  beforeEach(() => {
    store.bookings = [{ id: BOOKING_ID, tenant_id: TENANT, client_id: null, team_member_id: null, status: 'pending', start_time: '2026-08-01T10:00:00Z' }]
    store.team_members = [
      { id: ACTIVE_MEMBER, tenant_id: TENANT, name: 'Active Member', status: 'active' },
      { id: INACTIVE_MEMBER, tenant_id: TENANT, name: 'Terminated Member', status: 'inactive' },
    ]
  })

  it('rejects assigning a team_member_id whose status is inactive', async () => {
    const res = await UPDATE(jsonReq({ team_member_id: INACTIVE_MEMBER }), { params: Promise.resolve({ id: BOOKING_ID }) })
    expect(res.status).toBe(400)
    expect(store.bookings[0].team_member_id).toBe(null)
  })

  it('still accepts an active team_member_id', async () => {
    const res = await UPDATE(jsonReq({ team_member_id: ACTIVE_MEMBER }), { params: Promise.resolve({ id: BOOKING_ID }) })
    expect(res.status).toBe(200)
    expect(store.bookings[0].team_member_id).toBe(ACTIVE_MEMBER)
  })
})
