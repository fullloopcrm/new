/**
 * PATCH /api/jobs/[id]/sessions/[sessionId] — TOCTOU race with a concurrent
 * status change on the underlying booking.
 *
 * `loadOwnedSession` reads `current.status` once, `didComplete` is derived
 * from that stale value, then the route unconditionally UPDATEs the booking
 * with no re-check in the write's own WHERE clause. A concurrent status
 * change -- a cancel via the admin /api/bookings/[id] route, a customer
 * cancel via the portal, or a second completion of this same session --
 * landing between that read and this write used to get silently clobbered:
 * e.g. force-completing (and releasing payment for) a session someone just
 * cancelled.
 *
 * FIX: re-assert the pre-read status in the write's own WHERE against the
 * CURRENT DB row. Zero rows matched -> 409 instead of silently clobbering
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
 *  loadOwnedSession() SELECT resolves -- the exact TOCTOU gap this fix closes. */
const afterInitialRead = vi.hoisted(() => ({ fn: null as (() => void) | null }))

vi.mock('@/lib/supabase', () => {
  const raw = makeSupabaseFake(h, { detachReads: true })
  const fake = {
    from(table: string) {
      const chain = raw.from(table) as Record<string, unknown>
      if (table !== 'bookings') return chain
      const origSingle = chain.single as () => Promise<unknown>
      let intercepted = false
      chain.single = () =>
        origSingle().then((res) => {
          // Only the first `.single()` call on `bookings` is the initial
          // loadOwnedSession read -- don't refire on later calls in the flow.
          if (!intercepted) {
            intercepted = true
            afterInitialRead.fn?.()
            afterInitialRead.fn = null
          }
          return res
        })
      return chain
    },
  }
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-permission', () => ({ requirePermission: (...a: unknown[]) => h.requirePermission(...a) }))
vi.mock('@/lib/jobs', async () => {
  const actual = await vi.importActual<typeof import('@/lib/jobs')>('@/lib/jobs')
  return { ...actual, logJobEvent: vi.fn(async () => {}), releasePaymentsForEvent: vi.fn(async () => 0) }
})

import { PATCH } from './route'

const TENANT_ID = 'tenant-A'
const JOB_ID = 'job-1'
const SESSION_ID = 'book-1'

const patchReq = (body: unknown) => new Request('http://x', { method: 'PATCH', body: JSON.stringify(body) })
const params = (id: string, sessionId: string) => ({ params: Promise.resolve({ id, sessionId }) })

beforeEach(() => {
  h.seq = 0
  h.requirePermission.mockReset()
  h.requirePermission.mockImplementation(async () => ({ tenant: { tenantId: TENANT_ID }, error: null }))
  afterInitialRead.fn = null
})

describe('PATCH /api/jobs/[id]/sessions/[sessionId] — concurrent-status-change race', () => {
  it('refuses to force-complete (and release payment for) a session cancelled concurrently', async () => {
    h.store = {
      bookings: [
        { id: SESSION_ID, tenant_id: TENANT_ID, job_id: JOB_ID, status: 'confirmed', start_time: '2026-08-01T09:00:00', end_time: '2026-08-01T11:00:00', notes: 'Original' },
      ],
    }
    afterInitialRead.fn = () => {
      h.store.bookings[0] = { ...h.store.bookings[0], status: 'cancelled' }
    }

    const res = await PATCH(patchReq({ status: 'completed' }), params(JOB_ID, SESSION_ID))
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.error).toMatch(/concurrently/i)
    expect(h.store.bookings[0].status).toBe('cancelled')
  })

  it('refuses a reschedule landing after a concurrent cancel, instead of silently moving a cancelled session', async () => {
    h.store = {
      bookings: [
        { id: SESSION_ID, tenant_id: TENANT_ID, job_id: JOB_ID, status: 'confirmed', start_time: '2026-08-01T09:00:00', end_time: '2026-08-01T11:00:00', notes: 'Original' },
      ],
    }
    afterInitialRead.fn = () => {
      h.store.bookings[0] = { ...h.store.bookings[0], status: 'cancelled' }
    }

    const res = await PATCH(patchReq({ start_time: '2026-08-02T09:00:00' }), params(JOB_ID, SESSION_ID))
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.error).toMatch(/concurrently/i)
    expect(h.store.bookings[0].start_time).toBe('2026-08-01T09:00:00')
  })

  it('still edits a session whose status did not change concurrently (no regression)', async () => {
    h.store = {
      bookings: [
        { id: SESSION_ID, tenant_id: TENANT_ID, job_id: JOB_ID, status: 'confirmed', start_time: '2026-08-01T09:00:00', end_time: '2026-08-01T11:00:00', notes: 'Original' },
      ],
    }

    const res = await PATCH(patchReq({ notes: 'Edited normally' }), params(JOB_ID, SESSION_ID))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.session.notes).toBe('Edited normally')
  })

  it('returns 404 for a session that does not exist (unchanged behavior)', async () => {
    h.store = { bookings: [] }

    const res = await PATCH(patchReq({ notes: 'x' }), params(JOB_ID, 'nope'))

    expect(res.status).toBe(404)
  })
})
