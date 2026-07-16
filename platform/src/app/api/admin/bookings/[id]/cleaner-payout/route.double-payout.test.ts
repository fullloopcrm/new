import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * POST /api/admin/bookings/[id]/cleaner-payout used to insert a
 * team_member_payouts row and set bookings.team_member_paid = true with no
 * check on the booking's current paid state — unlike every other place
 * money moves for a booking (payment-processor.ts, webhooks/stripe/route.ts),
 * which claim the flag atomically before paying. A double-submit, two admins
 * acting on the same booking concurrently, or a booking already auto-paid
 * via Stripe Connect could all get a second real payout recorded here with
 * zero warning. Fix claims team_member_paid the same way the other two
 * payout paths do and rejects with 409 if it's already true.
 */

vi.mock('@/lib/require-admin', () => ({
  requireAdmin: vi.fn(async () => null),
}))

const bookings: Record<string, { id: string; tenant_id: string; team_member_id: string; team_member_paid: boolean }> = {
  'bk-unpaid': { id: 'bk-unpaid', tenant_id: 'tenant-1', team_member_id: 'tm-1', team_member_paid: false },
  'bk-paid': { id: 'bk-paid', tenant_id: 'tenant-1', team_member_id: 'tm-1', team_member_paid: true },
}

let payoutInsertCalls: Array<Record<string, unknown>> = []
let claimAttempts: string[] = []

vi.mock('@/lib/supabase', () => {
  const from = (table: string) => {
    if (table === 'bookings') {
      return {
        select: () => ({
          eq: (_col: string, id: string) => ({
            single: async () => ({ data: bookings[id] || null }),
          }),
        }),
        update: (payload: Record<string, unknown>) => ({
          eq: (_col: string, id: string) => ({
            or: (_clause: string) => ({
              select: () => {
                claimAttempts.push(id)
                const booking = bookings[id]
                if (!booking) return Promise.resolve({ data: [] })
                if (payload.team_member_paid === true) {
                  if (booking.team_member_paid) return Promise.resolve({ data: [] }) // claim lost
                  booking.team_member_paid = true
                  return Promise.resolve({ data: [{ id }] })
                }
                if (payload.team_member_paid === false) {
                  booking.team_member_paid = false
                  return Promise.resolve({ data: [{ id }] })
                }
                return Promise.resolve({ data: [{ id }] })
              },
            }),
            // fallback for the release-path .then() call with no .or()/.select()
            then: (resolve: (v: { data: null; error: null }) => unknown) =>
              Promise.resolve({ data: null, error: null }).then(resolve),
          }),
        }),
      }
    }
    if (table === 'team_member_payouts') {
      return {
        insert: (payload: Record<string, unknown>) => {
          payoutInsertCalls.push(payload)
          return {
            select: () => ({
              single: async () => ({ data: { id: 'payout-1', ...payload }, error: null }),
            }),
          }
        },
      }
    }
    throw new Error(`unexpected table ${table}`)
  }
  return { supabaseAdmin: { from } }
})

import { POST } from './route'

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/admin/bookings/x/cleaner-payout', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('POST admin/bookings/[id]/cleaner-payout', () => {
  beforeEach(() => {
    payoutInsertCalls = []
    claimAttempts = []
    bookings['bk-unpaid'].team_member_paid = false
    bookings['bk-paid'].team_member_paid = true
  })

  it('records a payout and claims team_member_paid for an unpaid booking', async () => {
    const res = await POST(
      makeRequest({ cleaner_id: 'tm-1', amount_cents: 5000, method: 'zelle' }),
      { params: Promise.resolve({ id: 'bk-unpaid' }) },
    )
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
    expect(payoutInsertCalls).toHaveLength(1)
    expect(bookings['bk-unpaid'].team_member_paid).toBe(true)
  })

  it('rejects a second manual payout for a booking already marked paid', async () => {
    const res = await POST(
      makeRequest({ cleaner_id: 'tm-1', amount_cents: 5000, method: 'venmo' }),
      { params: Promise.resolve({ id: 'bk-paid' }) },
    )
    const json = await res.json()
    expect(res.status).toBe(409)
    expect(json.error).toMatch(/already marked paid/i)
    expect(payoutInsertCalls).toHaveLength(0)
  })

  it('does not insert a duplicate payout when two calls race for the same booking', async () => {
    const [r1, r2] = await Promise.all([
      POST(makeRequest({ cleaner_id: 'tm-1', amount_cents: 5000, method: 'zelle' }), {
        params: Promise.resolve({ id: 'bk-unpaid' }),
      }),
      POST(makeRequest({ cleaner_id: 'tm-1', amount_cents: 5000, method: 'zelle' }), {
        params: Promise.resolve({ id: 'bk-unpaid' }),
      }),
    ])
    const statuses = [r1.status, r2.status].sort()
    expect(statuses).toEqual([200, 409])
    expect(payoutInsertCalls).toHaveLength(1)
  })
})
