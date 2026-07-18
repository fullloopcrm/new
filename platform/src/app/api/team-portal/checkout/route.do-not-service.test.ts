import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * NYC Maid checkout parity pushes the client a "Cleaning complete!"
 * notification with no do_not_service check -- do_not_service is documented
 * as a channel-agnostic kill-switch in notify.ts (an email/SMS-consent-gated
 * client still got this push). Isolated from route.test.ts because it needs
 * isNycMaid() -> true to enter the parity block at all.
 */

let bookingRow: Record<string, unknown> | null
let serviceRow: Record<string, unknown> | null
let updatedRow: Record<string, unknown>

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
      if (table === 'bookings' && didUpdate) return { data: updatedRow, error: null }
      if (table === 'bookings') return { data: bookingRow, error: null }
      if (table === 'service_types') return { data: serviceRow, error: null }
      return { data: null, error: null }
    },
    maybeSingle: async () => {
      if (table === 'bookings' && didUpdate) return { data: updatedRow, error: null }
      return { data: null, error: null }
    },
  }
  return chain
}

const { sendPushToClient } = vi.hoisted(() => ({ sendPushToClient: vi.fn(() => Promise.resolve()) }))

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => builder(t) } }))
vi.mock('../auth/token', () => ({ verifyToken: () => ({ id: 'm-1', tid: 't-1', role: 'worker' }) }))
vi.mock('@/lib/nycmaid/tenant', () => ({ isNycMaid: () => true, NYCMAID_TENANT_ID: 't-1' }))
vi.mock('@/lib/payment-processor', () => ({ processPayment: vi.fn() }))
vi.mock('@/lib/push', () => ({ sendPushToClient }))
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
  status: 'in_progress',
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
  clients: { name: 'Al', address: null, do_not_service: false },
  team_members: { pay_rate: 25 },
  ...over,
})

beforeEach(() => {
  sendPushToClient.mockClear()
  bookingRow = baseBooking()
  serviceRow = { pricing_model: 'hourly', price_cents: null, min_charge_cents: null }
  updatedRow = { id: 'b-1', client_id: 'c-1', payment_status: 'paid', notes: null }
})

describe('team-portal checkout — do_not_service gate on the NYC Maid "complete" push', () => {
  it('does not push a client flagged do_not_service', async () => {
    bookingRow = baseBooking({ clients: { name: 'Al', address: null, do_not_service: true } })
    const res = await POST(req({ booking_id: 'b-1' }))
    expect(res.status).toBe(200)
    expect(sendPushToClient).not.toHaveBeenCalled()
  })

  it('pushes an eligible client', async () => {
    const res = await POST(req({ booking_id: 'b-1' }))
    expect(res.status).toBe(200)
    expect(sendPushToClient).toHaveBeenCalledTimes(1)
  })
})
