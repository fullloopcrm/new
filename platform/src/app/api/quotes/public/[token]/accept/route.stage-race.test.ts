/**
 * POST /api/quotes/public/[token]/accept — TOCTOU race on the linked deal's
 * best-effort stage sync.
 *
 * The route reads `dealRow.stage` once, gates on it being an open stage, then
 * unconditionally UPDATEs the deal with no re-check in the write's own WHERE
 * clause. A concurrent stage change on the SAME deal — an admin dragging the
 * kanban card via POST /api/deals/[id]/stage, or Selena's update_deal tool —
 * landing between that read and this write used to let a slow-signing
 * customer's accept silently clobber it: an admin marks the deal 'lost'
 * while the request is mid-flight, and this route would still flip it back
 * to 'sold'/'pending', overwriting the lost decision and logging a stage
 * change that never should have happened.
 *
 * FIX: re-assert the pre-read stage in the write's own WHERE against the
 * CURRENT DB row. Zero rows matched -> skip the deal sync (best-effort, the
 * customer's accept itself must still succeed) instead of clobbering it.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

vi.mock('@/lib/quote', () => ({ logQuoteEvent: vi.fn(async () => {}) }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => ({ success: true })) }))
vi.mock('@/lib/messaging/owner-alerts', () => ({ ownerAlert: vi.fn(async () => {}) }))
vi.mock('@/lib/jobs', () => ({ convertSaleToJob: vi.fn(async () => ({ job_id: 'job-x' })) }))

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle

/** Set by a test to inject a concurrent stage change right after the route's
 *  own dealRow SELECT resolves -- the exact TOCTOU gap this fix closes. */
const afterDealRead = vi.hoisted(() => ({ fn: null as (() => void) | null }))

vi.mock('@/lib/supabase', () => {
  const raw = makeTenantDbFake(h)
  const fake = {
    from(table: string) {
      const chain = raw.from(table) as Record<string, unknown>
      if (table !== 'deals') return chain
      const origMaybeSingle = chain.maybeSingle as () => Promise<unknown>
      chain.maybeSingle = () =>
        origMaybeSingle().then((res) => {
          afterDealRead.fn?.()
          afterDealRead.fn = null
          return res
        })
      return chain
    },
  }
  return { supabaseAdmin: fake, supabase: fake }
})

import { POST } from './route'

const TENANT = 'tenant-A'
const TOKEN = 'tok-quote-race'
const SIGNATURE = 'data:image/png;base64,' + 'A'.repeat(160)

const acceptReq = (body: unknown) =>
  new Request(`http://acme.example.com/api/quotes/public/${TOKEN}/accept`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.9', 'user-agent': 'vitest' },
    body: JSON.stringify(body),
  })
const params = { params: Promise.resolve({ token: TOKEN }) }

beforeEach(() => {
  h.seq = 0
  afterDealRead.fn = null
  h.store = {
    quotes: [
      {
        id: 'q1', tenant_id: TENANT, public_token: TOKEN, status: 'sent', deal_id: 'deal-1',
        deposit_cents: 0, total_cents: 30000, quote_number: 'Q-202607-0001', contact_email: 'jane@x.com',
      },
    ],
    deals: [{ id: 'deal-1', tenant_id: TENANT, stage: 'qualifying', probability: 40 }],
    deal_activities: [],
    quote_activity: [],
  }
})

describe('POST /api/quotes/public/[token]/accept — concurrent deal-stage-change race', () => {
  it('does not clobber a deal an admin just moved to lost while the accept was in flight', async () => {
    // Concurrent write: an admin drags the kanban card to 'lost' right after
    // this route's own dealRow read.
    afterDealRead.fn = () => {
      h.store.deals[0] = { ...h.store.deals[0], stage: 'lost' }
    }

    const res = await POST(acceptReq({ signature_png: SIGNATURE, signature_name: 'Jane Doe' }), params)
    const json = await res.json()

    // The customer's own accept must still succeed...
    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
    expect(h.store.quotes[0].status).toBe('accepted')
    // ...but the deal sync is skipped, not clobbered.
    expect(h.store.deals[0].stage).toBe('lost')
    expect(h.store.deal_activities).toHaveLength(0)
  })

  it('still advances the deal to sold when no concurrent change lands (no regression)', async () => {
    const res = await POST(acceptReq({ signature_png: SIGNATURE, signature_name: 'Jane Doe' }), params)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
    expect(h.store.deals[0].stage).toBe('sold')
    expect(h.store.deal_activities.filter((a) => a.deal_id === 'deal-1')).toHaveLength(2)
  })
})
