/**
 * BANK-TXN MATCH → REVENUE POSTING — fresh-ground fix.
 *
 * Matching a bank transaction to an invoice or booking has always inserted a
 * `payments` row (and, for bookings, flipped `payment_status`), but never
 * called `postPaymentRevenue` — the real-time step every other money-in path
 * (mark-paid, Stripe webhook, payment-processor.ts) takes immediately after
 * inserting a payment. For a booking match this only delayed revenue until
 * the next `finance-post` cron run (which backfills from
 * `bookings.payment_status`). For an INVOICE match with no linked booking,
 * it was worse: the cron's `backfillRevenueFromBookings` only ever scans the
 * `bookings` table, and the generic payments-table safety net
 * (`backfillUnpostedRevenue`) is deliberately never wired into any cron (see
 * `cron/finance-post/route.ts`'s own comment on why) — so that revenue
 * would NEVER reach the general ledger through any path. The invoice would
 * show paid to the client, but the money would be permanently missing from
 * the books.
 *
 * This suite proves both match branches now post revenue immediately.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase, Row } from '@/test/fake-supabase'

type RpcCall = { fn: string; params: Record<string, unknown> }

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  const rpcCalls: RpcCall[] = []

  const rpc = async (fn: string, params: Record<string, unknown>) => {
    rpcCalls.push({ fn, params })
    if (fn !== 'post_journal_entry') throw new Error(`unexpected rpc: ${fn}`)
    const id = crypto.randomUUID()
    fake._seed('journal_entries', [
      { id, tenant_id: params.p_tenant_id, source: params.p_source, source_id: params.p_source_id },
    ])
    return { data: id, error: null }
  }

  const admin = { ...fake, rpc }
  return { supabase: admin, supabaseAdmin: admin, __fake: fake, __rpcCalls: rpcCalls }
})

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT_ID, role: 'owner', tenant: {} }, error: null }),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

const TENANT_ID = 'tenant-1'
const TXN_ID = 'txn-1'
const INVOICE_ID = 'invoice-1'
const BOOKING_ID = 'booking-1'
const CLIENT_ID = 'client-1'

function seed(txnOverrides: Partial<Row> = {}) {
  fake._store.clear()
  fake._seed('bank_transactions', [
    {
      id: TXN_ID,
      tenant_id: TENANT_ID,
      txn_date: '2026-07-17',
      description: 'Client payment',
      amount_cents: 20_000,
      status: 'pending',
      bank_account_id: 'acct-1',
      bank_accounts: { coa_id: 'coa-bank' },
      ...txnOverrides,
    },
  ])
  fake._seed('invoices', [
    { id: INVOICE_ID, tenant_id: TENANT_ID, total_cents: 20_000, amount_paid_cents: 0, status: 'sent', client_id: CLIENT_ID, booking_id: null },
  ])
  fake._seed('bookings', [{ id: BOOKING_ID, tenant_id: TENANT_ID, client_id: CLIENT_ID }])
  fake._seed('chart_of_accounts', [
    { id: 'coa-1050', tenant_id: TENANT_ID, code: '1050', type: 'asset' },
    { id: 'coa-4000', tenant_id: TENANT_ID, code: '4000', type: 'income' },
    { id: 'coa-4100', tenant_id: TENANT_ID, code: '4100', type: 'income' },
  ])
}

function matchRequest(body: Record<string, unknown>) {
  return new Request(`http://x/api/finance/bank-transactions/${TXN_ID}/match`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  seed()
})

describe('POST /api/finance/bank-transactions/[id]/match — revenue posting', () => {
  it('matching to an invoice with no linked booking posts revenue keyed by the payment', async () => {
    const res = await POST(
      matchRequest({ target_type: 'invoice', target_id: INVOICE_ID }),
      { params: Promise.resolve({ id: TXN_ID }) },
    )
    expect(res.status).toBe(200)

    const payment = fake._all('payments').find((p) => p.invoice_id === INVOICE_ID)
    expect(payment).toBeTruthy()

    const entries = fake._all('journal_entries').filter((e) => e.source === 'payment' && e.source_id === payment!.id)
    expect(entries.length).toBe(1)
  })

  it('matching to a booking posts revenue immediately, keyed by the booking', async () => {
    const res = await POST(
      matchRequest({ target_type: 'booking', target_id: BOOKING_ID }),
      { params: Promise.resolve({ id: TXN_ID }) },
    )
    expect(res.status).toBe(200)

    const entries = fake._all('journal_entries').filter((e) => e.source === 'booking' && e.source_id === BOOKING_ID)
    expect(entries.length).toBe(1)
  })

  it('matching to an invoice that IS linked to a booking keys revenue by the booking (unified with the bookings backfill)', async () => {
    seed({})
    fake._store.set('invoices', [
      { id: INVOICE_ID, tenant_id: TENANT_ID, total_cents: 20_000, amount_paid_cents: 0, status: 'sent', client_id: CLIENT_ID, booking_id: BOOKING_ID },
    ])

    const res = await POST(
      matchRequest({ target_type: 'invoice', target_id: INVOICE_ID }),
      { params: Promise.resolve({ id: TXN_ID }) },
    )
    expect(res.status).toBe(200)

    const entries = fake._all('journal_entries').filter((e) => e.source === 'booking' && e.source_id === BOOKING_ID)
    expect(entries.length).toBe(1)
  })

  it('a ledger-posting failure does not fail the match itself', async () => {
    fake._store.delete('chart_of_accounts') // ensureChartAccounts finds nothing -> accounts_missing, no throw expected anyway

    const res = await POST(
      matchRequest({ target_type: 'invoice', target_id: INVOICE_ID }),
      { params: Promise.resolve({ id: TXN_ID }) },
    )
    expect(res.status).toBe(200)
    const txnRow = fake._all('bank_transactions').find((t) => t.id === TXN_ID)
    expect(txnRow?.status).toBe('matched')
  })
})
