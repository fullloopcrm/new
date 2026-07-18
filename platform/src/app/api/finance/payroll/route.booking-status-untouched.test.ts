/**
 * POST /api/finance/payroll -- must not corrupt bookings.status.
 *
 * bookings.status='paid' means the CLIENT paid: it's set only by
 * /api/bookings/[id]/payment (payment_status==='paid') and the Stripe
 * webhook, and gates ar-aging (`.eq('status','completed')` + unpaid
 * payment_status), finance/summary (`.eq('status','completed')` for both
 * pending-client and pending-cleaner buckets), and BookingsAdmin's
 * close-out queue (`b.status === 'completed'`).
 *
 * This route previously ran, after every manual "Record Payment" payroll
 * call:
 *   bookings.update({status:'paid'}).eq('team_member_id', X).eq('status','completed')
 * against EVERY completed booking for that team member -- with no relation
 * to which bookings the payroll amount actually covered (period_start/
 * period_end were never applied to the query either). A booking whose
 * client had never paid (payment_status still 'pending') would flip to
 * status='paid' anyway, silently vanishing from ar-aging, finance/summary,
 * and the close-out queue -- hiding real uncollected client revenue the
 * moment an unrelated labor payment was recorded. It also never set
 * team_member_paid, so the one thing the comment claimed to do never
 * actually happened either.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeLedgerSupabaseFake } from '@/test/ledger-supabase-fake'

const TENANT_ID = 'tenant-A'
const TEAM_MEMBER_ID = 'tm-1'

const h = vi.hoisted(() => ({ seq: 0, store: {} as Record<string, Array<Record<string, unknown>>> }))

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: makeLedgerSupabaseFake(h), supabase: makeLedgerSupabaseFake(h) }))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT_ID }, error: null }),
}))
vi.mock('@/lib/finance/post-labor', () => ({ postPayrollToLedger: vi.fn(async () => ({ posted: true })) }))

import { POST } from './route'

function payrollReq(body: Record<string, unknown>) {
  return POST(new Request('http://t', { method: 'POST', body: JSON.stringify(body) }))
}

beforeEach(() => {
  h.seq = 0
  h.store = {
    payroll_payments: [],
    bookings: [
      {
        id: 'bk-unpaid', tenant_id: TENANT_ID, team_member_id: TEAM_MEMBER_ID,
        status: 'completed', payment_status: 'pending', team_member_paid: false,
      },
      {
        id: 'bk-paid', tenant_id: TENANT_ID, team_member_id: TEAM_MEMBER_ID,
        status: 'completed', payment_status: 'paid', team_member_paid: false,
      },
    ],
  }
})

describe('manual payroll payment does not corrupt bookings.status', () => {
  it('leaves an unpaid-by-client booking as status=completed, not status=paid', async () => {
    const res = await payrollReq({
      team_member_id: TEAM_MEMBER_ID, amount: 500, method: 'zelle',
      period_start: '2026-07-01', period_end: '2026-07-15',
    })
    expect(res.status).toBe(201)

    const unpaid = h.store.bookings.find(b => b.id === 'bk-unpaid')!
    expect(unpaid.status).toBe('completed')
    expect(unpaid.payment_status).toBe('pending')
  })

  it('does not set team_member_paid on any booking either -- no per-booking attribution exists for a lump-sum payment', async () => {
    const res = await payrollReq({
      team_member_id: TEAM_MEMBER_ID, amount: 500, method: 'zelle',
      period_start: '2026-07-01', period_end: '2026-07-15',
    })
    expect(res.status).toBe(201)

    for (const b of h.store.bookings) {
      expect(b.team_member_paid).toBe(false)
    }
  })

  it('leaves an already client-paid booking untouched too (status stays completed, not silently re-stamped)', async () => {
    await payrollReq({
      team_member_id: TEAM_MEMBER_ID, amount: 500, method: 'zelle',
      period_start: '2026-07-01', period_end: '2026-07-15',
    })
    const paid = h.store.bookings.find(b => b.id === 'bk-paid')!
    expect(paid.status).toBe('completed')
  })
})
