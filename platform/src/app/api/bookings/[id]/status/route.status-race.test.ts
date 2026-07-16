/**
 * PATCH /api/bookings/[id]/status — TOCTOU race with a concurrent status
 * change on the same booking.
 *
 * The route reads `booking.status` once, validates the requested transition
 * against VALID_TRANSITIONS for that stale status, then unconditionally
 * UPDATEs with no re-check in the write's own WHERE clause. A concurrent
 * status change — PUT /api/bookings/[id], the portal's PUT
 * /api/portal/bookings/[id], or a payment webhook — landing between that read
 * and this write used to let this route silently apply a transition that was
 * only ever valid from the STALE status, not the booking's actual current
 * status (e.g. reads 'confirmed', concurrent write moves it to 'in_progress',
 * this route still applies 'no_show' — not a valid in_progress->no_show
 * transition — and the audit log records a false `from: confirmed`).
 *
 * FIX: re-assert the pre-read status in the write's own WHERE against the
 * CURRENT DB row. Zero rows matched -> 409 instead of silently overwriting
 * the concurrent change.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeSupabaseFake } from '@/test/supabase-fake'

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  requirePermission: vi.fn(),
}))

/** Set by a test to inject a concurrent write right after the route's own
 *  booking SELECT resolves -- the exact TOCTOU gap this fix closes. */
const afterInitialRead = vi.hoisted(() => ({ fn: null as (() => void) | null }))

vi.mock('@/lib/supabase', () => {
  const raw = makeSupabaseFake(h, { detachReads: true })
  const fake = {
    from(table: string) {
      const chain = raw.from(table) as Record<string, unknown>
      if (table !== 'bookings') return chain
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
vi.mock('@/lib/require-permission', () => ({ requirePermission: (...a: unknown[]) => h.requirePermission(...a) }))
vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => {}) }))

import { PATCH } from './route'

const TENANT_ID = 'tenant-A'
const BOOKING_ID = 'book-1'

const patchReq = (body: unknown) => new Request('http://x', { method: 'PATCH', body: JSON.stringify(body) })
const params = (id: string) => ({ params: Promise.resolve({ id }) })

beforeEach(() => {
  h.seq = 0
  h.requirePermission.mockReset()
  h.requirePermission.mockImplementation(async () => ({ tenant: { tenantId: TENANT_ID }, error: null }))
  afterInitialRead.fn = null
})

describe('PATCH /api/bookings/[id]/status — concurrent-status-change race', () => {
  it('refuses to apply a transition that is no longer valid once a concurrent change lands, instead of clobbering it', async () => {
    h.store = {
      bookings: [{ id: BOOKING_ID, tenant_id: TENANT_ID, status: 'confirmed' }],
      deals: [],
    }
    // Concurrent write moves the booking to in_progress right after this
    // route's own read. no_show is valid from confirmed but NOT from
    // in_progress -- a real DB-level guard must refuse this write.
    afterInitialRead.fn = () => {
      h.store.bookings[0] = { ...h.store.bookings[0], status: 'in_progress' }
    }

    const res = await PATCH(patchReq({ status: 'no_show' }), params(BOOKING_ID))
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.error).toMatch(/concurrently/i)
    expect(h.store.bookings[0].status).toBe('in_progress')
  })

  it('still transitions a booking whose status did not change concurrently (no regression)', async () => {
    h.store = {
      bookings: [{ id: BOOKING_ID, tenant_id: TENANT_ID, status: 'scheduled' }],
      deals: [],
    }

    const res = await PATCH(patchReq({ status: 'confirmed' }), params(BOOKING_ID))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.booking.status).toBe('confirmed')
    expect(h.store.bookings[0].status).toBe('confirmed')
  })

  it('returns 400 (not the race guard) for a transition invalid from the read status in the first place', async () => {
    h.store = {
      bookings: [{ id: BOOKING_ID, tenant_id: TENANT_ID, status: 'cancelled' }],
      deals: [],
    }

    const res = await PATCH(patchReq({ status: 'in_progress' }), params(BOOKING_ID))

    expect(res.status).toBe(400)
  })
})
