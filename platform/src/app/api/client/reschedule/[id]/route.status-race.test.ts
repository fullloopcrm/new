/**
 * PUT /api/client/reschedule/[id] — the sibling PUT /api/portal/bookings/[id]
 * (same operation: a customer moving their own booking's start/end time, just
 * on the token-auth portal surface instead of this cookie-auth tenant-site
 * surface) already re-asserts the pre-read status in its UPDATE's own WHERE,
 * with the comment: "an admin can move this booking to a terminal state
 * (completed, paid, no_show) between that read and this write. Without
 * re-asserting the pre-read status in THIS update's own WHERE, a customer's
 * in-flight reschedule/cancel would silently revert whatever the admin just
 * set." This route reads `oldBooking` too, but never carried the same fix —
 * a customer's reschedule could silently clobber a concurrent admin/cleaner
 * status change (e.g. a cleaner checking in) with no re-check at all.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

process.env.PORTAL_SECRET = 'portal-test-secret'

/** Set by a test to inject a concurrent write right after the route's own
 *  oldBooking SELECT resolves -- the exact TOCTOU gap this fix closes. */
const afterInitialRead = vi.hoisted(() => ({ fn: null as (() => void) | null }))

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const raw = createFakeSupabase()
  const fake = {
    ...raw,
    from(table: string) {
      const fromChain = raw.from(table) as unknown as Record<string, unknown>
      if (table !== 'bookings') return fromChain
      // fake-supabase's FromBuilder.select() returns a FRESH QueryBuilder
      // instance each call (not `this`) -- wrapping `.single` on the
      // FromBuilder itself would never fire, since the route calls
      // `.select().eq().eq().single()` on that separate instance. Wrap the
      // QueryBuilder .select() actually returns instead.
      const origSelect = fromChain.select as (...a: unknown[]) => Record<string, unknown>
      fromChain.select = (...a: unknown[]) => {
        const qb = origSelect.call(fromChain, ...a)
        const origSingle = qb.single as () => Promise<unknown>
        qb.single = () =>
          origSingle.call(qb).then((res: unknown) => {
            afterInitialRead.fn?.()
            afterInitialRead.fn = null
            return res
          })
        return qb
      }
      return fromChain
    },
  }
  return { supabase: fake, supabaseAdmin: fake, __fake: raw }
})

vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: async () => ({ id: TENANT_ID, timezone: 'America/New_York', name: 'Test Co' }),
}))

vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/notify-team-member', () => ({ notifyTeamMember: vi.fn().mockResolvedValue(undefined) }))

let cookieJar = new Map<string, { value: string }>()
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => cookieJar.get(name),
  }),
}))

import * as supabaseModule from '@/lib/supabase'
import { createClientSession } from '@/lib/client-auth'
import { PUT } from './route'

const fake = (supabaseModule as unknown as { __fake: FakeSupabase }).__fake

const TENANT_ID = 'tenant-1'
const CLIENT_ID = 'client-owner'
const BOOKING_ID = 'bk-a'

function seed(status = 'scheduled') {
  fake._store.clear()
  fake._seed('clients', [
    { id: CLIENT_ID, tenant_id: TENANT_ID, do_not_service: false },
  ])
  fake._seed('bookings', [
    { id: BOOKING_ID, tenant_id: TENANT_ID, client_id: CLIENT_ID, status, start_time: '2026-08-02T10:00:00.000Z', end_time: '2026-08-02T11:00:00.000Z', clients: { name: 'Owner', email: null, phone: null }, team_members: null },
  ])
  fake._seed('email_logs', [])
}

function withSession(clientId: string, tenantId: string) {
  cookieJar = new Map([['client_session', { value: createClientSession(clientId, tenantId) }]])
}

function putReq(body: Record<string, unknown>) {
  return PUT(
    new Request(`http://x/api/client/reschedule/${BOOKING_ID}`, { method: 'PUT', body: JSON.stringify(body) }),
    { params: Promise.resolve({ id: BOOKING_ID }) },
  )
}

beforeEach(() => {
  seed()
  withSession(CLIENT_ID, TENANT_ID)
  afterInitialRead.fn = null
})

describe('PUT /api/client/reschedule/[id] — concurrent-status-change race', () => {
  it('refuses to silently overwrite a booking a cleaner just checked into concurrently', async () => {
    afterInitialRead.fn = () => {
      const row = fake._store.get('bookings')?.find((r) => r.id === BOOKING_ID)
      if (row) row.status = 'in_progress'
    }

    const res = await putReq({ start_time: '2026-08-05T10:00:00.000Z', end_time: '2026-08-05T11:00:00.000Z' })
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.error).toMatch(/concurrently/i)
    const row = fake._store.get('bookings')?.find((r) => r.id === BOOKING_ID)
    expect(row?.start_time).toBe('2026-08-02T10:00:00.000Z')
    expect(row?.status).toBe('in_progress')
  })

  it('still reschedules a booking whose status did not change concurrently (no regression)', async () => {
    const res = await putReq({ start_time: '2026-08-05T10:00:00.000Z', end_time: '2026-08-05T11:00:00.000Z' })
    expect(res.status).toBe(200)
    const row = fake._store.get('bookings')?.find((r) => r.id === BOOKING_ID)
    expect(row?.start_time).toBe('2026-08-05T10:00:00.000Z')
  })
})
