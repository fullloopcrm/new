import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 INDEPENDENT verification lane for the team-portal/30min-alert IDOR fix
 * (de516e18).
 *
 * Fix de516e18 authenticated the (previously anonymous) payment-alert route and
 * scoped the booking to the caller's tenant + role visibility before any SMS /
 * notify / timestamp write. The fix's own suite (alert-authz.test.ts) covers
 * no-token 401, cross-tenant 404, same-tenant-not-assigned 403, and assigned
 * worker 200.
 *
 * This independently-authored suite locks THREE complementary properties of the
 * visibility matrix that sibling does NOT assert:
 *
 *   1. MANAGER-ONLY UNASSIGNED CARVE-OUT — a manager MAY fire the alert on an
 *      as-yet-unassigned booking (team_member_id null) → 200.
 *
 *   2. THE CARVE-OUT IS MANAGER-ONLY — a worker on the SAME unassigned booking
 *      is rejected (403) with ZERO side effects. Without this, the "unassigned
 *      → allow" branch would be an authz hole for every role.
 *
 *   3. SECONDARY-ASSIGNEE VISIBILITY VIA booking_team_members — a worker who is
 *      NOT the primary team_member but IS listed in booking_team_members can
 *      fire the alert (200), and that lookup is tenant-scoped.
 *
 * createToken runs for real against TEAM_PORTAL_SECRET.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-000000000001'
const MEMBER_A = '11111111-0000-0000-0000-000000000001'
const MEMBER_OTHER = '99999999-0000-0000-0000-000000000099'

type Eqs = Record<string, unknown>
type Booking = { tenant_id: string; team_member_id: string | null }
const state: { booking: Booking | null; extraMembers: Array<{ team_member_id: string }>; activeIds: string[] } = {
  booking: null, extraMembers: [], activeIds: [MEMBER_A, MEMBER_OTHER],
}
const calls = { adminSms: 0, clientSms: 0, notify: 0, bookingUpdates: 0 }
const btmReads: Array<{ eqs: Eqs }> = []

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    let selectStr = ''
    let isUpdate = false
    const eqs: Eqs = {}
    const c: Record<string, unknown> = {
      select: (s = '') => { selectStr = s; return c },
      update: () => { isUpdate = true; return c },
      insert: () => c,
      eq: (col: string, val: unknown) => { eqs[col] = val; return c },
      in: () => c,
      not: () => c,
      order: () => c,
      limit: async () => ({ data: [], error: null }),
      single: async () => {
        if (table === 'team_members' && selectStr.includes('status')) return { data: { status: 'active' }, error: null }
        if (table === 'tenants' && selectStr.includes('selena_config')) return { data: { selena_config: null }, error: null }
        if (table === 'tenants') return { data: { name: 'T', telnyx_api_key: null, telnyx_phone: null, payment_link: null }, error: null }
        if (table === 'bookings') {
          return state.booking
            ? { data: { id: 'bk', client_id: null, start_time: '2026-08-01T10:00:00', check_in_time: '2026-08-01T10:00:00', check_out_time: null, service_type: 'regular', hourly_rate: 69, pay_rate: 25, price: 0, notes: null, max_hours: null, team_size: 1, payment_status: 'unpaid', fifteen_min_alert_time: null, clients: null, team_members: null, ...state.booking }, error: null }
            : { data: null, error: null }
        }
        return { data: null, error: null }
      },
      then: (res: (v: { data: unknown[]; error: null }) => unknown) => {
        if (isUpdate && table === 'bookings') calls.bookingUpdates++
        if (table === 'booking_team_members') { btmReads.push({ eqs: { ...eqs } }); return res({ data: state.extraMembers, error: null }) }
        if (table === 'team_members') return res({ data: state.activeIds.map((id) => ({ id })), error: null })
        return res({ data: [], error: null })
      },
    }
    return c
  }
  return { supabaseAdmin: { from: (t: string) => chain(t), rpc: async () => ({ data: null, error: null }) } }
})

vi.mock('@/lib/notify', () => ({ notify: async () => { calls.notify++ } }))
vi.mock('@/lib/admin-contacts', () => ({ smsAdmins: async () => { calls.adminSms++ } }))
vi.mock('@/lib/nycmaid/client-contacts', () => ({ sendClientSMS: async () => { calls.clientSms++; return { sent: 1, skipped: 0 } } }))

import { NextRequest } from 'next/server'
import { createToken } from '@/app/api/team-portal/auth/token'
import { POST } from './route'

function req(token: string): NextRequest {
  return new NextRequest('https://x/api/team-portal/30min-alert', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ bookingId: 'bk' }),
  })
}

beforeEach(() => {
  process.env.TEAM_PORTAL_SECRET = 'unit-test-team-portal-secret'
  state.booking = null
  state.extraMembers = []
  state.activeIds = [MEMBER_A, MEMBER_OTHER]
  calls.adminSms = 0; calls.clientSms = 0; calls.notify = 0; calls.bookingUpdates = 0
  btmReads.length = 0
})

// ── 1. Manager may act on an unassigned booking ─────────────────────────────

describe('W4 15min-alert: manager-only unassigned carve-out', () => {
  it('ALLOWS a manager on an unassigned booking (team_member_id null) → 200, alert fires', async () => {
    state.booking = { tenant_id: TENANT_A, team_member_id: null }
    const token = createToken(MEMBER_A, TENANT_A, 0, 'manager')
    const res = await POST(req(token))
    expect(res.status).toBe(200)
    expect(calls.adminSms).toBeGreaterThan(0)
    expect(calls.bookingUpdates).toBeGreaterThan(0)
  })

  // ── 2. …but a worker may NOT ──────────────────────────────────────────────
  it('REJECTS a worker on the SAME unassigned booking (403) — no side effects', async () => {
    state.booking = { tenant_id: TENANT_A, team_member_id: null }
    const token = createToken(MEMBER_A, TENANT_A, 0, 'worker')
    const res = await POST(req(token))
    expect(res.status).toBe(403)
    expect(calls).toMatchObject({ adminSms: 0, clientSms: 0, notify: 0, bookingUpdates: 0 })
  })
})

// ── 3. Secondary-assignee visibility via booking_team_members ────────────────

describe('W4 15min-alert: booking_team_members grants visibility', () => {
  it('ALLOWS a worker who is a SECONDARY assignee (not primary) → 200, and the lookup is tenant-scoped', async () => {
    // Primary is someone else; the caller is only on the booking via the join table.
    state.booking = { tenant_id: TENANT_A, team_member_id: MEMBER_OTHER }
    state.extraMembers = [{ team_member_id: MEMBER_A }]
    const token = createToken(MEMBER_A, TENANT_A, 0, 'worker')
    const res = await POST(req(token))
    expect(res.status).toBe(200)
    expect(calls.adminSms).toBeGreaterThan(0)
    // The join-table lookup was scoped to the caller's tenant.
    expect(btmReads.length).toBeGreaterThan(0)
    for (const r of btmReads) expect(r.eqs.tenant_id).toBe(TENANT_A)
  })
})
