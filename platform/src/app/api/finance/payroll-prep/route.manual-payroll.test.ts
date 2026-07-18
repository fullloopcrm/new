/**
 * GET /api/finance/payroll-prep — manual "Record Payment" payroll was never
 * counted toward paid_out_cents.
 *
 * paid_out_cents only summed team_member_payouts (Stripe/auto contractor
 * payouts). POST /api/finance/payroll's manual payments (Zelle/cash/etc,
 * `payroll_payments` table) are a separate rail and were silently omitted --
 * balance_owed_cents (rendered on /dashboard/finance/reports' "Payroll / 1099"
 * tab as the "Balance owed" stat) permanently overstated what was actually
 * still owed by the full amount of every manual payment ever recorded, for
 * any tenant using that rail. Real risk: an admin re-paying a contractor
 * who'd already been paid manually, going only by that number.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeSupabaseFake, type FakeStoreHandle } from '@/test/supabase-fake'

const TENANT_ID = 'tenant-A'

const h = vi.hoisted(() => ({ seq: 0, store: {} as Record<string, Array<Record<string, unknown>>> }))

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: makeSupabaseFake(h as FakeStoreHandle) }))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT_ID }, error: null }),
}))

import { GET } from './route'

function prepReq(qs: string) {
  return GET(new Request(`http://t/api/finance/payroll-prep?${qs}`))
}

beforeEach(() => {
  h.seq = 0
  h.store = {
    team_members: [
      { id: 'tm-1', tenant_id: TENANT_ID, name: 'Alex', active: true },
    ],
    bookings: [
      {
        id: 'b-1', tenant_id: TENANT_ID, team_member_id: 'tm-1', status: 'completed',
        team_member_pay: 100000, actual_hours: 10, start_time: '2026-07-05T12:00:00Z',
      },
    ],
    team_member_payouts: [],
    payroll_payments: [],
  }
})

describe('paid_out_cents includes manual payroll_payments, not just team_member_payouts', () => {
  it('subtracts a paid manual payroll payment from balance_owed_cents', async () => {
    h.store.payroll_payments.push({
      id: 'pr-1', tenant_id: TENANT_ID, team_member_id: 'tm-1',
      amount: 40000, status: 'paid', created_at: '2026-07-10T00:00:00Z',
    })

    const res = await prepReq('from=2026-07-01&to=2026-07-31')
    const json = await res.json()
    const row = json.rows.find((r: { team_member_id: string }) => r.team_member_id === 'tm-1')

    expect(row.gross_pay_cents).toBe(100000)
    expect(row.paid_out_cents).toBe(40000)
    expect(row.balance_owed_cents).toBe(60000)
  })

  it('combines manual payroll_payments with Stripe/auto team_member_payouts for the same member', async () => {
    h.store.payroll_payments.push({
      id: 'pr-1', tenant_id: TENANT_ID, team_member_id: 'tm-1',
      amount: 30000, status: 'paid', created_at: '2026-07-10T00:00:00Z',
    })
    h.store.team_member_payouts.push({
      id: 'po-1', tenant_id: TENANT_ID, team_member_id: 'tm-1',
      amount_cents: 20000, status: 'paid', created_at: '2026-07-12T00:00:00Z',
    })

    const res = await prepReq('from=2026-07-01&to=2026-07-31')
    const json = await res.json()
    const row = json.rows.find((r: { team_member_id: string }) => r.team_member_id === 'tm-1')

    expect(row.paid_out_cents).toBe(50000)
    expect(row.balance_owed_cents).toBe(50000)
    expect(json.totals.total_paid_out_cents).toBe(50000)
  })

  it('does NOT count a still-pending manual payroll row as paid', async () => {
    h.store.payroll_payments.push({
      id: 'pr-pending', tenant_id: TENANT_ID, team_member_id: 'tm-1',
      amount: 40000, status: 'pending', created_at: '2026-07-10T00:00:00Z',
    })

    const res = await prepReq('from=2026-07-01&to=2026-07-31')
    const json = await res.json()
    const row = json.rows.find((r: { team_member_id: string }) => r.team_member_id === 'tm-1')

    expect(row.paid_out_cents).toBe(0)
    expect(row.balance_owed_cents).toBe(100000)
  })

  it('never counts another tenant\'s manual payroll payments', async () => {
    h.store.payroll_payments.push({
      id: 'pr-other', tenant_id: 'tenant-B', team_member_id: 'tm-1',
      amount: 40000, status: 'paid', created_at: '2026-07-10T00:00:00Z',
    })

    const res = await prepReq('from=2026-07-01&to=2026-07-31')
    const json = await res.json()
    const row = json.rows.find((r: { team_member_id: string }) => r.team_member_id === 'tm-1')

    expect(row.paid_out_cents).toBe(0)
  })
})
