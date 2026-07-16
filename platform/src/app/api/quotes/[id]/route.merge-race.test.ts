/**
 * PATCH /api/quotes/[id] — read-merge-write race on the totals-recompute
 * path, same class as the admin/businesses config-merge race.
 *
 * When a PATCH body touches only SOME of line_items/tax_rate_bps/
 * discount_cents (e.g. a partial caller changing just the tax rate), the
 * route reads the untouched columns from the DB ("current") to recompute
 * totals, then writes `line_items`/`tax_rate_bps`/`discount_cents` back in
 * full — including the columns it only READ, not changed. That read is a
 * stale snapshot: a concurrent edit to one of those same columns (a second
 * autosave from another tab, a different partial-field caller) landing
 * between this route's `current` read and its write used to be silently
 * reverted by this route re-writing back the STALE value it read a moment
 * earlier — a lost update, not a visible error.
 *
 * FIX: any column folded back from `current` (i.e. NOT present in the
 * request body) is re-asserted in the write's own WHERE against the CURRENT
 * DB row via `guardFields`. If it changed concurrently, zero rows match and
 * the route 409s instead of clobbering the concurrent edit.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeSupabaseFake } from '@/test/supabase-fake'

const TENANT_ID = 'tenant-A'
const QUOTE_ID = 'q-1'

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  getTenantForRequest: vi.fn(),
}))

/** Set by a test to inject a concurrent write right after the route's
 *  `current` (line_items/tax_rate_bps/discount_cents) read resolves — the
 *  second `.single()` call against `quotes` in a PATCH (the first is the
 *  top-of-route status read). That's the exact TOCTOU gap this fix closes. */
const afterSecondRead = vi.hoisted(() => ({ fn: null as (() => void) | null, count: 0 }))

vi.mock('@/lib/supabase', () => {
  const raw = makeSupabaseFake(h, { detachReads: true })
  const fake = {
    from(table: string) {
      const chain = raw.from(table) as Record<string, unknown>
      if (table !== 'quotes') return chain
      const origSingle = chain.single as () => Promise<unknown>
      chain.single = () =>
        origSingle().then((res) => {
          afterSecondRead.count += 1
          if (afterSecondRead.count === 2) {
            afterSecondRead.fn?.()
            afterSecondRead.fn = null
          }
          return res
        })
      return chain
    },
  }
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/tenant-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/tenant-query')>()
  return { ...actual, getTenantForRequest: (...a: unknown[]) => h.getTenantForRequest(...a) }
})
vi.mock('@/lib/quote', () => ({
  normalizeLineItems: (items: unknown) => items,
  computeTotals: (lineItems: unknown) => ({
    subtotal_cents: 0, tax_cents: 0, discount_cents: 0,
    total_cents: Array.isArray(lineItems) ? lineItems.length : 0,
  }),
  logQuoteEvent: vi.fn(async () => {}),
}))

import { PATCH } from './route'

const patchReq = (body: unknown) => new Request('http://x', { method: 'PATCH', body: JSON.stringify(body) })
const params = (id: string) => ({ params: Promise.resolve({ id }) })

beforeEach(() => {
  h.seq = 0
  h.getTenantForRequest.mockReset()
  h.getTenantForRequest.mockImplementation(async () => ({ tenantId: TENANT_ID, role: 'owner' }))
  afterSecondRead.fn = null
  afterSecondRead.count = 0
})

describe('PATCH /api/quotes/[id] — read-merge-write totals race', () => {
  it('refuses to fold back a stale line_items snapshot once a concurrent edit changes it', async () => {
    h.store = {
      quotes: [{
        id: QUOTE_ID, tenant_id: TENANT_ID, status: 'draft',
        line_items: [{ id: '1', name: 'Old item' }],
        tax_rate_bps: 800, discount_cents: 0,
      }],
    }
    // Body only changes tax_rate_bps — line_items is folded back from `current`.
    afterSecondRead.fn = () => {
      h.store.quotes[0] = {
        ...h.store.quotes[0],
        line_items: [{ id: '1', name: 'Old item' }, { id: '2', name: 'New item added concurrently' }],
      }
    }

    const res = await PATCH(patchReq({ tax_rate_bps: 900 }), params(QUOTE_ID))
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.error).toMatch(/concurrently/i)
    // The concurrent line_items edit must survive, not get reverted to the
    // stale 1-item snapshot this route read before recomputing.
    expect(h.store.quotes[0].line_items).toHaveLength(2)
    expect(h.store.quotes[0].tax_rate_bps).toBe(800)
  })

  it('still recomputes totals normally when nothing races (no regression)', async () => {
    h.store = {
      quotes: [{
        id: QUOTE_ID, tenant_id: TENANT_ID, status: 'draft',
        line_items: [{ id: '1', name: 'Old item' }],
        tax_rate_bps: 800, discount_cents: 0,
      }],
    }

    const res = await PATCH(patchReq({ tax_rate_bps: 900 }), params(QUOTE_ID))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.quote.tax_rate_bps).toBe(900)
    expect(h.store.quotes[0].line_items).toEqual([{ id: '1', name: 'Old item' }])
  })
})
