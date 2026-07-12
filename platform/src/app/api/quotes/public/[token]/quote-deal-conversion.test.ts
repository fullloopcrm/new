/**
 * Happy-path test: accepting a public quote converts its linked DEAL
 * (P1/W1 queue item c).
 *
 * Drives the REAL POST /api/quotes/public/[token]/accept handler against one
 * shared in-memory Supabase fake (same pattern as
 * lead/lead-capture-attribution.test.ts). Focus is the quote → deal transition:
 * a signed, no-deposit acceptance advances the open deal to SOLD and writes the
 * stage-change + note activity — tenant-scoped.
 *
 * The best-effort fulfillment side effects (job/recurring conversion, notify,
 * owner alert) are stubbed so the test isolates the deal conversion, not
 * delivery. logQuoteEvent runs for real against the fake.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeSupabaseFake } from '@/test/supabase-fake'

// ── shared mutable store, hoisted so vi.mock factories can reach it ──
const h = vi.hoisted(() => ({ seq: 0, store: {} as Record<string, Array<Record<string, unknown>>> }))

// Detached reads: the accept route updates a deal then re-reads dealRow.stage for
// the activity metadata; PostgREST hands back JSON, never a live row.
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: makeSupabaseFake(h, { detachReads: true }),
  supabase: makeSupabaseFake(h, { detachReads: true }),
}))
// Best-effort side effects — stub so the test isolates the deal conversion.
vi.mock('@/lib/jobs', () => ({ convertSaleToJob: async () => ({ job_id: 'job-x' }) }))
vi.mock('@/lib/notify', () => ({ notify: async () => {} }))
vi.mock('@/lib/messaging/owner-alerts', () => ({ ownerAlert: async () => {} }))

import { POST } from './accept/route'

const TENANT = 'tenant-A'
const OTHER = 'tenant-B'
const TOKEN = 'tok-quote-1'
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
  h.store = {
    quotes: [
      {
        id: 'q1', tenant_id: TENANT, public_token: TOKEN, status: 'sent', deal_id: 'deal-1',
        deposit_cents: 0, total_cents: 30000, quote_number: 'Q-202607-0001', contact_email: 'jane@x.com',
      },
    ],
    deals: [
      { id: 'deal-1', tenant_id: TENANT, stage: 'qualifying', probability: 40 },
      { id: 'deal-2', tenant_id: OTHER, stage: 'qualifying', probability: 40 }, // another tenant — must not move
    ],
    deal_activities: [],
    quote_activity: [],
  }
})

describe('quote acceptance → deal conversion (happy path)', () => {
  it('advances the linked open deal to SOLD with value + close time', async () => {
    const res = await POST(acceptReq({ signature_png: SIGNATURE, signature_name: 'Jane Doe' }), params)
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({ ok: true })

    const quote = h.store.quotes[0]
    expect(quote.status).toBe('accepted')
    expect(quote.signature_name).toBe('Jane Doe')

    const deal = h.store.deals.find((d) => d.id === 'deal-1')!
    expect(deal.stage).toBe('sold')
    expect(deal.probability).toBe(100)
    expect(deal.value_cents).toBe(30000)
    expect(deal.closed_at).toBeTruthy()
  })

  it('writes tenant-scoped stage-change + note activities and logs the accept', async () => {
    await POST(acceptReq({ signature_png: SIGNATURE, signature_name: 'Jane Doe' }), params)

    const acts = h.store.deal_activities.filter((a) => a.deal_id === 'deal-1')
    expect(acts).toHaveLength(2)
    expect(acts.every((a) => a.tenant_id === TENANT)).toBe(true)
    expect(acts).toContainEqual(
      expect.objectContaining({ type: 'stage_change', metadata: expect.objectContaining({ from: 'qualifying', to: 'sold' }) }),
    )
    expect(acts.some((a) => a.type === 'note')).toBe(true)

    expect(h.store.quote_activity).toContainEqual(
      expect.objectContaining({ quote_id: 'q1', tenant_id: TENANT, event_type: 'accepted' }),
    )
  })

  it("never touches another tenant's deal", async () => {
    await POST(acceptReq({ signature_png: SIGNATURE, signature_name: 'Jane Doe' }), params)

    const other = h.store.deals.find((d) => d.id === 'deal-2')!
    expect(other.stage).toBe('qualifying') // unchanged
    expect(h.store.deal_activities.some((a) => a.deal_id === 'deal-2')).toBe(false)
  })

  it('is idempotent — replaying an accepted quote does not re-convert', async () => {
    await POST(acceptReq({ signature_png: SIGNATURE, signature_name: 'Jane Doe' }), params)
    const activityCount = h.store.deal_activities.length

    const res2 = await POST(acceptReq({ signature_png: SIGNATURE, signature_name: 'Jane Doe' }), params)
    expect(res2.status).toBe(200)
    await expect(res2.json()).resolves.toMatchObject({ ok: true, already_accepted: true })
    // no new deal activity on replay
    expect(h.store.deal_activities).toHaveLength(activityCount)
  })
})
