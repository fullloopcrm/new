import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/team-portal/30min-alert — IDOR/unauthenticated-abuse regression.
 *
 * The route used to take `bookingId` straight from the body with ZERO auth —
 * anyone who knew (or guessed) a bookingId could trigger a real admin SMS +
 * a client payment-request SMS carrying the tenant's Stripe pay link, mutate
 * fifteen_min_alert_time, and even reach across tenants. The team dashboard
 * caller (src/app/team/page.tsx) already sends `Authorization: Bearer
 * ${auth.token}` — the route just never checked it. Fixed to mirror the
 * sibling checkin/checkout routes: verify the portal bearer token, then
 * confirm the booking belongs to the caller's own tenant AND is assigned to
 * the caller (not just any booking in the tenant).
 */

const h = vi.hoisted(() => ({
  bookings: [] as Array<Record<string, unknown>>,
  tenants: [] as Array<Record<string, unknown>>,
  teamMembers: [] as Array<Record<string, unknown>>,
  bookingUpdates: [] as Array<Record<string, unknown>>,
}))

vi.hoisted(() => {
  process.env.TEAM_PORTAL_SECRET = 'test-team-portal-secret'
})

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'bookings') {
        const chain = {
          select: () => chain,
          eq: () => chain,
          single: async () => ({ data: h.bookings[0] ?? null, error: null }),
          update: (payload: Record<string, unknown>) => {
            h.bookingUpdates.push(payload)
            return { eq: async () => ({ data: null, error: null }) }
          },
        }
        return chain
      }
      if (table === 'tenants') {
        const chain = {
          select: () => chain,
          eq: () => chain,
          single: async () => ({ data: h.tenants[0] ?? null, error: null }),
        }
        return chain
      }
      if (table === 'team_members') {
        const eqs: Record<string, unknown> = {}
        const chain = {
          select: () => chain,
          eq: (col: string, val: unknown) => { eqs[col] = val; return chain },
          single: async () => {
            const found = h.teamMembers.find((m) => Object.entries(eqs).every(([k, v]) => m[k] === v))
            return { data: found ?? null, error: null }
          },
        }
        return chain
      }
      const generic = {
        select: () => generic,
        eq: () => generic,
        insert: () => ({ then: (resolve: (v: unknown) => void) => resolve({ data: null, error: null }) }),
        single: async () => ({ data: null, error: null }),
      }
      return generic
    },
  },
}))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/admin-contacts', () => ({ smsAdmins: vi.fn(async () => {}) }))
vi.mock('@/lib/nycmaid/client-contacts', () => ({ sendClientSMS: vi.fn(async () => ({ sent: 0, skipped: 0 })) }))
vi.mock('@/lib/nycmaid/tenant', () => ({ isNycMaid: () => false }))

import { POST } from './route'
import { createToken } from '../auth/token'

const TENANT_A = 'tenant-A'
const TENANT_B = 'tenant-B'
const MEMBER_A = 'member-A'
const MEMBER_OTHER = 'member-other'
const BOOKING_ID = 'booking-1'

function req(body: unknown, token?: string): Request {
  return new Request('http://localhost/api/team-portal/30min-alert', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  h.bookings = [{ id: BOOKING_ID, tenant_id: TENANT_A, team_member_id: MEMBER_A, fifteen_min_alert_time: null, payment_status: 'unpaid' }]
  h.tenants = []
  h.teamMembers = [
    { id: MEMBER_A, tenant_id: TENANT_A, status: 'active' },
    { id: MEMBER_OTHER, tenant_id: TENANT_A, status: 'active' },
    { id: MEMBER_A, tenant_id: TENANT_B, status: 'active' },
  ]
  h.bookingUpdates = []
})

describe('POST /api/team-portal/30min-alert — auth gate', () => {
  it('rejects an unauthenticated request with 401, no mutation', async () => {
    const res = await POST(req({ bookingId: BOOKING_ID }) as never)
    expect(res.status).toBe(401)
    expect(h.bookingUpdates).toHaveLength(0)
  })

  it('rejects a forged/invalid token with 401', async () => {
    const res = await POST(req({ bookingId: BOOKING_ID }, 'garbage.token') as never)
    expect(res.status).toBe(401)
    expect(h.bookingUpdates).toHaveLength(0)
  })

  it('rejects a valid token for a DIFFERENT team member\'s booking with 403 (booking exists in-tenant, caller lacks visibility), no mutation', async () => {
    const token = createToken(MEMBER_OTHER, TENANT_A, 25, 'worker')
    const res = await POST(req({ bookingId: BOOKING_ID }, token) as never)
    expect(res.status).toBe(403)
    expect(h.bookingUpdates).toHaveLength(0)
  })

  it('rejects a valid token from a DIFFERENT tenant for the same booking id with 404, no mutation', async () => {
    const token = createToken(MEMBER_A, TENANT_B, 25, 'worker')
    const res = await POST(req({ bookingId: BOOKING_ID }, token) as never)
    expect(res.status).toBe(404)
    expect(h.bookingUpdates).toHaveLength(0)
  })

  it('lets the assigned team member past the auth/ownership gate (fails later for an unrelated reason: no tenant row in this fake)', async () => {
    const token = createToken(MEMBER_A, TENANT_A, 25, 'worker')
    const res = await POST(req({ bookingId: BOOKING_ID }, token) as never)
    // Not 401/404 — the gate passed; the fake has no tenant row so it fails at
    // the next step. Proves the fix doesn't false-positive-block the real owner.
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Tenant not found')
  })
})
