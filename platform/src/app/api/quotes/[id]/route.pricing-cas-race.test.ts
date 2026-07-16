import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * PATCH /api/quotes/[id] — line_items/tax_rate_bps/discount_cents merge race.
 *
 * BUG (fixed here, same TOCTOU class as the tenants.selena_config/setup_progress
 * fixes, but on the quotes/invoices table instead): editing just ONE of
 * line_items/tax_rate_bps/discount_cents reads the CURRENT values of all
 * three, recomputes totals in JS, then blind-writes the whole set back. Two
 * edits landing close together on the SAME quote (a line-item change and a
 * discount change from two tabs, or two autosave debounces overlapping —
 * this route's own 'silent' flag exists BECAUSE autosave fires on every
 * keystroke debounce) both read the same stale snapshot, and whichever
 * write lands second silently reverts the other field to what it read, with
 * no error to either side.
 *
 * FIX: guard the final write with `.eq('updated_at', <value read at the top
 * of this request>)` (quotes.updated_at is bumped on every UPDATE by the
 * existing quotes_set_updated_at trigger). A write based on a stale read now
 * matches zero rows and the route returns 409 instead of silently clobbering.
 */

const TENANT_A = 'tid-a'
const QUOTE_ID = 'quote-1'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
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
    getTenantForRequest: vi.fn(async () => ({ userId: 'u1', tenantId: TENANT_A, tenant: { id: TENANT_A }, role: 'owner' })),
  }
})

import { PATCH } from './route'

function seed() {
  return {
    quotes: [
      {
        id: QUOTE_ID, tenant_id: TENANT_A, status: 'draft', client_id: null,
        line_items: [{ id: 'li_0', name: 'Original item', quantity: 1, unit_price_cents: 10000, subtotal_cents: 10000, selected: true }],
        tax_rate_bps: 0, discount_cents: 0, total_cents: 10000,
        deposit_type: 'none', deposit_value: 0, updated_at: 'T0',
      },
    ],
    clients: [],
  }
}

let h: Harness
let raceOnNextPricingRead = false

beforeEach(() => {
  h = createTenantDbHarness(seed())
  raceOnNextPricingRead = false
  holder.from = (table: string) => {
    const chain = h.from(table)
    if (table === 'quotes') {
      const origSelect = chain.select
      chain.select = (columns?: unknown, opts?: unknown) => {
        const result = origSelect(columns, opts)
        if (raceOnNextPricingRead && typeof columns === 'string' && columns.includes('updated_at')) {
          const origSingle = result.single
          result.single = async () => {
            const r = await origSingle()
            // Simulate a concurrent request's write landing between OUR read
            // (which just captured updated_at='T0') and our eventual write —
            // exactly what the real quotes_set_updated_at trigger would do.
            // Replace (not mutate) the seed row: the harness returns live
            // object references from select(), so mutating in place would
            // retroactively alter the row `r` we just captured above too.
            const rows = h.seed.quotes as Record<string, unknown>[]
            const idx = rows.findIndex((x) => x.id === QUOTE_ID)
            if (idx >= 0) rows[idx] = { ...rows[idx], updated_at: 'T1-CONCURRENT-WRITE' }
            raceOnNextPricingRead = false
            return r
          }
        }
        return result
      }
    }
    return chain
  }
})

function patch(body: unknown) {
  return PATCH(new Request('http://t', { method: 'PATCH', body: JSON.stringify(body) }), { params: Promise.resolve({ id: QUOTE_ID }) })
}

function stored(field: string): unknown {
  return (h.seed.quotes as Record<string, unknown>[]).find((r) => r.id === QUOTE_ID)?.[field]
}

describe('PATCH /api/quotes/[id] — pricing merge race', () => {
  it('editing only discount_cents succeeds normally and preserves the current line_items', async () => {
    const res = await patch({ discount_cents: 500 })
    expect(res.status).toBe(200)
    expect(stored('discount_cents')).toBe(500)
    expect(stored('line_items')).toEqual([{ id: 'li_0', name: 'Original item', quantity: 1, unit_price_cents: 10000, subtotal_cents: 10000, optional: false, selected: true }])
  })

  it('a write based on a stale read is rejected (409) instead of silently clobbering a concurrent change', async () => {
    raceOnNextPricingRead = true
    const res = await patch({ discount_cents: 500 })
    expect(res.status).toBe(409)

    // The concurrent write's updated_at (and whatever it set) survives untouched —
    // our stale-based write never landed.
    expect(stored('updated_at')).toBe('T1-CONCURRENT-WRITE')
    expect(stored('discount_cents')).toBe(0)
  })

  it('a non-pricing edit (notes only) is never CAS-guarded and always succeeds', async () => {
    raceOnNextPricingRead = true // would only matter if the pricing branch ran
    const res = await patch({ notes: 'called customer back' })
    expect(res.status).toBe(200)
    expect(stored('notes')).toBe('called customer back')
  })
})
