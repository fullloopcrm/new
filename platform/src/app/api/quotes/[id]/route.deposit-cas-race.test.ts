import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * PATCH /api/quotes/[id] — deposit_cents derived from a stale total_cents.
 *
 * BUG (fixed here): the pricing-merge race (route.pricing-cas-race.test.ts) was
 * fixed by CAS-guarding the final write with the updated_at captured when the
 * route re-reads line_items/tax_rate_bps/discount_cents. But a PATCH that sends
 * ONLY deposit_type/deposit_value (no pricing fields) never runs that block —
 * updates.total_cents stays undefined, so the deposit block does its OWN read
 * of total_cents with no CAS guard at all. A concurrent pricing edit (line-item
 * add, discount change) that lands between that read and this write bumps
 * total_cents, but this write still goes through and stores deposit_cents
 * computed off the OLD total — silently wrong, no error to either side.
 *
 * FIX: the deposit block's stale read now also captures updated_at (when the
 * pricing block above didn't already set it) and the same
 * eq('updated_at', ...) CAS guard on the final write covers this path too.
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
        deposit_type: 'none', deposit_value: 0, deposit_cents: 0, updated_at: 'T0',
      },
    ],
    clients: [],
  }
}

let h: Harness
let raceOnNextDepositRead = false

beforeEach(() => {
  h = createTenantDbHarness(seed())
  raceOnNextDepositRead = false
  holder.from = (table: string) => {
    const chain = h.from(table)
    if (table === 'quotes') {
      const origSelect = chain.select
      chain.select = (columns?: unknown, opts?: unknown) => {
        const result = origSelect(columns, opts)
        if (raceOnNextDepositRead && typeof columns === 'string' && columns === 'total_cents, updated_at') {
          const origSingle = result.single
          result.single = async () => {
            const r = await origSingle()
            // Simulate a concurrent PATCH (e.g. adding a line item) landing
            // between OUR read of total_cents (10000) and our eventual write —
            // total_cents jumps to 50000 and updated_at is bumped by the
            // real quotes_set_updated_at trigger.
            const rows = h.seed.quotes as Record<string, unknown>[]
            const idx = rows.findIndex((x) => x.id === QUOTE_ID)
            if (idx >= 0) rows[idx] = { ...rows[idx], total_cents: 50000, updated_at: 'T1-CONCURRENT-WRITE' }
            raceOnNextDepositRead = false
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

describe('PATCH /api/quotes/[id] — deposit derived-from-stale-total race', () => {
  it('deposit-only edit succeeds normally and computes off the current total', async () => {
    const res = await patch({ deposit_type: 'percent', deposit_value: 2000 })
    expect(res.status).toBe(200)
    expect(stored('deposit_cents')).toBe(2000) // 20% of 10000
  })

  it('a deposit-only write based on a stale total_cents read is rejected (409) instead of silently storing a wrong deposit_cents', async () => {
    raceOnNextDepositRead = true
    const res = await patch({ deposit_type: 'percent', deposit_value: 2000 })
    expect(res.status).toBe(409)

    // The concurrent write's total_cents/updated_at survive untouched, and
    // our stale-based deposit_cents (which would have been 2000, 20% of the
    // OLD 10000 total) never landed.
    expect(stored('total_cents')).toBe(50000)
    expect(stored('updated_at')).toBe('T1-CONCURRENT-WRITE')
    expect(stored('deposit_cents')).toBe(0)
  })

  it('a combined pricing + deposit edit computes deposit off the freshly-recomputed total (single read, no extra race window)', async () => {
    const res = await patch({
      line_items: [{ id: 'li_0', name: 'Original item', quantity: 1, unit_price_cents: 40000, subtotal_cents: 40000, selected: true }],
      deposit_type: 'percent',
      deposit_value: 2000,
    })
    expect(res.status).toBe(200)
    expect(stored('total_cents')).toBe(40000)
    expect(stored('deposit_cents')).toBe(8000) // 20% of the just-recomputed 40000
  })
})
