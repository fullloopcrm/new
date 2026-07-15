import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Team-portal checkout is where the client's bill is (re)computed at the moment
 * the cleaner checks out. The load-bearing, previously-untested decision logic:
 *
 *   - HOURLY services recompute price from elapsed time × rate × crew
 *   - FLAT / per-unit services keep the price fixed at booking time — elapsed
 *     time must NOT rewrite it (a regression here over/undercharges every job)
 *   - a client max_hours cap clamps billable hours
 *   - a service min_charge_cents floors the final price
 *   - the booking fetch is tenant- AND team-member-scoped (no cross-account
 *     checkout)
 *
 * Pure math helpers (billing-hours, cleaner-pay) stay REAL; only I/O and the
 * NYC-Maid side-effects are mocked. isNycMaid → false keeps this on the generic
 * tenant path so the parity block (payments/push/SMS/geo) is never entered.
 */

let verifyResult: { id: string; tid: string; role: string } | null
let bookingRow: Record<string, unknown> | null
let serviceRow: Record<string, unknown> | null
let updatedRow: Record<string, unknown>
let updateError: { message: string } | null

function builder(table: string) {
  let didUpdate = false
  const chain = {
    select: () => chain,
    update: () => {
      didUpdate = true
      return chain
    },
    insert: async () => ({ error: null }),
    eq: () => chain,
    single: async () => {
      if (table === 'bookings' && didUpdate) return { data: updatedRow, error: updateError }
      if (table === 'bookings') return { data: bookingRow, error: null }
      if (table === 'service_types') return { data: serviceRow, error: null }
      return { data: null, error: null }
    },
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => builder(t) } }))
vi.mock('../auth/token', () => ({ verifyToken: () => verifyResult }))
vi.mock('@/lib/nycmaid/tenant', () => ({ isNycMaid: () => false, NYCMAID_TENANT_ID: 'nm' }))
vi.mock('@/lib/payment-processor', () => ({ processPayment: vi.fn() }))
vi.mock('@/lib/push', () => ({ sendPushToClient: vi.fn() }))
vi.mock('@/lib/nycmaid/admin-contacts', () => ({ smsAdmins: vi.fn() }))

import { POST } from './route'

const MIN = 60 * 1000

function req(body: Record<string, unknown>) {
  return new Request('http://localhost/api/team-portal/checkout', {
    method: 'POST',
    headers: { authorization: 'Bearer tok', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function checkedInMinutesAgo(mins: number): string {
  return new Date(Date.now() - mins * MIN).toISOString()
}

const baseBooking = (over: Record<string, unknown> = {}) => ({
  id: 'b-1',
  team_member_id: 'm-1',
  check_in_time: checkedInMinutesAgo(120),
  hourly_rate: 69,
  pay_rate: 25,
  team_size: 1,
  max_hours: null,
  price: 0,
  service_type_id: 'svc-1',
  referrer_id: null,
  client_id: 'c-1',
  clients: { name: 'Al', address: null },
  team_members: { pay_rate: 25 },
  ...over,
})

beforeEach(() => {
  verifyResult = { id: 'm-1', tid: 't-1', role: 'worker' }
  bookingRow = baseBooking()
  serviceRow = { pricing_model: 'hourly', price_cents: null, min_charge_cents: null }
  updatedRow = { id: 'b-1', client_id: null, payment_status: 'paid', notes: null }
  updateError = null
})

describe('team-portal checkout — pricing model branch', () => {
  it('HOURLY: recomputes the client bill from elapsed hours × rate × crew', async () => {
    // 120 min → 2.0 billed half-hours × $69 × crew 1 = $138.
    const res = await POST(req({ booking_id: 'b-1' }))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.client_total).toBe(138)
    expect(body.billed_hours).toBe(2)
    // cleaner paid 2.0h × $25 = $50
    expect(body.earnings).toBe(50)
  })

  it('FLAT: keeps the fixed price — elapsed time does NOT rewrite it', async () => {
    bookingRow = baseBooking({ price: 20000 }) // $200 fixed at booking time
    serviceRow = { pricing_model: 'flat', price_cents: 20000, min_charge_cents: null }
    const res = await POST(req({ booking_id: 'b-1' }))
    const body = await res.json()
    // 2h elapsed would be $138 if (wrongly) recomputed; flat must stay $200.
    expect(body.client_total).toBe(200)
  })

  it('HOURLY: honors a client max_hours cap on billable hours', async () => {
    // 300 min → 5.0 billed half-hours, but max_hours 3 clamps to 3.0h.
    bookingRow = baseBooking({ check_in_time: checkedInMinutesAgo(300), max_hours: 3 })
    const res = await POST(req({ booking_id: 'b-1' }))
    const body = await res.json()
    expect(body.billed_hours).toBe(3)
    expect(body.client_total).toBe(207) // 3 × $69, not 5 × $69 = $345
  })

  it('FLAT: floors the price at the service min_charge_cents', async () => {
    bookingRow = baseBooking({ price: 5000 }) // $50
    serviceRow = { pricing_model: 'flat', price_cents: 5000, min_charge_cents: 10000 } // $100 floor
    const res = await POST(req({ booking_id: 'b-1' }))
    const body = await res.json()
    expect(body.client_total).toBe(100)
  })
})

describe('team-portal checkout — authorization guards', () => {
  it('401s when no bearer token is present', async () => {
    const bare = new Request('http://localhost/api/team-portal/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ booking_id: 'b-1' }),
    })
    const res = await POST(bare)
    expect(res.status).toBe(401)
  })

  it('401s when the token is invalid', async () => {
    verifyResult = null
    const res = await POST(req({ booking_id: 'b-1' }))
    expect(res.status).toBe(401)
  })

  it('400s when booking_id is missing', async () => {
    const res = await POST(req({}))
    expect(res.status).toBe(400)
  })

  it('404s when the booking belongs to a different team member (no cross-account checkout)', async () => {
    bookingRow = baseBooking({ team_member_id: 'someone-else' })
    const res = await POST(req({ booking_id: 'b-1' }))
    expect(res.status).toBe(404)
  })

  it('404s when the tenant-scoped booking fetch misses (wrong tenant)', async () => {
    bookingRow = null // scoped fetch found nothing for this tenant
    const res = await POST(req({ booking_id: 'b-1' }))
    expect(res.status).toBe(404)
  })

  it('400s on replay: a booking that already has check_out_time cannot be checked out again (no pay/price re-inflation)', async () => {
    bookingRow = baseBooking({ check_out_time: checkedInMinutesAgo(5) })
    const res = await POST(req({ booking_id: 'b-1' }))
    expect(res.status).toBe(400)
  })
})
