import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * POST /api/admin/payments/confirm-match read `unmatched_payments.status`,
 * checked it against 'matched' in plain JS, then unconditionally wrote
 * status:'matched' + inserted a `payments` row + marked the booking paid.
 * Two near-simultaneous calls on the same unmatched Zelle/Venmo payment
 * (double-click "Confirm match", or two admins working the same
 * reconciliation queue) both read 'pending' before either write landed and
 * both inserted a payments row / marked the booking paid — double-recording
 * real money received. Fixed by claiming the pending -> matched transition
 * atomically (`neq('status','matched')` in the WHERE clause) before any side
 * effect — only the winner records the payment; the loser gets a clean 409.
 * A missing target booking releases the claim back to 'pending' so a retry
 * against the correct booking still works.
 */

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: 'tenant-1' }, error: null })),
}))
vi.mock('@/lib/tenant-query', () => ({
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => ({ ok: true })) }))

const unmatched: Record<string, unknown> = {
  id: 'u1',
  tenant_id: 'tenant-1',
  method: 'zelle',
  amount_cents: 10000,
  sender_name: 'Jane',
  status: 'pending',
  matched_booking_id: null,
  matched_at: null,
  raw_email_id: null,
}
const booking: Record<string, unknown> = {
  id: 'b1',
  tenant_id: 'tenant-1',
  client_id: 'c1',
  team_member_id: null,
  hourly_rate: null,
  actual_hours: null,
  price: 10000,
  clients: { name: 'Jane', phone: null },
  team_members: null,
  payment_status: undefined,
}
let paymentInserts = 0
let notificationInserts = 0

vi.mock('@/lib/supabase', () => {
  const from = (table: string) => {
    if (table === 'unmatched_payments') {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: async () => ({ data: { ...unmatched } }),
            }),
          }),
        }),
        update: (payload: Record<string, unknown>) => {
          const eqs: Record<string, unknown> = {}
          let neqStatus: unknown
          const chain = {
            eq: (col: string, val: unknown) => { eqs[col] = val; return chain },
            neq: (col: string, val: unknown) => { if (col === 'status') neqStatus = val; return chain },
            select: () => ({
              maybeSingle: async () => {
                const matches = unmatched.id === eqs.id
                  && (eqs.tenant_id === undefined || unmatched.tenant_id === eqs.tenant_id)
                  && (neqStatus === undefined || unmatched.status !== neqStatus)
                if (!matches) return { data: null, error: null }
                Object.assign(unmatched, payload)
                return { data: { id: unmatched.id }, error: null }
              },
            }),
            then: (resolve: (v: { data: null; error: null }) => void) => {
              Object.assign(unmatched, payload)
              resolve({ data: null, error: null })
            },
          }
          return chain
        },
      }
    }
    if (table === 'bookings') {
      return {
        select: () => {
          const eqs: Record<string, unknown> = {}
          const sel = {
            eq: (col: string, val: unknown) => { eqs[col] = val; return sel },
            single: async () => {
              const matches = booking.id === eqs.id && (eqs.tenant_id === undefined || booking.tenant_id === eqs.tenant_id)
              return { data: matches ? { ...booking } : null }
            },
          }
          return sel
        },
        update: (payload: Record<string, unknown>) => ({
          eq: () => ({
            eq: () => ({
              then: (resolve: (v: { data: null; error: null }) => void) => {
                Object.assign(booking, payload)
                resolve({ data: null, error: null })
              },
            }),
          }),
        }),
      }
    }
    if (table === 'payments') {
      return { insert: async (payload: Record<string, unknown>) => { paymentInserts++; return { data: payload, error: null } } }
    }
    if (table === 'tenants') {
      return { select: () => ({ eq: () => ({ single: async () => ({ data: { name: 'Acme', telnyx_api_key: null, telnyx_phone: null } }) }) }) }
    }
    if (table === 'notifications') {
      return { insert: async () => { notificationInserts++; return { data: null, error: null } } }
    }
    throw new Error(`unexpected table ${table}`)
  }
  return { supabaseAdmin: { from } }
})

import { POST } from './route'

function req(body: Record<string, unknown>) {
  return new Request('http://localhost/api/admin/payments/confirm-match', { method: 'POST', body: JSON.stringify(body) })
}

describe('POST /api/admin/payments/confirm-match — double-match race', () => {
  beforeEach(() => {
    unmatched.status = 'pending'
    unmatched.matched_booking_id = null
    unmatched.matched_at = null
    booking.payment_status = undefined
    paymentInserts = 0
    notificationInserts = 0
  })

  it('matches once and marks the unmatched payment matched', async () => {
    const res = await POST(req({ unmatchedPaymentId: 'u1', bookingId: 'b1' }))
    expect(res.status).toBe(200)
    expect(unmatched.status).toBe('matched')
    expect(booking.payment_status).toBe('paid')
    expect(paymentInserts).toBe(1)
  })

  it('does not double-record when two confirm-match calls race for the same unmatched payment', async () => {
    const [r1, r2] = await Promise.all([
      POST(req({ unmatchedPaymentId: 'u1', bookingId: 'b1' })),
      POST(req({ unmatchedPaymentId: 'u1', bookingId: 'b1' })),
    ])
    const statuses = [r1.status, r2.status].sort()
    expect(statuses).toEqual([200, 409])
    expect(paymentInserts).toBe(1)
    expect(notificationInserts).toBe(1)
  })

  it('releases the claim when the target booking is missing, allowing a retry', async () => {
    const res = await POST(req({ unmatchedPaymentId: 'u1', bookingId: 'missing' }))
    expect(res.status).toBe(404)
    expect(unmatched.status).toBe('pending')
    expect(paymentInserts).toBe(0)
  })

  it('409s outright when already matched before the request even starts', async () => {
    unmatched.status = 'matched'
    const res = await POST(req({ unmatchedPaymentId: 'u1', bookingId: 'b1' }))
    expect(res.status).toBe(409)
    expect(paymentInserts).toBe(0)
  })
})
