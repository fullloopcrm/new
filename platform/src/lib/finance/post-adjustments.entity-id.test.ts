/**
 * MISSING entity_id ON post-adjustments.ts's postJournalEntry CALL SITES.
 *
 * Same class of gap already fixed in post-revenue.ts and the bank-transactions
 * routes: lib/finance/ledger-reports.ts's ledgerProfitAndLoss/BalanceSheet/
 * TrialBalance (the default source for /api/finance/pnl, balance-sheet, and
 * trial-balance) filter journal_lines by journal_entries.entity_id when a
 * specific entity is selected. postRefundToLedger, postChargebackToLedger,
 * postCommissionAccrual, and postCommissionPayment never read or forwarded
 * entity_id, so every refund, chargeback, and referral commission for a
 * multi-entity tenant silently posted to the tenant's default entity.
 *
 * Resolution differs by call site (no single shared column to read):
 *  - refund/chargeback: tenantFromPaymentIntent() now also resolves entityId
 *    from the linked payment's booking (falling back to its invoice), and
 *    the two webhook handlers pass it through.
 *  - commission accrual/payment: referral_commissions.booking_id is NOT NULL
 *    (migration 019), so entity_id is resolved directly from that booking.
 *
 * postDepositToLedger (quote-based deposits) is NOT covered here — quotes
 * carry no entity signal until they convert to a booking, which happens
 * AFTER the deposit is posted in the webhook flow. Left open, same as
 * post-labor.ts, pending a design decision.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase, Row } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

const TENANT_ID = 'tenant-1'
const ENTITY_ID = 'entity-secondary'

const postedEntries: Array<Record<string, unknown>> = []
vi.mock('@/lib/ledger', async (orig) => {
  const actual = await orig<typeof import('@/lib/ledger')>()
  return {
    ...actual,
    postJournalEntry: vi.fn(async (args: Record<string, unknown>) => {
      postedEntries.push(args)
      return `entry-${postedEntries.length}`
    }),
  }
})

import { supabaseAdmin } from '@/lib/supabase'
import {
  postRefundToLedger,
  postChargebackToLedger,
  postCommissionAccrual,
  postCommissionPayment,
  tenantFromPaymentIntent,
} from './post-adjustments'

const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  postedEntries.length = 0
  fake._store.clear()
  fake._seed('chart_of_accounts', [
    { id: 'coa-4000', tenant_id: TENANT_ID, code: '4000' } as Row,
    { id: 'coa-1050', tenant_id: TENANT_ID, code: '1050' } as Row,
    { id: 'coa-6110', tenant_id: TENANT_ID, code: '6110' } as Row,
    { id: 'coa-6045', tenant_id: TENANT_ID, code: '6045' } as Row,
    { id: 'coa-2400', tenant_id: TENANT_ID, code: '2400' } as Row,
    { id: 'coa-1010', tenant_id: TENANT_ID, code: '1010' } as Row,
  ])
})

describe('tenantFromPaymentIntent — entity_id resolution', () => {
  it('resolves entityId from the linked booking', async () => {
    fake._seed('bookings', [{ id: 'bk-1', tenant_id: TENANT_ID, entity_id: ENTITY_ID } as Row])
    fake._seed('payments', [
      { id: 'pay-1', tenant_id: TENANT_ID, stripe_payment_intent_id: 'pi_1', booking_id: 'bk-1', invoice_id: null } as Row,
    ])

    const resolved = await tenantFromPaymentIntent('pi_1')
    expect(resolved?.entityId).toBe(ENTITY_ID)
  })

  it('falls back to the linked invoice\'s entity_id when there is no booking', async () => {
    fake._seed('invoices', [{ id: 'inv-1', tenant_id: TENANT_ID, entity_id: ENTITY_ID } as Row])
    fake._seed('payments', [
      { id: 'pay-2', tenant_id: TENANT_ID, stripe_payment_intent_id: 'pi_2', booking_id: null, invoice_id: 'inv-1' } as Row,
    ])

    const resolved = await tenantFromPaymentIntent('pi_2')
    expect(resolved?.entityId).toBe(ENTITY_ID)
  })
})

describe('postRefundToLedger / postChargebackToLedger — entity_id propagation', () => {
  it('carries a passed-through entityId onto the posted journal entry', async () => {
    const res = await postRefundToLedger({ tenantId: TENANT_ID, sourceId: 're_1', amountCents: 5000, entityId: ENTITY_ID })
    expect(res.posted).toBe(true)
    expect(postedEntries[0].entity_id).toBe(ENTITY_ID)
  })

  it('chargeback carries a passed-through entityId onto the posted journal entry', async () => {
    const res = await postChargebackToLedger({ tenantId: TENANT_ID, sourceId: 'dp_1', amountCents: 5000, entityId: ENTITY_ID })
    expect(res.posted).toBe(true)
    expect(postedEntries[0].entity_id).toBe(ENTITY_ID)
  })
})

describe('postCommissionAccrual / postCommissionPayment — entity_id propagation', () => {
  it('resolves entity_id from the commission\'s booking on accrual', async () => {
    fake._seed('bookings', [{ id: 'bk-2', tenant_id: TENANT_ID, entity_id: ENTITY_ID } as Row])
    fake._seed('referral_commissions', [
      { id: 'comm-1', tenant_id: TENANT_ID, commission_cents: 1000, status: 'pending', booking_id: 'bk-2' } as Row,
    ])

    const res = await postCommissionAccrual({ tenantId: TENANT_ID, commissionId: 'comm-1' })
    expect(res.posted).toBe(true)
    expect(postedEntries[0].entity_id).toBe(ENTITY_ID)
  })

  it('resolves entity_id from the commission\'s booking on payment', async () => {
    fake._seed('bookings', [{ id: 'bk-3', tenant_id: TENANT_ID, entity_id: ENTITY_ID } as Row])
    fake._seed('referral_commissions', [
      { id: 'comm-2', tenant_id: TENANT_ID, commission_cents: 1000, status: 'pending', booking_id: 'bk-3' } as Row,
    ])

    const res = await postCommissionPayment({ tenantId: TENANT_ID, commissionId: 'comm-2' })
    expect(res.posted).toBe(true)
    // Second posted entry is the payment; the first is the auto-accrual it triggers.
    expect(postedEntries).toHaveLength(2)
    expect(postedEntries[1].entity_id).toBe(ENTITY_ID)
  })
})
