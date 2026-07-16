import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * client/confirm/[token] — cross-tenant notify() misattribution regression test.
 *
 * BUG (fixed here): `client_confirm_token` is a global unique lookup (by
 * design — the token itself is the auth, same as quote/invoice/document
 * public-token routes elsewhere in this register), so the route correctly
 * finds the booking regardless of which tenant's domain the request hits.
 * But the POST handler's `notify({ type: 'booking_confirmed_by_client', ... })`
 * call omitted `tenantId`, so it fell through to `lib/nycmaid/notify.ts`'s
 * request-header-based fallback (the tenant of whatever domain served the
 * request) instead of `booking.tenant_id` (the tenant that actually owns the
 * booking) — unlike the `smsAdmins(booking.tenant_id, ...)` call two lines
 * above it, which was already correctly scoped.
 *
 * Since `booking_confirmed_by_client` is a TELEGRAM_NOTIFY_TYPES entry, a
 * request for tenant A's confirm token made against tenant B's own (genuinely
 * signed, no forgery needed) subdomain would insert a `notifications` row
 * tagged to tenant B and push tenant A's real client's name to tenant B's own
 * Telegram bot — a cross-tenant PII leak with no signature forgery required,
 * just knowledge of another tenant's confirm token.
 *
 * FIX: pass `tenantId: booking.tenant_id` explicitly, so notify() always
 * scopes to the booking's real owner regardless of request-header context.
 */

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/nycmaid/sms', () => ({ sendSMS: vi.fn(async () => {}) }))
vi.mock('@/lib/admin-contacts', () => ({ smsAdmins: vi.fn(async () => {}) }))
const notifyMock = vi.hoisted(() => vi.fn(async (_opts: Record<string, unknown>) => {}))
vi.mock('@/lib/nycmaid/notify', () => ({ notify: notifyMock }))

import { POST } from './route'
import { smsAdmins } from '@/lib/admin-contacts'

let h: Harness
beforeEach(() => {
  notifyMock.mockClear()
  h = createTenantDbHarness({
    bookings: [
      {
        id: 'bk-1',
        tenant_id: 'tid-a',
        client_id: 'client-a',
        start_time: '2026-08-02T10:00:00Z',
        status: 'pending',
        client_terms_accepted_at: null,
        client_confirm_token: 'tok-a',
        notes: '',
        clients: { name: 'Client A', phone: '+15551230000' },
      },
    ],
  })
  holder.from = h.from
})

function params() {
  return { params: Promise.resolve({ token: 'tok-a' }) }
}

describe('client/confirm/[token] — notify() tenant-scope guard', () => {
  it('cross-tenant notify probe: scopes notify() to the booking\'s own tenant, not ambient request context', async () => {
    const res = await POST(new Request('http://t/api/client/confirm/tok-a', { method: 'POST' }), params())
    expect(res.status).toBe(200)

    expect(notifyMock).toHaveBeenCalledTimes(1)
    const call = notifyMock.mock.calls[0][0]
    expect(call.tenantId).toBe('tid-a')
    expect(call.type).toBe('booking_confirmed_by_client')

    // Same tenant the sibling smsAdmins() call already used — the two calls
    // must never disagree on which tenant this event belongs to.
    expect((smsAdmins as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][0]).toBe('tid-a')
  })
})
