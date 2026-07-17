/**
 * MISSING entity_id ON THE CORE REVENUE LEDGER POST — postPaymentRevenue() and
 * backfillRevenueFromBookings().
 *
 * lib/finance/ledger-reports.ts's ledgerProfitAndLoss() -- the DEFAULT
 * (non-`?source=raw`) P&L source, per pnl/route.ts -- filters journal_lines
 * by journal_entries.entity_id when a specific entity is selected. Neither
 * of these two functions (the real-time payment poster and the
 * bookings-driven backfill) ever read or forwarded entity_id, so every
 * dollar of revenue and cost-of-service they post fell back to the
 * tenant's DEFAULT entity in the RPC (lib/ledger.ts's post_journal_entry).
 * For any multi-entity tenant, selecting a non-default entity's P&L would
 * show zero revenue for bookings/payments that plainly belong to it;
 * selecting the default entity would show revenue that actually belongs to
 * a different one. bookings.entity_id (migration 039) and
 * invoices.entity_id (migration 034) are both already populated -- this bug
 * was purely in the ledger-posting layer not reading them.
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
import { postPaymentRevenue, backfillRevenueFromBookings } from './post-revenue'

const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  postedEntries.length = 0
  fake._store.clear()
  fake._seed('chart_of_accounts', [
    { id: 'coa-1050', tenant_id: TENANT_ID, code: '1050' } as Row,
    { id: 'coa-4000', tenant_id: TENANT_ID, code: '4000' } as Row,
    { id: 'coa-4100', tenant_id: TENANT_ID, code: '4100' } as Row,
    { id: 'coa-5000', tenant_id: TENANT_ID, code: '5000' } as Row,
    { id: 'coa-2450', tenant_id: TENANT_ID, code: '2450' } as Row,
  ])
})

describe('postPaymentRevenue — entity_id propagation', () => {
  it('carries the linked booking\'s entity_id onto the posted journal entry', async () => {
    fake._seed('bookings', [{ id: 'bk-1', tenant_id: TENANT_ID, entity_id: ENTITY_ID } as Row])
    fake._seed('payments', [
      {
        id: 'pay-1', tenant_id: TENANT_ID, amount_cents: 5000, tip_cents: 0,
        status: 'completed', method: 'card', booking_id: 'bk-1', invoice_id: null,
      } as Row,
    ])

    const res = await postPaymentRevenue({ tenantId: TENANT_ID, paymentId: 'pay-1' })
    expect(res.posted).toBe(true)
    expect(postedEntries).toHaveLength(1)
    expect(postedEntries[0].entity_id).toBe(ENTITY_ID)
  })

  it('falls back to the linked invoice\'s entity_id when there is no booking', async () => {
    fake._seed('invoices', [{ id: 'inv-1', tenant_id: TENANT_ID, entity_id: ENTITY_ID } as Row])
    fake._seed('payments', [
      {
        id: 'pay-2', tenant_id: TENANT_ID, amount_cents: 3000, tip_cents: 0,
        status: 'completed', method: 'manual', booking_id: null, invoice_id: 'inv-1',
      } as Row,
    ])

    const res = await postPaymentRevenue({ tenantId: TENANT_ID, paymentId: 'pay-2' })
    expect(res.posted).toBe(true)
    expect(postedEntries[0].entity_id).toBe(ENTITY_ID)
  })
})

describe('backfillRevenueFromBookings — entity_id propagation', () => {
  it('carries each booking\'s own entity_id onto both its revenue and labor journal entries', async () => {
    fake._seed('bookings', [
      {
        id: 'bk-2', tenant_id: TENANT_ID, price: 10000, team_member_pay: 4000,
        tip_amount: 0, payment_status: 'paid', start_time: '2026-07-01T10:00:00Z',
        entity_id: ENTITY_ID,
      } as Row,
    ])

    const result = await backfillRevenueFromBookings(TENANT_ID)
    expect(result.revenuePosted).toBe(1)
    expect(result.cogsPosted).toBe(1)
    expect(postedEntries).toHaveLength(2)
    expect(postedEntries.every((e) => e.entity_id === ENTITY_ID)).toBe(true)
  })
})
