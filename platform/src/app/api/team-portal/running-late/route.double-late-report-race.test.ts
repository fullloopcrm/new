import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * POST /api/team-portal/running-late checked `booking.running_late_at`
 * against a plain SELECT snapshot to decide whether this was a fresh
 * lateness event, then wrote the new running_late_at with an UNCONDITIONAL
 * update (no WHERE on the prior value). Two near-simultaneous calls
 * (double-tap "Running Late" on a spotty connection, a client retry) both
 * read the same pre-alert null/stale running_late_at and both fall through
 * the cooldown check — both would notify admin and SMS the real client
 * twice for one lateness event. Fixed by claiming the write atomically
 * (`.or('running_late_at.is.null,running_late_at.lt.<cutoff>')` in the
 * WHERE) — only the winner notifies; the loser just refreshes the ETA and
 * reports alreadyReported, same shape as the checkin/checkout atomic claims.
 */

const TENANT = 'aaaaaaaa-0000-0000-0000-00000000000a'
const MEMBER_ID = 'member-1'
const BOOKING_ID = 'booking-1'

type Row = Record<string, unknown>
let booking: Row

function updateChain(getRow: () => Row, values: Row) {
  const filters: Array<(r: Row) => boolean> = []
  const orFilters: Array<(r: Row) => boolean> = []
  const uc: Record<string, unknown> = {
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return uc },
    or: (expr: string) => {
      const conds = expr.split(',').map((part) => {
        const [col, op, val] = part.split('.')
        return (r: Row) => {
          if (op === 'is' && val === 'null') return r[col] == null
          if (op === 'lt') return r[col] != null && String(r[col]) < val
          return false
        }
      })
      orFilters.push((r) => conds.some((c) => c(r)))
      return uc
    },
    select: () => uc,
    maybeSingle: async () => {
      const r = getRow()
      const matches = filters.every((f) => f(r)) && orFilters.every((f) => f(r))
      if (!matches) return { data: null, error: null }
      Object.assign(r, values)
      return { data: { ...r }, error: null }
    },
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => {
      const r = getRow()
      if (filters.every((f) => f(r)) && orFilters.every((f) => f(r))) Object.assign(r, values)
      resolve({ data: null, error: null })
    },
  }
  return uc
}

vi.mock('@/lib/supabase', () => {
  const from = (table: string) => {
    if (table === 'tenants') {
      return { select: () => ({ eq: () => ({ single: async () => ({ data: { name: 'T', owner_phone: '+15559990000', phone: null, telnyx_api_key: 'key', telnyx_phone: '+15550001111' } }) }) }) }
    }
    if (table !== 'bookings') throw new Error(`unexpected table ${table}`)
    return {
      update: (payload: Row) => updateChain(() => booking, payload),
    }
  }
  return { supabaseAdmin: { from } }
})

vi.mock('@/lib/tenant-db', () => ({
  tenantDb: (tenantId: string) => ({
    from: (table: string) => {
      if (table !== 'bookings') throw new Error(`unexpected table ${table}`)
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({ single: async () => ({ data: { ...booking } }) }),
          }),
        }),
        update: (payload: Row) => updateChain(() => booking, { ...payload, tenant_id: tenantId }),
      }
    },
  }),
}))

vi.mock('@/lib/team-portal-auth', () => ({
  requirePortalPermission: async () => ({ auth: { id: MEMBER_ID, tid: TENANT, role: 'worker' } }),
}))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: vi.fn(async () => ({ allowed: true, remaining: 4 })) }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => {}) }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/push', () => ({ sendPushToTenantAdmins: vi.fn(async () => {}), sendPushToClient: vi.fn(async () => {}) }))
vi.mock('@/lib/sms-templates', () => ({ smsRunningLateClient: () => 'client-sms', smsRunningLateAdmin: () => 'admin-sms' }))

import { POST } from './route'
import { sendSMS } from '@/lib/sms'

function req() {
  return new Request('http://localhost/api/team-portal/running-late', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ bookingId: BOOKING_ID, eta: 10 }),
  })
}

describe('POST /api/team-portal/running-late — double-report race', () => {
  beforeEach(() => {
    vi.mocked(sendSMS).mockClear()
    booking = {
      id: BOOKING_ID,
      tenant_id: TENANT,
      team_member_id: MEMBER_ID,
      start_time: '2026-01-06T14:00:00',
      client_id: 'client-1',
      running_late_at: null,
      running_late_eta: null,
      clients: { name: 'Client', phone: '+15551234567' },
      team_members: { name: 'Cleaner' },
    }
  })

  it('reports the first tap and sends SMS', async () => {
    const res = await POST(req())
    expect(res.status).toBe(200)
    expect(booking.running_late_at).not.toBeNull()
    expect(sendSMS).toHaveBeenCalledTimes(2) // admin + client
  })

  it('does not double-send SMS when two "running late" taps race for the same booking', async () => {
    const [r1, r2] = await Promise.all([POST(req()), POST(req())])
    expect(r1.status).toBe(200)
    expect(r2.status).toBe(200)
    const bodies = await Promise.all([r1.json(), r2.json()])
    const alreadyReportedCount = bodies.filter((b) => b.alreadyReported).length
    // Exactly one of the two racing requests should have won the claim and
    // notified; the other loses the race and reports alreadyReported.
    expect(alreadyReportedCount).toBe(1)
    expect(sendSMS).toHaveBeenCalledTimes(2) // admin + client, ONCE total, not 4x
    expect(booking.running_late_at).not.toBeNull()
    expect(booking.running_late_eta).toBe(10)
  })
})
