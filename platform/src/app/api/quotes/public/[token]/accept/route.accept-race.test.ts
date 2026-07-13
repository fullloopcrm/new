/**
 * QUOTE-ACCEPT ROUTE RACE — POST /api/quotes/public/[token]/accept atomic claim.
 *
 * This public, unauthenticated endpoint guarded against re-accepting an
 * already-accepted quote with a plain SELECT-then-branch on `quotes.status`,
 * then a plain UPDATE with no matching WHERE guard (same TOCTOU shape the
 * deposit-claim and quote-conversion paths were already fixed for). A
 * customer double-tapping "Accept" (or a client retry after a slow response)
 * can fire two concurrent requests that both read a pre-accept status, both
 * pass the check, and both proceed to advance the deal to Sold, call
 * convertSaleToJob/createBookingFromQuote, and fire the owner notification —
 * all a second time.
 *
 * Fix: fold the pre-accept status into the UPDATE itself (compare-and-swap)
 * so only one request's write actually lands; the loser gets no row back and
 * returns idempotently before any downstream side effect fires.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase, Row } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

const { convertSaleToJob, notify, ownerAlert } = vi.hoisted(() => ({
  convertSaleToJob: vi.fn(async () => ({ job_id: 'job-should-only-happen-once', already_converted: false })),
  notify: vi.fn(async () => {}),
  ownerAlert: vi.fn(async () => {}),
}))

vi.mock('@/lib/jobs', () => ({ convertSaleToJob }))
vi.mock('@/lib/notify', () => ({ notify }))
vi.mock('@/lib/messaging/owner-alerts', () => ({ ownerAlert }))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

const TENANT_ID = 'tenant-1'
const QUOTE_ID = 'quote-1'
const TOKEN = 'tok-1'

function seedQuote(overrides: Partial<Row> = {}) {
  fake._store.clear()
  fake._seed('quotes', [
    {
      id: QUOTE_ID,
      tenant_id: TENANT_ID,
      public_token: TOKEN,
      status: 'sent',
      deal_id: null,
      deposit_cents: 0,
      total_cents: 10_000,
      quote_number: 'Q-1',
      fulfillment_type: null,
      recurring_type: null,
      converted_job_id: null,
      ...overrides,
    },
  ])
}

const SIGNATURE_PNG = 'data:image/png;base64,' + 'A'.repeat(120)

function acceptRequest() {
  return new Request(`http://x/api/quotes/public/${TOKEN}/accept`, {
    method: 'POST',
    body: JSON.stringify({ signature_png: SIGNATURE_PNG, signature_name: 'Jane Client' }),
  })
}

beforeEach(() => {
  seedQuote()
  convertSaleToJob.mockClear()
  notify.mockClear()
  ownerAlert.mockClear()
})

describe('POST /api/quotes/public/[token]/accept — concurrent accept race', () => {
  it('two concurrent accepts convert the sale exactly once, not twice', async () => {
    const results = await Promise.allSettled([
      POST(acceptRequest(), { params: Promise.resolve({ token: TOKEN }) }),
      POST(acceptRequest(), { params: Promise.resolve({ token: TOKEN }) }),
    ])

    const bodies: Array<Record<string, unknown>> = await Promise.all(
      results
        .filter((r) => r.status === 'fulfilled')
        .map((r) => (r as PromiseFulfilledResult<Response>).value.json()),
    )
    const winners = bodies.filter((b) => !b.already_accepted)
    const losers = bodies.filter((b) => b.already_accepted)
    expect(winners.length).toBe(1)
    expect(losers.length).toBe(1)

    // The whole point: sale conversion and owner notification must each
    // fire exactly once, not once per concurrent request.
    expect(convertSaleToJob).toHaveBeenCalledTimes(1)
    expect(ownerAlert).toHaveBeenCalledTimes(1)

    const quoteRow = fake._all('quotes').find((q) => q.id === QUOTE_ID)
    expect(quoteRow?.status).toBe('accepted')
  })

  it('a sequential retry after acceptance is idempotent', async () => {
    const first = await (await POST(acceptRequest(), { params: Promise.resolve({ token: TOKEN }) })).json()
    expect(first.already_accepted).toBeFalsy()

    const second = await (await POST(acceptRequest(), { params: Promise.resolve({ token: TOKEN }) })).json()
    expect(second.already_accepted).toBe(true)

    expect(convertSaleToJob).toHaveBeenCalledTimes(1)
  })
})
