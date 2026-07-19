import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * DELETE /api/bookings/[id] — idempotency guard against re-notifying an
 * already-cancelled booking (nycmaid ref 33d97974, "guard cancel endpoint
 * against double-send", ported P1/W2).
 *
 * BUG this closes: this route hard-deletes the booking row and fires
 * cancellation email/SMS whenever the pre-delete SELECT found a row —
 * unconditionally, even if that row's status was already 'cancelled' (e.g.
 * set by admin/recurring-schedules/[id] DELETE, which soft-cancels bookings
 * without notifying, by design — see that route's own header comment). A
 * second cancel action against the same booking (cross-route, or a
 * same-route repeat/retry) re-sent the "your appointment has been
 * cancelled" email/SMS for something already cancelled.
 *
 * Reuses the hand-rolled `bookings` table mock from
 * route.sms-consent-guard.test.ts's own header comment: the shared
 * createTenantDbHarness returns live object references from `.select()`, so
 * a `.delete()` on that same reference could retroactively affect an
 * earlier read in ways a real Postgres SELECT (a snapshot) never would.
 */

type Row = Record<string, unknown>

function makeBookingsTable(rows: Row[]) {
  return () => {
    const filters: Array<(r: Row) => boolean> = []
    let op: 'select' | 'delete' = 'select'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain: any = {
      select: () => chain,
      delete: () => { op = 'delete'; return chain },
      eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return chain },
      single: async () => {
        const hit = rows.filter((r) => filters.every((f) => f(r)))
        return hit.length ? { data: { ...hit[0] }, error: null } : { data: null, error: { code: 'PGRST116' } }
      },
      then: (resolve: (v: unknown) => unknown) => {
        const hit = rows.filter((r) => filters.every((f) => f(r)))
        if (op === 'delete') {
          hit.forEach((r) => { const idx = rows.indexOf(r); if (idx >= 0) rows.splice(idx, 1) })
        }
        return Promise.resolve({ data: null, error: null }).then(resolve)
      },
    }
    return chain
  }
}

const CTX_TENANT = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'], bookingsRows: [] as Row[] }))
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (t: string) => (t === 'bookings' ? makeBookingsTable(holder.bookingsRows)() : holder.from!(t)),
  },
}))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: { userId: 'u1', tenantId: CTX_TENANT, tenant: { id: CTX_TENANT }, role: 'owner' },
    error: null,
  })),
}))

const notifyMock = vi.fn(async (_opts: Record<string, unknown>) => ({ success: true }))
const sendSMSMock = vi.fn(async (_opts: Record<string, unknown>) => ({ success: true }))

vi.mock('@/lib/audit', () => ({ audit: async () => {} }))
vi.mock('@/lib/notify', () => ({ notify: (opts: Record<string, unknown>) => notifyMock(opts) }))
vi.mock('@/lib/sms', () => ({ sendSMS: (opts: Record<string, unknown>) => sendSMSMock(opts) }))
vi.mock('@/lib/messaging/client-sms', () => ({ clientSmsTemplatesFor: async () => ({ cancellation: () => 'cancelled!' }) }))

import { DELETE } from './route'

const client = { name: 'Real Client', phone: '3005552222', sms_consent: true, do_not_service: false }

function bookingsSeed(): Row[] {
  return [
    { id: 'bk-already-cancelled', tenant_id: CTX_TENANT, client_id: 'c-1', status: 'cancelled', team_member_id: null, start_time: '2026-08-01T10:00:00Z', service_type_id: null, clients: client },
    { id: 'bk-still-active', tenant_id: CTX_TENANT, client_id: 'c-1', status: 'confirmed', team_member_id: null, start_time: '2026-08-01T10:00:00Z', service_type_id: null, clients: client },
  ]
}

function seed() {
  return {
    clients: [{ id: 'c-1', tenant_id: CTX_TENANT, ...client }],
    tenants: [{ id: CTX_TENANT, name: 'Alpha', telnyx_api_key: 'key', telnyx_phone: '+15550000000' }],
  }
}

function req(): Request {
  return {} as unknown as Request
}
function ctx(id: string) {
  return { params: Promise.resolve({ id }) }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  holder.bookingsRows = bookingsSeed()
  notifyMock.mockClear()
  sendSMSMock.mockClear()
})

describe('bookings/[id] DELETE — already-cancelled idempotency guard', () => {
  it('BLOCKED: a booking already status=cancelled is hard-deleted but sends no repeat notification', async () => {
    const res = await DELETE(req(), ctx('bk-already-cancelled'))
    expect(res.status).toBe(200)
    expect(notifyMock).not.toHaveBeenCalled()
    expect(sendSMSMock).not.toHaveBeenCalled()
  })

  it('CONTROL: a still-active booking still gets the real cancellation email + SMS', async () => {
    const res = await DELETE(req(), ctx('bk-still-active'))
    expect(res.status).toBe(200)
    expect(notifyMock).toHaveBeenCalledWith(expect.objectContaining({ recipientId: 'c-1' }))
    expect(sendSMSMock).toHaveBeenCalledWith(expect.objectContaining({ to: '3005552222' }))
  })
})
