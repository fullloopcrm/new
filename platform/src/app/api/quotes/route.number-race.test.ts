/**
 * QUOTE NUMBER RACE — POST /api/quotes number-generation TOCTOU.
 *
 * generateQuoteNumber() derives the next quote_number from a COUNT()
 * snapshot of the tenant's quotes this month (src/lib/quote.ts). Two
 * concurrent creates that both read the same count compute the SAME
 * quote_number; the (tenant_id, quote_number) unique index then rejects the
 * second insert outright (026_quotes.sql idx_quotes_tenant_number), so a
 * legitimate concurrent request 500'd instead of just getting the next
 * number. Same shape as the sibling invoices race, see
 * invoices/route.number-race.test.ts.
 *
 * Fix: on a 23505 unique violation, retry with a freshly generated number
 * (only when the caller didn't explicitly supply quote_number).
 */
import { describe, it, expect, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

const TENANT_ID = 'tenant-1'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  fake._addUniqueConstraint('quotes', 'quote_number')
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT_ID }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))

let generateCalls = 0
vi.mock('@/lib/quote', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/quote')>()
  return {
    ...original,
    generateQuoteNumber: vi.fn(async () => {
      generateCalls++
      if (generateCalls === 1) {
        // Simulate a concurrent request's insert landing in the exact
        // count-read -> insert window this generator has no lock across.
        const { supabaseAdmin } = await import('@/lib/supabase')
        await (supabaseAdmin as unknown as FakeSupabase).from('quotes').insert({
          tenant_id: TENANT_ID,
          quote_number: 'Q-RACE-0001',
          status: 'draft',
        })
        return 'Q-RACE-0001'
      }
      return 'Q-RACE-0002'
    }),
  }
})

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

function createRequest(body: Record<string, unknown> = {}) {
  return new Request('http://x/api/quotes', { method: 'POST', body: JSON.stringify(body) })
}

describe('POST /api/quotes — quote_number generation race', () => {
  it('retries with a fresh number instead of 500ing on a concurrent-number collision', async () => {
    const res = await POST(
      createRequest({ line_items: [{ name: 'Test', quantity: 1, unit_price_cents: 1000 }] }),
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.error).toBeUndefined()
    expect(body.quote.quote_number).toBe('Q-RACE-0002')

    const quotes = fake._all('quotes')
    expect(quotes.length).toBe(2) // the "concurrent winner" + this request's own row
    const numbers = quotes.map((q) => q.quote_number)
    expect(new Set(numbers).size).toBe(2) // no duplicate quote_number made it into the store
  })

  it('does not retry when the caller explicitly supplies quote_number (real conflict surfaces as an error)', async () => {
    fake._seed('quotes', [{ tenant_id: TENANT_ID, quote_number: 'Q-MANUAL-0001', status: 'draft' }])

    const res = await POST(
      createRequest({
        quote_number: 'Q-MANUAL-0001',
        line_items: [{ name: 'Test', quantity: 1, unit_price_cents: 1000 }],
      }),
    )
    expect(res.status).toBe(500)
  })
})
