/**
 * PATCH + DELETE /api/quotes/[id] — TOCTOU race with a concurrent customer
 * accept.
 *
 * Both routes read `status` once, then unconditionally UPDATE/DELETE with no
 * re-check in the write's own WHERE clause. The public accept route (POST
 * /api/quotes/public/[token]/accept) is itself CAS-guarded and always wins a
 * true race — but without re-asserting the editable-status set here too, a
 * concurrent accept landing between this route's read and its write still
 * gets silently clobbered: PATCH would overwrite the line_items/totals/
 * deposit a customer just signed off on (out from under the deal/booking
 * accept just created from the ORIGINAL values); DELETE would erase the
 * quote record entirely.
 *
 * FIX: both re-assert the editable-status set (everything except
 * accepted/converted) in the write's own WHERE against the CURRENT DB row.
 * If the accept won the race, zero rows match and the route returns 409
 * instead of silently clobbering/erasing an accepted quote.
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

/** Set by a test to inject a concurrent write right after the route's own
 *  initial SELECT resolves — the exact TOCTOU gap this fix closes. */
const afterInitialRead = vi.hoisted(() => ({ fn: null as (() => void) | null }))

vi.mock('@/lib/supabase', () => {
  const raw = makeSupabaseFake(h, { detachReads: true })
  const fake = {
    from(table: string) {
      const chain = raw.from(table) as Record<string, unknown>
      if (table !== 'quotes') return chain
      const origSingle = chain.single as () => Promise<unknown>
      chain.single = () =>
        origSingle().then((res) => {
          afterInitialRead.fn?.()
          afterInitialRead.fn = null
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
  computeTotals: () => ({ subtotal_cents: 0, tax_cents: 0, discount_cents: 0, total_cents: 0 }),
  logQuoteEvent: vi.fn(async () => {}),
}))

import { PATCH, DELETE } from './route'

const patchReq = (body: unknown) => new Request('http://x', { method: 'PATCH', body: JSON.stringify(body) })
const delReq = () => new Request('http://x', { method: 'DELETE' })
const params = (id: string) => ({ params: Promise.resolve({ id }) })

beforeEach(() => {
  h.seq = 0
  h.getTenantForRequest.mockReset()
  h.getTenantForRequest.mockImplementation(async () => ({ tenantId: TENANT_ID, role: 'owner' }))
  afterInitialRead.fn = null
})

describe('PATCH /api/quotes/[id] — concurrent-accept race', () => {
  it('refuses to edit once the quote was accepted concurrently, instead of overwriting it', async () => {
    h.store = {
      quotes: [{ id: QUOTE_ID, tenant_id: TENANT_ID, status: 'sent', title: 'Original title' }],
    }
    afterInitialRead.fn = () => {
      h.store.quotes[0] = { ...h.store.quotes[0], status: 'accepted' }
    }

    const res = await PATCH(patchReq({ title: 'Edited after the fact' }), params(QUOTE_ID))
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.error).toMatch(/concurrently/i)
    expect(h.store.quotes[0].title).toBe('Original title')
    expect(h.store.quotes[0].status).toBe('accepted')
  })

  it('still edits a genuinely editable quote (no regression on the non-race path)', async () => {
    h.store = {
      quotes: [{ id: QUOTE_ID, tenant_id: TENANT_ID, status: 'sent', title: 'Original title' }],
    }
    const res = await PATCH(patchReq({ title: 'Edited normally' }), params(QUOTE_ID))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.quote.title).toBe('Edited normally')
  })
})

describe('DELETE /api/quotes/[id] — concurrent-accept race', () => {
  it('refuses to delete once the quote was accepted concurrently, instead of erasing it', async () => {
    h.store = {
      quotes: [{ id: QUOTE_ID, tenant_id: TENANT_ID, status: 'sent' }],
    }
    afterInitialRead.fn = () => {
      h.store.quotes[0] = { ...h.store.quotes[0], status: 'accepted' }
    }

    const res = await DELETE(delReq(), params(QUOTE_ID))
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.error).toMatch(/concurrently/i)
    expect(h.store.quotes).toHaveLength(1)
    expect(h.store.quotes[0].status).toBe('accepted')
  })

  it('still deletes a genuinely editable quote (no regression on the non-race path)', async () => {
    h.store = {
      quotes: [{ id: QUOTE_ID, tenant_id: TENANT_ID, status: 'sent' }],
    }
    const res = await DELETE(delReq(), params(QUOTE_ID))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
    expect(h.store.quotes).toHaveLength(0)
  })
})
