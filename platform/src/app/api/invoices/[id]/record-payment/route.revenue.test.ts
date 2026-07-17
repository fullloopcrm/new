/**
 * Item (154) — new fresh-ground surface, same shape as (152)/(153)'s
 * bank-txn match fix. Recording a manual invoice payment (Zelle/Venmo/cash/
 * check) has always inserted a `payments` row and relied on a DB trigger to
 * recompute the invoice's paid total — but, like the bank-txn match route
 * before it was fixed, never called `postPaymentRevenue`, the real-time
 * ledger step every other money-in path (mark-paid, Stripe webhook,
 * payment-processor.ts, the now-fixed bank-txn match route) takes
 * immediately after inserting a payment.
 *
 * For an invoice WITH a linked booking this only delayed revenue until the
 * next `finance-post` cron run (`backfillRevenueFromBookings` scans
 * `bookings.payment_status`). For an invoice with NO linked booking it was
 * the exact permanent gap (152) closed on the bank-txn match route: the
 * cron's booking backfill never sees it, and the generic payments-table
 * safety net (`backfillUnpostedRevenue`) is deliberately never wired into
 * any cron — so the revenue would never reach the general ledger through
 * any path at all. The invoice would show paid to the client; the money
 * would be permanently missing from the books.
 *
 * This suite proves both cases now post revenue immediately.
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
  return { supabaseAdmin: admin, __fake: fake, __rpcCalls: rpcCalls }
})

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT_ID }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) { super(message); this.status = status }
  },
}))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT_ID }, error: null }),
}))

vi.mock('@/lib/invoice', () => ({
  logInvoiceEvent: async () => {},
}))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

const TENANT_ID = 'tenant-1'
const INVOICE_ID = 'inv-1'
const BOOKING_ID = 'bk-1'
const CLIENT_ID = 'client-1'

function seed(invoiceOverrides: Partial<Row> = {}) {
  fake._store.clear()
  fake._seed('invoices', [
    {
      id: INVOICE_ID,
      tenant_id: TENANT_ID,
      client_id: CLIENT_ID,
      booking_id: null,
      total_cents: 20_000,
      amount_paid_cents: 0,
      status: 'sent',
      ...invoiceOverrides,
    },
  ])
  fake._seed('chart_of_accounts', [
    { id: 'coa-1050', tenant_id: TENANT_ID, code: '1050', type: 'asset' },
    { id: 'coa-4000', tenant_id: TENANT_ID, code: '4000', type: 'income' },
    { id: 'coa-4100', tenant_id: TENANT_ID, code: '4100', type: 'income' },
  ])
}

function req(body: Record<string, unknown>): Request {
  return new Request(`http://x/api/invoices/${INVOICE_ID}/record-payment`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}
const params = Promise.resolve({ id: INVOICE_ID })

beforeEach(() => {
  seed()
})

describe('POST /api/invoices/[id]/record-payment — revenue posting', () => {
  it('an invoice with no linked booking posts revenue keyed by the payment (the permanent-gap case)', async () => {
    const res = await POST(req({ amount_cents: 20_000, method: 'zelle' }), { params })
    expect(res.status).toBe(200)

    const payment = fake._all('payments').find((p) => p.invoice_id === INVOICE_ID)
    expect(payment).toBeTruthy()

    const entries = fake._all('journal_entries').filter((e) => e.source === 'payment' && e.source_id === payment!.id)
    expect(entries.length).toBe(1)
  })

  it('an invoice linked to a booking keys revenue by the booking (unified with the bookings backfill)', async () => {
    seed({ booking_id: BOOKING_ID })
    const res = await POST(req({ amount_cents: 20_000, method: 'cash' }), { params })
    expect(res.status).toBe(200)

    const entries = fake._all('journal_entries').filter((e) => e.source === 'booking' && e.source_id === BOOKING_ID)
    expect(entries.length).toBe(1)
  })

  it('a ledger-posting failure does not fail the payment record itself', async () => {
    fake._store.delete('chart_of_accounts')
    const res = await POST(req({ amount_cents: 20_000, method: 'venmo' }), { params })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    const payment = fake._all('payments').find((p) => p.invoice_id === INVOICE_ID)
    expect(payment).toBeTruthy()
  })
})
