import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/team-portal/15min-alert checked `booking.fifteen_min_alert_time`
 * against a plain SELECT snapshot taken before all the hours/billing
 * computation, then wrote the new alert timestamp with an UNCONDITIONAL
 * update (no WHERE on the prior value). Two near-simultaneous calls (a field
 * cleaner double-tapping "30-min alert", or a client-side retry after a slow
 * response) both read the same pre-alert snapshot and both fall through —
 * both would send duplicate admin + client SMS, including a duplicate Stripe
 * pay link a client could act on twice. Fixed by claiming the write
 * atomically (`.or('fifteen_min_alert_time.is.null,fifteen_min_alert_time.lt.<cutoff>')`
 * in the WHERE) — only the winner notifies; the loser reports alreadySent
 * with zero side effects, same shape as the checkin/checkout atomic claims.
 */

const TENANT = 'aaaaaaaa-0000-0000-0000-000000000001'
const MEMBER_A = '11111111-0000-0000-0000-000000000001'

type Row = Record<string, unknown>
let booking: Row

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    let selectStr = ''
    const filters: Array<(r: Row) => boolean> = []
    const orFilters: Array<(r: Row) => boolean> = []
    let isUpdate = false
    const c: Record<string, unknown> = {
      select: (s = '') => { selectStr = s; return c },
      update: () => { isUpdate = true; return c },
      insert: () => c,
      eq: () => c,
      in: () => c,
      not: () => c,
      or: (expr: string) => {
        const conds = expr.split(',').map((part) => {
          const [col, op, val] = part.split('.')
          return (r: Row) => {
            if (op === 'is' && val === 'null') return r[col] == null
            if (op === 'lt') return r[col] != null && String(r[col]) < val
            return false
          }
        })
        orFilters.push((r) => conds.some((cond) => cond(r)))
        return c
      },
      order: () => c,
      limit: async () => ({ data: [], error: null }),
      maybeSingle: async () => {
        if (table === 'bookings' && isUpdate) {
          const matches = orFilters.every((f) => f(booking))
          if (!matches) return { data: null, error: null }
          booking.fifteen_min_alert_time = new Date().toISOString()
          return { data: { id: booking.id }, error: null }
        }
        return { data: null, error: null }
      },
      single: async () => {
        if (table === 'team_members' && selectStr.includes('status')) return { data: { status: 'active' }, error: null }
        if (table === 'tenants' && selectStr.includes('selena_config')) return { data: { selena_config: null }, error: null }
        if (table === 'tenants') return { data: { name: 'T', telnyx_api_key: 'k', telnyx_phone: '+15550001', payment_link: null }, error: null }
        if (table === 'bookings') return { data: { ...booking }, error: null }
        return { data: null, error: null }
      },
      then: (res: (v: { data: unknown[]; error: null }) => unknown) => res({ data: [], error: null }),
    }
    return c
  }
  return { supabaseAdmin: { from: (t: string) => chain(t), rpc: async () => ({ data: null, error: null }) } }
})

const smsCalls = { admin: 0, client: 0 }
vi.mock('@/lib/notify', () => ({ notify: async () => {} }))
vi.mock('@/lib/admin-contacts', () => ({ smsAdmins: async () => { smsCalls.admin++ } }))
vi.mock('@/lib/nycmaid/client-contacts', () => ({
  sendClientSMS: async () => { smsCalls.client++; return { sent: 1, skipped: 0 } },
}))

import { NextRequest } from 'next/server'
import { createToken } from '@/app/api/team-portal/auth/token'
import { POST } from './route'

function req(): NextRequest {
  return new NextRequest('https://x/api/team-portal/15min-alert', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${createToken(MEMBER_A, TENANT, 0, 'worker')}` },
    body: JSON.stringify({ bookingId: 'bk' }),
  })
}

beforeEach(() => {
  process.env.TEAM_PORTAL_SECRET = 'unit-test-team-portal-secret'
  smsCalls.admin = 0; smsCalls.client = 0
  booking = {
    id: 'bk', tenant_id: TENANT, team_member_id: MEMBER_A, client_id: 'c-1',
    start_time: '2026-08-01T10:00:00', check_in_time: '2026-08-01T10:00:00', check_out_time: null,
    service_type: 'regular', hourly_rate: 69, pay_rate: 25, price: 0,
    notes: null, max_hours: null, team_size: 1, payment_status: 'unpaid', fifteen_min_alert_time: null,
    clients: { name: 'Client One', phone: '+12125551234', email: null, address: null },
    team_members: { name: 'Worker', pay_rate: 25 },
  }
})

describe('POST /api/team-portal/15min-alert — double-alert race', () => {
  it('fires once on a single call', async () => {
    const res = await POST(req())
    expect(res.status).toBe(200)
    // Route sends two admin SMS per real alert (the heads-up, then a
    // delivery-confirmation line) plus one client SMS -- baseline for "one
    // real send", asserted so the race test below can prove it happens only
    // once total instead of twice.
    expect(smsCalls.admin).toBe(2)
    expect(smsCalls.client).toBe(1)
  })

  it('does not double-send SMS when two 30-min alert calls race for the same booking', async () => {
    const [r1, r2] = await Promise.all([POST(req()), POST(req())])
    expect(r1.status).toBe(200)
    expect(r2.status).toBe(200)
    const bodies = await Promise.all([r1.json(), r2.json()])
    const alreadySentCount = bodies.filter((b) => b.alreadySent).length
    expect(alreadySentCount).toBe(1)
    expect(smsCalls.admin).toBe(2) // one real send's worth, not 4
    expect(smsCalls.client).toBe(1) // not 2
  })
})
