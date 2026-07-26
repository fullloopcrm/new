import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Real pricing bug (2026-07-22): the mobile "Check Out" button (team/page.tsx
 * -> this route) computed billed/paid hours straight from clientBilledHours()/
 * cleanerPaidHours(), with no applyTeamMinimum() — unlike the desktop admin
 * check-out flow (BookingsAdmin.tsx), which floors a 2+ cleaner team at 4
 * hours even if the job finishes early (billing-hours.ts). A multi-cleaner
 * job checked out from the mobile app before this fix would underbill the
 * client and underpay the crew for any job under 4 hours.
 *
 * actual_hours (the stored "how long did it really take" record) must stay
 * the TRUE elapsed/capped time — only the price/pay math gets the team-
 * minimum floor, same split BookingsAdmin.tsx uses (actualHours vs
 * billableHours).
 */

let verifyResult: { id: string; tid: string; role: string } | null
let bookingRow: Record<string, unknown> | null
let serviceRow: Record<string, unknown> | null
let updatedRow: Record<string, unknown>
let updateError: { message: string } | null
let lastUpdatePayload: Record<string, unknown> | null

function builder(table: string) {
  let didUpdate = false
  const chain = {
    select: () => chain,
    update: (payload: Record<string, unknown>) => {
      didUpdate = true
      if (table === 'bookings') lastUpdatePayload = payload
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
  lastUpdatePayload = null
})

describe('team-portal checkout — team-size minimum (4hr floor for 2+ cleaners)', () => {
  it('a 2-cleaner job that finishes in 2h is billed and paid for the 4h floor, not the actual 2h', async () => {
    // 120 min elapsed → 2.0 billed half-hours, but team_size 2 floors to 4h.
    bookingRow = baseBooking({ team_size: 2, check_in_time: checkedInMinutesAgo(120) })
    const res = await POST(req({ booking_id: 'b-1' }))
    const body = await res.json()

    expect(res.status).toBe(200)
    // Client: 4h × $69 × crew 2 = $552 (was $276 = 4h × $69 × 2... wait crew multiplies too)
    // billableClientForPrice(4) * clientRate(69) * teamSize(2) = 4*69*2 = 552
    expect(body.client_total).toBe(552)
    // Cleaner pay: 4h × $25 = $100 (was $50 for the raw 2h before this fix)
    expect(body.earnings).toBe(100)
  })

  it('a single-cleaner job is NOT floored — no minimum applies below team_size 2', async () => {
    bookingRow = baseBooking({ team_size: 1, check_in_time: checkedInMinutesAgo(120) })
    const res = await POST(req({ booking_id: 'b-1' }))
    const body = await res.json()
    expect(body.client_total).toBe(138) // 2h × $69 × 1, unchanged from the existing test
    expect(body.earnings).toBe(50)
  })

  it('a 2-cleaner job that runs LONGER than 4h is billed/paid for actual time — the floor never reduces pay', async () => {
    bookingRow = baseBooking({ team_size: 2, check_in_time: checkedInMinutesAgo(360) }) // 6h
    const res = await POST(req({ booking_id: 'b-1' }))
    const body = await res.json()
    expect(body.billed_hours).toBe(6)
    expect(body.client_total).toBe(828) // 6 × $69 × 2
    expect(body.earnings).toBe(150) // 6 × $25
  })

  it('actual_hours stored on the booking stays the TRUE elapsed time, not the team-minimum-floored value', async () => {
    bookingRow = baseBooking({ team_size: 2, check_in_time: checkedInMinutesAgo(120) })
    await POST(req({ booking_id: 'b-1' }))
    expect(lastUpdatePayload?.actual_hours).toBe(2) // true elapsed, not floored to 4
  })

  it('the team minimum still stacks correctly with discount_percent and one_time_credit_cents', async () => {
    bookingRow = baseBooking({
      team_size: 2,
      check_in_time: checkedInMinutesAgo(120),
      discount_percent: 10,
      one_time_credit_cents: 500,
    })
    const res = await POST(req({ booking_id: 'b-1' }))
    const body = await res.json()
    // 4h × $69 × 2 = $552 = 55200¢ -> -10% = 49680¢ -> applyDiscount rounds
    // DOWN to nearest $5 = 49500¢ ($495) -> -$5 credit = 49000¢ = $490
    expect(body.client_total).toBe(490)
  })
})
