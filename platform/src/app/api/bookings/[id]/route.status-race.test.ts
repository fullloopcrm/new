/**
 * PUT /api/bookings/[id] — TOCTOU race with a concurrent status change.
 *
 * The route reads `oldBooking.status` once (for notification-diffing only),
 * then unconditionally UPDATEs with no re-check in the write's own WHERE
 * clause. A concurrent status change -- a customer cancelling via
 * /api/portal/bookings/[id], the dedicated PATCH /api/bookings/[id]/status
 * transition, or a payment webhook -- landing between that read and this
 * write used to get silently clobbered by this blind update (which may
 * itself carry a stale `status` from the same snapshot in its own payload).
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
 *  oldBooking SELECT resolves -- the exact TOCTOU gap this fix closes. */
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
vi.mock('@/lib/availability', () => ({ checkMemberDayOff: vi.fn(async () => ({ unavailable: false })) }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => ({ ok: true })) }))
vi.mock('@/lib/sms-templates', () => ({ smsJobAssignment: () => 'assigned' }))
vi.mock('@/lib/messaging/client-sms', () => ({
  clientSmsTemplatesFor: async () => ({ bookingConfirmation: () => '', reschedule: () => '', cancellation: () => '' }),
}))
vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => {}) }))

import { PUT } from './route'

const TENANT_ID = 'tenant-A'
const BOOKING_ID = 'book-1'

const putReq = (body: unknown) => new Request('http://x', { method: 'PUT', body: JSON.stringify(body) })
const params = (id: string) => ({ params: Promise.resolve({ id }) })

beforeEach(() => {
  h.seq = 0
  h.requirePermission.mockReset()
  h.requirePermission.mockImplementation(async () => ({ tenant: { tenantId: TENANT_ID }, error: null }))
  afterInitialRead.fn = null
})

describe('PUT /api/bookings/[id] — concurrent-status-change race', () => {
  it('refuses to overwrite a booking cancelled concurrently, instead of clobbering it', async () => {
    h.store = {
      bookings: [{ id: BOOKING_ID, tenant_id: TENANT_ID, status: 'scheduled', client_id: null, team_member_id: null, start_time: '2026-08-01T09:00:00', notes: 'Original' }],
      tenants: [{ id: TENANT_ID, name: 'Acme', telnyx_api_key: null, telnyx_phone: null }],
    }
    afterInitialRead.fn = () => {
      h.store.bookings[0] = { ...h.store.bookings[0], status: 'cancelled' }
    }

    const res = await PUT(putReq({ notes: 'Edited after the fact', status: 'scheduled' }), params(BOOKING_ID))
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.error).toMatch(/concurrently/i)
    expect(h.store.bookings[0].notes).toBe('Original')
    expect(h.store.bookings[0].status).toBe('cancelled')
  })

  it('still edits a booking whose status did not change concurrently (no regression)', async () => {
    h.store = {
      bookings: [{ id: BOOKING_ID, tenant_id: TENANT_ID, status: 'scheduled', client_id: null, team_member_id: null, start_time: '2026-08-01T09:00:00', notes: 'Original' }],
      tenants: [{ id: TENANT_ID, name: 'Acme', telnyx_api_key: null, telnyx_phone: null }],
    }

    const res = await PUT(putReq({ notes: 'Edited normally' }), params(BOOKING_ID))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.booking.notes).toBe('Edited normally')
  })

  it('returns 404 for a booking that does not exist (previously fell through to a raw update error)', async () => {
    h.store = { bookings: [], tenants: [{ id: TENANT_ID, name: 'Acme', telnyx_api_key: null, telnyx_phone: null }] }

    const res = await PUT(putReq({ notes: 'x' }), params('nope'))

    expect(res.status).toBe(404)
  })
})
