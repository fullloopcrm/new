/**
 * JOB PAYMENT PLAN — deposit-already-paid accounting.
 *
 * `createJobFromQuote`'s default (caller-supplied-no-plan) fallback used to
 * insert a single 'Final payment' job_payments row for the quote's FULL
 * total_cents, with no regard for `quotes.deposit_paid_cents`. Every
 * automatic conversion path calls with an empty opts object — the Stripe
 * deposit-checkout webhook (webhooks/stripe/route.ts) and the no-deposit
 * public-accept path (quotes/public/[token]/accept/route.ts) both do
 * `convertSaleToJob(tenantId, { type: 'quote', quoteId }, {})`. For any real
 * project quote with a deposit (the normal case for roofing/remodel/interior
 * design work), the customer paid the deposit via Stripe, then the job's own
 * payment plan asked for the FULL total again on top of it — a real
 * double-billing setup an operator would only catch by manually inspecting
 * the job's payment plan before invoicing.
 *
 * Fix: the default plan now nets deposit_paid_cents off the total and
 * records the deposit as an already-'paid' line instead of silently
 * dropping it.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase, Row } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

import { supabaseAdmin } from '@/lib/supabase'
import { createJobFromQuote } from './jobs'

const fake = supabaseAdmin as unknown as FakeSupabase

const TENANT_ID = 'tenant-1'
const QUOTE_ID = 'quote-1'

function seedQuote(overrides: Partial<Row> = {}) {
  fake._store.clear()
  fake._seed('quotes', [
    {
      id: QUOTE_ID,
      tenant_id: TENANT_ID,
      status: 'accepted',
      converted_job_id: null,
      converted_at: null,
      total_cents: 10_000,
      deposit_paid_cents: 0,
      client_id: 'client-1',
      title: 'Test Quote',
      quote_number: 'Q-1',
      contact_email: null,
      contact_name: null,
      contact_phone: null,
      service_address: null,
      notes: null,
      ...overrides,
    },
  ])
}

beforeEach(() => {
  seedQuote()
})

describe('createJobFromQuote — default payment plan nets an already-paid deposit', () => {
  it('splits deposit (paid) + final (remainder) when the quote deposit was collected', async () => {
    seedQuote({ total_cents: 10_000, deposit_paid_cents: 2_500 })

    await createJobFromQuote(TENANT_ID, QUOTE_ID)

    const payments = fake._all('job_payments').sort((a, b) => (a.sort_order as number) - (b.sort_order as number))
    expect(payments.length).toBe(2)

    expect(payments[0].kind).toBe('deposit')
    expect(payments[0].amount_cents).toBe(2_500)
    expect(payments[0].status).toBe('paid')
    expect(payments[0].paid_at).toBeTruthy()

    expect(payments[1].kind).toBe('final')
    expect(payments[1].amount_cents).toBe(7_500)
    expect(payments[1].status).toBe('pending')

    // The two rows must sum to the contracted total — no double-bill, no shortfall.
    const sum = payments.reduce((s, p) => s + (p.amount_cents as number), 0)
    expect(sum).toBe(10_000)
  })

  it('falls back to a single final payment for the full total when no deposit was paid', async () => {
    seedQuote({ total_cents: 10_000, deposit_paid_cents: 0 })

    await createJobFromQuote(TENANT_ID, QUOTE_ID)

    const payments = fake._all('job_payments')
    expect(payments.length).toBe(1)
    expect(payments[0].kind).toBe('final')
    expect(payments[0].amount_cents).toBe(10_000)
    expect(payments[0].status).toBe('pending')
  })

  it('never asks for more than the remaining balance if the deposit happened to equal the total', async () => {
    seedQuote({ total_cents: 5_000, deposit_paid_cents: 5_000 })

    await createJobFromQuote(TENANT_ID, QUOTE_ID)

    const payments = fake._all('job_payments').sort((a, b) => (a.sort_order as number) - (b.sort_order as number))
    expect(payments[0]).toMatchObject({ kind: 'deposit', amount_cents: 5_000, status: 'paid' })
    expect(payments[1]).toMatchObject({ kind: 'final', amount_cents: 0 })
  })

  it('caller-supplied payments still override the default (existing behavior preserved)', async () => {
    seedQuote({ total_cents: 10_000, deposit_paid_cents: 2_500 })

    await createJobFromQuote(TENANT_ID, QUOTE_ID, {
      payments: [{ label: 'Milestone 1', kind: 'milestone', amount_cents: 10_000 }],
    })

    const payments = fake._all('job_payments')
    expect(payments.length).toBe(1)
    expect(payments[0].label).toBe('Milestone 1')
    expect(payments[0].status).toBe('pending')
  })
})
