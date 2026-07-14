/**
 * POST /api/quotes/public/[token]/decline — TOCTOU (sibling of the
 * accept route's same class, W4's finding on p1-w4 commit 087de982).
 * Plain SELECT-then-branch on quotes.status, then an unconditional UPDATE
 * with no compare-and-swap and no already-declined short-circuit — this
 * route wasn't even idempotent on a plain sequential resubmit, let alone
 * concurrent double-taps: every replay re-inserted a deal_activities note
 * and re-fired the owner notification (notify + ownerAlert).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeSupabaseFake } from '@/test/supabase-fake'

const h = vi.hoisted(() => ({ seq: 0, store: {} as Record<string, Array<Record<string, unknown>>> }))

vi.mock('@/lib/supabase', () => {
  const fake = makeSupabaseFake(h, { detachReads: true })
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/quote', () => ({ logQuoteEvent: vi.fn(async () => {}) }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/messaging/owner-alerts', () => ({ ownerAlert: vi.fn(async () => {}) }))

import { POST } from './route'
import { notify } from '@/lib/notify'
import { ownerAlert } from '@/lib/messaging/owner-alerts'

const TOKEN = 'tok-quote-1'
const declineReq = (body: unknown = {}) =>
  new Request(`http://acme.example.com/api/quotes/public/${TOKEN}/decline`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.9', 'user-agent': 'vitest' },
    body: JSON.stringify(body),
  })
const params = { params: Promise.resolve({ token: TOKEN }) }

beforeEach(() => {
  vi.mocked(notify).mockClear()
  vi.mocked(ownerAlert).mockClear()
  h.seq = 0
  h.store = {
    quotes: [{ id: 'q1', tenant_id: 'tenant-A', public_token: TOKEN, status: 'sent', quote_number: 'Q-1', deal_id: 'deal-1' }],
    deal_activities: [],
    quote_activity: [],
  }
})

describe('POST /api/quotes/public/[token]/decline', () => {
  it('declines a sent quote', async () => {
    const res = await POST(declineReq({ reason: 'too expensive' }), params)
    expect(res.status).toBe(200)
    expect(h.store.quotes[0].status).toBe('declined')
    expect(h.store.quotes[0].declined_reason).toBe('too expensive')
  })

  it('replaying an already-declined quote is idempotent — no duplicate activity or notification', async () => {
    await POST(declineReq({ reason: 'x' }), params)
    const activityCount = h.store.deal_activities.length

    const res2 = await POST(declineReq({ reason: 'x' }), params)

    expect(res2.status).toBe(200)
    await expect(res2.json()).resolves.toMatchObject({ ok: true, already_declined: true })
    expect(h.store.deal_activities).toHaveLength(activityCount)
    expect(notify).toHaveBeenCalledTimes(1)
    expect(ownerAlert).toHaveBeenCalledTimes(1)
  })

  it('a double-tapped Decline button (2 concurrent requests) only declines once', async () => {
    const [res1, res2] = await Promise.all([POST(declineReq({ reason: 'x' }), params), POST(declineReq({ reason: 'x' }), params)])
    const bodies = await Promise.all([res1.json(), res2.json()])

    const winners = bodies.filter((b) => !b.already_declined)
    const losers = bodies.filter((b) => b.already_declined)
    expect(winners).toHaveLength(1)
    expect(losers).toHaveLength(1)

    expect(h.store.deal_activities).toHaveLength(1)
    expect(notify).toHaveBeenCalledTimes(1)
    expect(ownerAlert).toHaveBeenCalledTimes(1)
  })

  it('rejects declining an already-accepted quote', async () => {
    h.store.quotes[0].status = 'accepted'
    const res = await POST(declineReq({}), params)
    expect(res.status).toBe(400)
  })
})
