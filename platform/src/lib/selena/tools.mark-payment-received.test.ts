/**
 * Selena's mark_payment_received tool (handleMarkPaymentReceived) inserted
 * into `payments` with a column that doesn't exist (`amount` instead of the
 * real `amount_cents`) and a status value (`'received'`) that isn't in
 * postPaymentRevenue's REVENUE_STATUSES. The insert silently failed (no
 * `payments` row was ever created — the error was never checked), so telling
 * Selena a booking was paid never recorded the payment and never posted
 * revenue: the same permanent-gap class as (152)/(154)/(155), but with the
 * insert itself failing rather than just missing the postPaymentRevenue call.
 *
 * Fixed to use amount_cents + status 'completed' and to call
 * postPaymentRevenue after a successful insert, matching every other
 * money-in path.
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

import { supabaseAdmin } from '@/lib/supabase'
import { handleMarkPaymentReceived } from './tools'

const fake = supabaseAdmin as unknown as FakeSupabase

const TENANT_ID = 'tenant-1'
const BOOKING_ID = 'booking-1'
const CLIENT_ID = 'client-1'

function seed(overrides: Partial<Row> = {}) {
  fake._store.clear()
  fake._seed('bookings', [
    { id: BOOKING_ID, tenant_id: TENANT_ID, client_id: CLIENT_ID, payment_status: 'pending', ...overrides },
  ])
  fake._seed('chart_of_accounts', [
    { id: 'coa-1050', tenant_id: TENANT_ID, code: '1050', type: 'asset' },
    { id: 'coa-4000', tenant_id: TENANT_ID, code: '4000', type: 'income' },
    { id: 'coa-4100', tenant_id: TENANT_ID, code: '4100', type: 'income' },
  ])
}

beforeEach(() => {
  seed()
})

describe('handleMarkPaymentReceived — revenue posting', () => {
  it('inserts the payment with amount_cents (not the nonexistent `amount` column)', async () => {
    const out = JSON.parse(await handleMarkPaymentReceived({ booking_id: BOOKING_ID, amount_dollars: 100, method: 'cash' }, TENANT_ID))
    expect(out.ok).toBe(true)

    const payment = fake._all('payments').find((p) => p.booking_id === BOOKING_ID)
    expect(payment).toBeTruthy()
    expect(payment?.amount_cents).toBe(10_000)
    expect(payment?.status).toBe('completed')
  })

  it('flips the booking to paid', async () => {
    await handleMarkPaymentReceived({ booking_id: BOOKING_ID, amount_dollars: 50, method: 'zelle' }, TENANT_ID)
    const booking = fake._all('bookings').find((b) => b.id === BOOKING_ID)
    expect(booking?.payment_status).toBe('paid')
  })

  it('posts revenue to the ledger immediately, keyed by the booking', async () => {
    await handleMarkPaymentReceived({ booking_id: BOOKING_ID, amount_dollars: 75, method: 'check' }, TENANT_ID)
    const entries = fake._all('journal_entries').filter((e) => e.source === 'booking' && e.source_id === BOOKING_ID)
    expect(entries.length).toBe(1)
  })

  it('a ledger-posting failure does not fail the tool call', async () => {
    fake._store.delete('chart_of_accounts') // ensureChartAccounts finds nothing -> accounts_missing, no throw expected
    const out = JSON.parse(await handleMarkPaymentReceived({ booking_id: BOOKING_ID, amount_dollars: 100, method: 'cash' }, TENANT_ID))
    expect(out.ok).toBe(true)
    const booking = fake._all('bookings').find((b) => b.id === BOOKING_ID)
    expect(booking?.payment_status).toBe('paid')
  })

  it('returns an error and does not touch the booking when the booking is not found', async () => {
    const out = JSON.parse(await handleMarkPaymentReceived({ booking_id: 'missing', amount_dollars: 100, method: 'cash' }, TENANT_ID))
    expect(out.error).toMatch(/not found/i)
    expect(fake._all('payments').length).toBe(0)
  })
})
