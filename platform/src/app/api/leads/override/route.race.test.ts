/**
 * POST /api/leads/override — manual_conversion/manual_sale toggle race.
 *
 * Both branches read manual_conversion/manual_sale once, then blind-write a
 * toggle computed from that stale snapshot with no re-assertion. A second
 * admin (or a double-tap) toggling the same lead concurrently could land in
 * the gap and silently stomp the other write -- e.g. an admin marking a lead
 * "sale" (which also flips manual_conversion true as a side effect) racing
 * against another admin's "conversion" toggle read from before that side
 * effect landed, reverting manual_conversion back to false right after the
 * sale click set it.
 *
 * FIX: re-assert the exact read values in the update's own WHERE, 409 on a
 * lost race (same CAS pattern as the rest of this sweep).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeSupabaseFake } from '@/test/supabase-fake'

const TENANT_ID = 'tenant-A'
const LEAD_ID = 'lead-1'

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  requirePermission: vi.fn(),
}))

/** Injected right after the route's own initial select resolves -- the exact
 *  TOCTOU gap this fix closes. */
const afterInitialRead = vi.hoisted(() => ({ fn: null as (() => void) | null }))

vi.mock('@/lib/supabase', () => {
  const raw = makeSupabaseFake(h, { detachReads: true })
  const fake = {
    from(table: string) {
      const chain = raw.from(table) as Record<string, unknown>
      if (table !== 'lead_clicks') return chain
      const origMaybeSingle = chain.maybeSingle as () => Promise<unknown>
      chain.maybeSingle = () =>
        origMaybeSingle().then((res) => {
          afterInitialRead.fn?.()
          afterInitialRead.fn = null
          return res
        })
      return chain
    },
  }
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-permission', () => ({ requirePermission: (...a: unknown[]) => h.requirePermission(...a) }))

import { POST } from './route'

const post = (body: Record<string, unknown>) =>
  POST(new Request('http://x', { method: 'POST', body: JSON.stringify(body) }))

beforeEach(() => {
  h.seq = 0
  h.requirePermission.mockReset()
  h.requirePermission.mockImplementation(async () => ({ tenant: { tenantId: TENANT_ID }, error: null }))
  afterInitialRead.fn = null
})

describe('POST /api/leads/override — concurrent toggle race', () => {
  it('rejects a conversion toggle once a concurrent request already changed manual_conversion', async () => {
    h.store = { lead_clicks: [{ id: LEAD_ID, tenant_id: TENANT_ID, manual_conversion: false, manual_sale: false }] }
    afterInitialRead.fn = () => {
      h.store.lead_clicks[0] = { ...h.store.lead_clicks[0], manual_conversion: true }
    }

    const res = await post({ id: LEAD_ID, type: 'conversion' })
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.error).toMatch(/concurrently/i)
    // The concurrent write is preserved, not stomped back to false.
    expect(h.store.lead_clicks[0].manual_conversion).toBe(true)
  })

  it('rejects a sale toggle once a concurrent request already changed manual_sale', async () => {
    h.store = { lead_clicks: [{ id: LEAD_ID, tenant_id: TENANT_ID, manual_conversion: false, manual_sale: false }] }
    afterInitialRead.fn = () => {
      h.store.lead_clicks[0] = { ...h.store.lead_clicks[0], manual_sale: true, manual_conversion: true }
    }

    const res = await post({ id: LEAD_ID, type: 'sale' })
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(h.store.lead_clicks[0].manual_sale).toBe(true)
    expect(h.store.lead_clicks[0].manual_conversion).toBe(true)
  })

  it('still toggles normally with no concurrent writer (no regression)', async () => {
    h.store = { lead_clicks: [{ id: LEAD_ID, tenant_id: TENANT_ID, manual_conversion: false, manual_sale: false }] }

    const res = await post({ id: LEAD_ID, type: 'conversion' })
    expect(res.status).toBe(200)
    expect(h.store.lead_clicks[0].manual_conversion).toBe(true)
  })

  it('sale toggle still auto-sets manual_conversion on the non-race path', async () => {
    h.store = { lead_clicks: [{ id: LEAD_ID, tenant_id: TENANT_ID, manual_conversion: false, manual_sale: false }] }

    const res = await post({ id: LEAD_ID, type: 'sale' })
    expect(res.status).toBe(200)
    expect(h.store.lead_clicks[0].manual_sale).toBe(true)
    expect(h.store.lead_clicks[0].manual_conversion).toBe(true)
  })
})
