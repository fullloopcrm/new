/**
 * payment-processor.ts `processPayment` — the NYC Maid location-based cleaner
 * pay-rate FLOOR wiring (P1/W1 money-path-coverage, queue item b).
 *
 * payment-processor.ts:224-226:
 *   let rate = teamMember.pay_rate || teamMember.hourly_rate || booking.pay_rate || 25
 *   if (isNycMaid(tenantId)) rate = effectiveCleanerRate(rate, clientJoin?.address ?? null)
 *
 * effectiveCleanerRate() itself has its own unit test (cleaner-pay.test.ts), but
 * NOTHING exercises this through the real processPayment call site. Two gates
 * have to both be right or a cleaner gets mispaid:
 *   1. The floor must apply ONLY for the NYC Maid tenant (isNycMaid(tenantId)) —
 *      not any tenant whose client happens to have a premium-zone address.
 *   2. The floor reads the CLIENT's (job) address, not the team member's own
 *      address — a wrong join here silently mis-rates every payout.
 * It is also short-circuited entirely when `booking.team_member_pay` is set
 * (that branch never reaches the rate computation at all) — worth pinning so
 * a future refactor doesn't accidentally make the floor override an explicit
 * manual payout amount.
 *
 * Every existing processPayment test uses the non-NYC-Maid `tenant-pp` fixture
 * with a null client address (payment-processor-payout.test.ts says so
 * explicitly: "non-nycmaid tenant, so the location rate floor never applies").
 * This file is the first to exercise the gate at all.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeLedgerSupabaseFake } from '@/test/ledger-supabase-fake'
import { tenant as baseTenant, seedBooking } from '@/test/payment-processor-fixtures'
import { NYCMAID_TENANT_ID } from '@/lib/nycmaid/tenant'
import { REGION_PREMIUM_RATE } from '@/lib/cleaner-pay'

const h = vi.hoisted(() => ({ seq: 0, store: {} as Record<string, Array<Record<string, unknown>>> }))

const stripeCalls = vi.hoisted(() => ({
  transfers: vi.fn((args: Record<string, unknown>) => Promise.resolve({ id: 'tr_1', ...args })),
  payouts: vi.fn(() => Promise.resolve({ id: 'po_1' })),
}))

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: makeLedgerSupabaseFake(h), supabase: makeLedgerSupabaseFake(h) }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(() => Promise.resolve()) }))
vi.mock('@/lib/admin-contacts', () => ({ smsAdmins: vi.fn(() => Promise.resolve()) }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(() => Promise.resolve()) }))
vi.mock('@/lib/finance/post-revenue', () => ({ postPaymentRevenue: vi.fn(() => Promise.resolve()) }))
vi.mock('@/lib/finance/post-labor', () => ({ postPayoutToLedger: vi.fn(() => Promise.resolve()) }))
vi.mock('stripe', () => ({
  default: class {
    transfers = { create: stripeCalls.transfers }
    payouts = { create: stripeCalls.payouts }
  },
}))

import { processPayment } from './payment-processor'

const nycMaidTenant = { ...baseTenant, id: NYCMAID_TENANT_ID }

function payAs(tenantObj: { id: string } & Record<string, unknown>, bookingId: string, amountCents: number) {
  return processPayment({
    tenant: tenantObj, bookingId, clientId: 'client-1', method: 'zelle', amountCents, referenceId: `ref-${bookingId}`,
  })
}

beforeEach(() => {
  h.seq = 0
  h.store = { bookings: [], payments: [], team_member_payouts: [], clients: [] }
  stripeCalls.transfers.mockClear()
  stripeCalls.payouts.mockClear()
  process.env.STRIPE_SECRET_KEY = 'sk_test_x'
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('processPayment — NYC Maid location-based cleaner pay-rate floor', () => {
  it('NYC Maid tenant + premium-zone client address: floors a below-floor rate to $35/hr', async () => {
    seedBooking(h, 'bk1', {
      actual_hours: 2, hourly_rate: 100, team_member_pay: null,
      tenantId: NYCMAID_TENANT_ID, clientAddress: 'Hoboken, NJ',
      tm: { stripe_account_id: 'acct_1', pay_rate: 28 },
    })
    const r = await payAs(nycMaidTenant, 'bk1', 20000)
    expect(r?.status).toBe('paid')
    // 2h × $35 floor = $70, NOT 2h × $28 = $56.
    expect(r?.cleanerPaidCents).toBe(2 * REGION_PREMIUM_RATE * 100)
    expect(stripeCalls.transfers.mock.calls[0][0]).toMatchObject({ amount: 7000 })
  })

  it('NYC Maid tenant + NON-premium client address: uses the base rate, no floor applied', async () => {
    seedBooking(h, 'bk2', {
      actual_hours: 2, hourly_rate: 100, team_member_pay: null,
      tenantId: NYCMAID_TENANT_ID, clientAddress: '200 W 57th St, New York, NY 10019',
      tm: { stripe_account_id: 'acct_1', pay_rate: 28 },
    })
    const r = await payAs(nycMaidTenant, 'bk2', 20000)
    // 2h × $28 = $56, floor never triggers outside a premium zone.
    expect(r?.cleanerPaidCents).toBe(5600)
  })

  it('NON-NYC-Maid tenant + the SAME premium-zone address: floor does NOT apply (tenant-gated, not address-gated)', async () => {
    seedBooking(h, 'bk3', {
      actual_hours: 2, hourly_rate: 100, team_member_pay: null,
      tenantId: 'tenant-pp', clientAddress: 'Hoboken, NJ',
      tm: { stripe_account_id: 'acct_1', pay_rate: 28 },
    })
    const r = await payAs(baseTenant, 'bk3', 20000)
    // Same address that floored to $35 for NYC Maid stays at the base $28 here.
    expect(r?.cleanerPaidCents).toBe(5600)
  })

  it('booking.team_member_pay short-circuits the floor entirely, even for NYC Maid in a premium zone', async () => {
    seedBooking(h, 'bk4', {
      price: 10000, team_member_pay: 5000,
      tenantId: NYCMAID_TENANT_ID, clientAddress: 'Hoboken, NJ',
      tm: { stripe_account_id: 'acct_1', pay_rate: 28 },
    })
    const r = await payAs(nycMaidTenant, 'bk4', 10000)
    // The explicit $50 manual payout wins outright — the rate/floor computation
    // is never reached.
    expect(r?.cleanerPaidCents).toBe(5000)
  })
})
