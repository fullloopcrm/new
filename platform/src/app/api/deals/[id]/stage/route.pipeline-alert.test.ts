import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * POST /api/deals/[id]/stage — pipeline-entry alerting when closeSoldQuote
 * fails on a manual "mark sold" action.
 *
 * lss-06 live-audit gap (2026-07-31, docs/readiness/ledger.json, severity
 * 5): closeSoldQuote (and everything it delegates to — createJobFromQuote /
 * createBookingFromQuote / createRecurringSeriesFromQuote, see
 * src/lib/close-sold-quote.test.ts) throws unless the quote's own `status`
 * is already 'accepted'. This route does NOT gate on that before calling
 * closeSoldQuote — an operator can mark a deal 'sold' manually (over the
 * phone, in person) before the customer ever formally accepts the public
 * quote link. Live prod check (2026-07-31): of quotes with a deal_id, 4 are
 * still 'draft' and 1 is 'sent' — none currently sold, but nothing prevents
 * it, and this is EXACTLY the trigger mechanism the checkpoint's own
 * historical bug came from (a manually-closed $365 quote sat unscheduled
 * for 11+ days with zero alert — commit 8536f407f's own description).
 * Before this fix, a closeSoldQuote failure here only hit console.warn.
 * This suite proves the fix: the deal still closes to 'sold' (best-effort
 * fulfillment dispatch must never block the stage change itself), but a
 * real trackError alert now fires too.
 */

const A = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
const trackErrorMock = vi.hoisted(() => vi.fn(async (_e: unknown, _c: { source?: string; severity?: string; tenantId?: string }) => {}))

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/tenant-query', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  }
  return {
    AuthError,
    getTenantForRequest: vi.fn(async () => ({ userId: 'u1', tenantId: A, tenant: { id: A }, role: 'owner' })),
  }
})
vi.mock('@/lib/error-tracking', () => ({ trackError: trackErrorMock }))
vi.mock('@/lib/jobs', () => ({
  closeSoldQuote: vi.fn(async () => {
    throw new Error("Can only convert accepted quotes (current: draft)")
  }),
}))

import { POST } from './route'

function seed() {
  return {
    deals: [
      { id: 'deal-a1', tenant_id: A, stage: 'quoted', title: 'A Deal', value_cents: 10_000, probability: 50 },
    ],
    deal_activities: [] as Record<string, unknown>[],
    quotes: [
      { id: 'quote-a1', tenant_id: A, deal_id: 'deal-a1', status: 'draft', converted_at: null, created_at: '2026-07-01' },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  trackErrorMock.mockClear()
})

function req(stage: string) {
  return new Request('http://t', { method: 'POST', body: JSON.stringify({ stage }) })
}
function params(id: string) {
  return { params: Promise.resolve({ id }) }
}

describe('deals/[id]/stage — pipeline-entry alerting on closeSoldQuote failure', () => {
  it('marks the deal sold AND calls trackError when closeSoldQuote throws (e.g. quote not yet accepted)', async () => {
    const res = await POST(req('sold'), params('deal-a1'))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.deal.stage).toBe('sold') // best-effort dispatch must never block the stage change

    expect(trackErrorMock).toHaveBeenCalledTimes(1)
    const [, context] = trackErrorMock.mock.calls[0]
    expect(context.source).toBe('api/deals/stage:close-sold-quote')
    expect(context.severity).toBe('high')
    expect(context.tenantId).toBe(A)
  })
})
