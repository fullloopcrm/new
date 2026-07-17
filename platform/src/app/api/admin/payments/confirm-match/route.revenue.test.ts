/**
 * Item (155) — continues item (154)'s surface. Confirming a Zelle/Venmo
 * match (this route) has always inserted a `payments` row and flipped the
 * booking's `payment_status`, but — like the manual invoice
 * record-payment route ((154)) and, before that, the bank-txn match route
 * ((152)) — never called `postPaymentRevenue`, the real-time ledger step
 * every other money-in path takes immediately after inserting a payment.
 * Every match here is booking-linked (`bookingId` is required), so the
 * gap was never permanent — the daily `finance-post` cron's
 * `backfillRevenueFromBookings` eventually catches it from
 * `bookings.payment_status` — but revenue sat off the books for up to a
 * day instead of posting the moment the admin confirmed the match, unlike
 * every sibling money-in path.
 *
 * This suite proves the match now posts revenue immediately.
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

vi.mock('@/lib/sms', () => ({ sendSMS: async () => {} }))

vi.mock('@/lib/tenant-query', () => ({
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) { super(message); this.status = status }
  },
}))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT_ID }, error: null }),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

const TENANT_ID = 'tenant-1'
const UNMATCHED_ID = 'unm-1'
const BOOKING_ID = 'bk-1'
const CLIENT_ID = 'client-1'

function seed(overrides: Partial<Row> = {}) {
  fake._store.clear()
  fake._seed('unmatched_payments', [
    { id: UNMATCHED_ID, tenant_id: TENANT_ID, method: 'zelle', amount_cents: 10_000, sender_name: 'Jane Doe', status: 'unmatched', ...overrides },
  ])
  fake._seed('bookings', [
    { id: BOOKING_ID, tenant_id: TENANT_ID, client_id: CLIENT_ID, team_member_id: null, hourly_rate: null, actual_hours: null, price: 10_000, payment_status: 'pending' },
  ])
  fake._seed('tenants', [{ id: TENANT_ID, name: 'Test Co', telnyx_api_key: null, telnyx_phone: null }])
  fake._seed('chart_of_accounts', [
    { id: 'coa-1050', tenant_id: TENANT_ID, code: '1050', type: 'asset' },
    { id: 'coa-4000', tenant_id: TENANT_ID, code: '4000', type: 'income' },
    { id: 'coa-4100', tenant_id: TENANT_ID, code: '4100', type: 'income' },
  ])
}

function req(): Request {
  return new Request('http://x', {
    method: 'POST',
    body: JSON.stringify({ unmatchedPaymentId: UNMATCHED_ID, bookingId: BOOKING_ID }),
  })
}

beforeEach(() => {
  seed()
})

describe('POST /api/admin/payments/confirm-match — revenue posting', () => {
  it('posts revenue immediately, keyed by the booking', async () => {
    const res = await POST(req())
    expect(res.status).toBe(200)

    const payment = fake._all('payments').find((p) => p.booking_id === BOOKING_ID)
    expect(payment).toBeTruthy()

    const entries = fake._all('journal_entries').filter((e) => e.source === 'booking' && e.source_id === BOOKING_ID)
    expect(entries.length).toBe(1)
  })

  it('a partial match (amount well under the booking price) still posts revenue', async () => {
    seed({ amount_cents: 5_000 })
    const res = await POST(req())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('partial')

    const entries = fake._all('journal_entries').filter((e) => e.source === 'booking' && e.source_id === BOOKING_ID)
    expect(entries.length).toBe(1)
  })

  it('a ledger-posting failure does not fail the match itself', async () => {
    seed()
    fake._store.delete('chart_of_accounts') // ensureChartAccounts finds nothing -> accounts_missing, no throw expected

    const res = await POST(req())
    expect(res.status).toBe(200)
    const unmatched = fake._all('unmatched_payments').find((r) => r.id === UNMATCHED_ID)
    expect(unmatched?.status).toBe('matched')
    const booking = fake._all('bookings').find((r) => r.id === BOOKING_ID)
    expect(booking?.payment_status).toBe('paid')
  })
})
