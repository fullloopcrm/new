/**
 * QUOTE-DECLINE ROUTE RACE — POST /api/quotes/public/[token]/decline atomic claim.
 *
 * This public, unauthenticated endpoint guarded against re-declining an
 * already-declined quote with a plain SELECT-then-branch on `quotes.status`,
 * then an unconditional UPDATE with no matching WHERE guard — the exact
 * TOCTOU shape already fixed on the sibling accept route. A customer
 * double-tapping "Decline" (or a client retry after a slow response) can
 * fire two concurrent requests that both read a pre-decline status, both
 * pass the check, and both proceed to log a deal-activity note and fire the
 * owner notification a second time.
 *
 * Fix: fold the pre-decline status into the UPDATE itself (compare-and-swap)
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

const { notify, ownerAlert } = vi.hoisted(() => ({
  notify: vi.fn(async () => {}),
  ownerAlert: vi.fn(async () => {}),
}))

vi.mock('@/lib/notify', () => ({ notify }))
vi.mock('@/lib/messaging/owner-alerts', () => ({ ownerAlert }))
vi.mock('@/lib/quote', () => ({ logQuoteEvent: vi.fn(async () => {}) }))

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
      quote_number: 'Q-1',
      deal_id: null,
      ...overrides,
    },
  ])
}

function declineRequest(reason = 'too expensive') {
  return new Request(`http://x/api/quotes/public/${TOKEN}/decline`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}

beforeEach(() => {
  seedQuote()
  notify.mockClear()
  ownerAlert.mockClear()
})

describe('POST /api/quotes/public/[token]/decline — concurrent decline race', () => {
  it('two concurrent declines log the deal note and notify exactly once, not twice', async () => {
    const results = await Promise.allSettled([
      POST(declineRequest(), { params: Promise.resolve({ token: TOKEN }) }),
      POST(declineRequest(), { params: Promise.resolve({ token: TOKEN }) }),
    ])

    const bodies: Array<Record<string, unknown>> = await Promise.all(
      results
        .filter((r) => r.status === 'fulfilled')
        .map((r) => (r as PromiseFulfilledResult<Response>).value.json()),
    )
    const winners = bodies.filter((b) => !b.already_declined)
    const losers = bodies.filter((b) => b.already_declined)
    expect(winners.length).toBe(1)
    expect(losers.length).toBe(1)

    // The whole point: owner notification must fire exactly once, not once
    // per concurrent request.
    expect(ownerAlert).toHaveBeenCalledTimes(1)

    const quoteRow = fake._all('quotes').find((q) => q.id === QUOTE_ID)
    expect(quoteRow?.status).toBe('declined')
  })

  it('a sequential retry after decline is idempotent', async () => {
    const first = await (await POST(declineRequest(), { params: Promise.resolve({ token: TOKEN }) })).json()
    expect(first.already_declined).toBeFalsy()

    const second = await (await POST(declineRequest(), { params: Promise.resolve({ token: TOKEN }) })).json()
    expect(second.already_declined).toBe(true)

    expect(ownerAlert).toHaveBeenCalledTimes(1)
  })
})
