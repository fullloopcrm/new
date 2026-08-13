import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * Regression fixture: Kim Abramson / Sobeida Suero Perez, 2026-08-12 — the
 * booking that surfaced the stranded-tip bug. Base pay ($93.00) was already
 * auto-paid at checkout; a $207.00 Stripe payment (incl. $20.70 tip) landed
 * 18 minutes later. Real numbers, so a regression here is a regression on
 * the exact case that was reported broken.
 */

const h = vi.hoisted(() => ({ seq: 0, store: {} as Record<string, Array<Record<string, unknown>>> })) as unknown as FakeStoreHandle

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake }
})
vi.mock('@/lib/tenant-supabase', () => ({ tenantClient: async () => makeTenantDbFake(h) }))
vi.mock('@/lib/nycmaid/tenant', () => ({ isNycMaid: () => true }))

import { computeCleanerOutstanding } from './cleaner-outstanding'

beforeEach(() => {
  h.seq = 0
  h.store = {
    bookings: [{
      id: 'book-kim', tenant_id: 'nycmaid', hourly_rate: 69, pay_rate: null, team_size: 1,
      actual_hours: 3, check_in_time: '2026-08-12T12:01:44.997+00:00', check_out_time: '2026-08-12T15:02:00+00:00',
      team_member_pay: 9300, client_id: 'client-kim', team_member_id: 'tm-sobeida',
      clients: { address: '123 W 57th St, New York, NY' },
      team_members: { id: 'tm-sobeida', name: 'Sobeida Suero Perez', phone: null, pay_rate: 31, stripe_account_id: 'acct_1', global_payouts_recipient_id: null },
    }],
    booking_team_members: [
      { booking_id: 'book-kim', tenant_id: 'nycmaid', team_member_id: 'tm-sobeida', is_lead: true, position: 1, team_members: { id: 'tm-sobeida', name: 'Sobeida Suero Perez', phone: null, pay_rate: 31, stripe_account_id: 'acct_1', global_payouts_recipient_id: null } },
    ],
    payments: [
      { booking_id: 'book-kim', tenant_id: 'nycmaid', amount_cents: 20700, tip_cents: 2070 },
    ],
    team_member_payouts: [
      { booking_id: 'book-kim', tenant_id: 'nycmaid', team_member_id: 'tm-sobeida', amount_cents: 9300, source_ref: 'checkout_base:book-kim:tm-sobeida' },
    ],
  }
})

describe('computeCleanerOutstanding — Kim Abramson / Sobeida Suero Perez regression', () => {
  it('base pay already paid + a late tip leaves exactly $20.70 outstanding, not $0 and not the full $113.70', async () => {
    const [sobeida] = await computeCleanerOutstanding('nycmaid', 'book-kim')
    expect(sobeida.totalDueCents).toBe(11370) // $93.00 base + $20.70 tip
    expect(sobeida.totalPaidCents).toBe(9300) // only the checkout-time base payout
    expect(sobeida.outstandingCents).toBe(2070)
  })

  it('a fully-paid cleaner (base + tip both recorded) has zero outstanding', async () => {
    h.store.team_member_payouts.push({ booking_id: 'book-kim', tenant_id: 'nycmaid', team_member_id: 'tm-sobeida', amount_cents: 2070, source_ref: 'sweep:book-kim:tm-sobeida:2070' })
    const [sobeida] = await computeCleanerOutstanding('nycmaid', 'book-kim')
    expect(sobeida.outstandingCents).toBe(0)
  })

  it('a cleaner with no payout rows at all owes the full total, not a false zero', async () => {
    h.store.team_member_payouts = []
    const [sobeida] = await computeCleanerOutstanding('nycmaid', 'book-kim')
    expect(sobeida.outstandingCents).toBe(11370)
  })
})
