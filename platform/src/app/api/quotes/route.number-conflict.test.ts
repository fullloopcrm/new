/**
 * POST /api/quotes — retry-on-conflict for quote_number.
 *
 * idx_quotes_tenant_number (026_quotes.sql) uniquely constrains
 * (tenant_id, quote_number). generateQuoteNumber() is a non-atomic
 * SELECT-count()+1 (not a DB sequence), so two concurrent creates in the
 * same tenant+month can both compute the same number and race to insert.
 * Pre-fix, the loser's raw 23505 was rethrown as an unhandled 500. This
 * verifies the route instead regenerates and retries when the collided
 * number was auto-generated, and returns a clean 409 (no silent renumbering)
 * when the caller explicitly supplied the colliding number.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const h = vi.hoisted(() => ({
  store: { quotes: [] as Array<Record<string, unknown>> },
  requirePermission: vi.fn(),
}))

function conflictError() {
  return { code: '23505', message: 'duplicate key value violates unique constraint "idx_quotes_tenant_number"' }
}

vi.mock('@/lib/supabase', () => {
  const fake = {
    from(table: string) {
      let payload: Record<string, unknown> | undefined
      const chain = {
        insert(p: Record<string, unknown>) {
          payload = p
          return chain
        },
        select: () => chain,
        eq: () => chain,
        single: async () => {
          if (table !== 'quotes') return { data: null, error: null }
          const dup = h.store.quotes.find(
            (r) => r.tenant_id === payload!.tenant_id && r.quote_number === payload!.quote_number,
          )
          if (dup) return { data: null, error: conflictError() }
          const row = { id: `quote-${h.store.quotes.length + 1}`, ...payload }
          h.store.quotes.push(row)
          return { data: row, error: null }
        },
        maybeSingle: async () => ({ data: null, error: null }),
        then: (res: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(res),
      }
      return chain
    },
  }
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-permission', () => ({ requirePermission: (...a: unknown[]) => h.requirePermission(...a) }))
vi.mock('@/lib/quote', () => ({
  normalizeLineItems: (items: unknown) => items,
  computeTotals: () => ({ subtotal_cents: 0, tax_cents: 0, discount_cents: 0, total_cents: 0 }),
  generatePublicToken: () => `tok_${Math.random()}`,
  generateQuoteNumber: vi.fn(),
  logQuoteEvent: vi.fn(async () => {}),
}))

import { POST } from './route'
import { generateQuoteNumber } from '@/lib/quote'

const TENANT_A = 'tenant-A'
const postReq = (body: unknown = {}) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  h.requirePermission.mockReset()
  h.requirePermission.mockImplementation(async () => ({ tenant: { tenantId: TENANT_A }, error: null }))
  h.store.quotes = [{ id: 'existing', tenant_id: TENANT_A, quote_number: 'Q-0001' }]
  vi.mocked(generateQuoteNumber).mockReset()
})

describe('POST /api/quotes — quote_number conflict handling', () => {
  it('regenerates and retries when an auto-generated quote_number collides', async () => {
    vi.mocked(generateQuoteNumber)
      .mockResolvedValueOnce('Q-0001') // collides with the seeded row
      .mockResolvedValueOnce('Q-0002') // retry succeeds

    const res = await POST(postReq())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.quote.quote_number).toBe('Q-0002')
    expect(h.store.quotes).toHaveLength(2)
    expect(generateQuoteNumber).toHaveBeenCalledTimes(2)
  })

  it('returns 409 without renumbering when the caller explicitly supplies a colliding quote_number', async () => {
    const res = await POST(postReq({ quote_number: 'Q-0001' }))

    expect(res.status).toBe(409)
    expect(h.store.quotes).toHaveLength(1)
    expect(generateQuoteNumber).not.toHaveBeenCalled()
  })
})
