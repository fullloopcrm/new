import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Defense-in-depth — POST /api/team-portal/running-late.
 *
 * The handler's existence check
 * (`.eq('id', bookingId).eq('tenant_id', auth.tid).eq('team_member_id', auth.id)`)
 * already gates this route: `bookingId` is only ever used past that point after
 * being confirmed to belong to both the caller's tenant AND the caller's own
 * team-member record, so this was never a live cross-tenant bug on the real
 * UUID-PK schema (booking ids are globally-unique — no two tenants can ever
 * share one). But the follow-up `bookings.update({ running_late_at, ... })`
 * filtered only `.eq('id', bookingId)` — the redundant tenant scope on the
 * WRITE itself was missing, unlike this same file's `notify({ tenantId, ... })`
 * and `sendPushToTenantAdmins(tenantId, ...)` calls two lines down, which both
 * correctly key off the SELECT-derived `tenantId`. Hardened to match the
 * codebase's stated invariant (see documents/[id]/void and
 * finance/bank-transactions/[id]/match's identical fix): every mutation
 * should carry `tenant_id` even when a call-site guard already exists, so a
 * future refactor that loosens the guard can't silently reopen a cross-tenant
 * write. This test seeds a synthetic id collision across tenants (impossible
 * on the real schema, documented inline) to make the WRITE's own scope
 * observable, not just the read that precedes it.
 */

const TENANT = 'tid-a'
const OTHER_TENANT = 'tid-b'
const SHARED_BOOKING_ID = 'bk-shared'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/team-portal-auth', () => ({
  requirePortalPermission: vi.fn(async () => ({
    auth: { id: 'tm-1', tid: TENANT, role: 'member' },
    error: null,
  })),
}))

vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => ({ ok: true })) }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/push', () => ({ sendPushToTenantAdmins: vi.fn(async () => {}), sendPushToClient: vi.fn(async () => {}) }))
vi.mock('@/lib/sms-templates', () => ({ smsRunningLateClient: () => 'client-msg', smsRunningLateAdmin: () => 'admin-msg' }))

import { POST } from './route'

function seed() {
  return {
    // Same `id` on two rows only exists to make the query's own tenant filter
    // observable in this in-memory harness — see file header. Both share
    // team_member_id so the SELECT's existence check (which also filters on
    // team_member_id) can't be the thing disambiguating them — only tenant_id
    // narrows the SELECT, and only tenant_id should narrow the WRITE.
    bookings: [
      {
        id: SHARED_BOOKING_ID, tenant_id: TENANT, start_time: '2026-08-01T14:00:00Z',
        team_member_id: 'tm-1', client_id: 'c-1',
        clients: { name: 'Client A', phone: '3005551111', sms_consent: true, do_not_service: false },
        team_members: { name: 'Crew A' },
      },
      {
        id: SHARED_BOOKING_ID, tenant_id: OTHER_TENANT, start_time: '2026-08-01T14:00:00Z',
        team_member_id: 'tm-1', client_id: 'c-2',
        clients: { name: 'Client B', phone: '3005552222', sms_consent: true, do_not_service: false },
        team_members: { name: 'Crew A' },
      },
    ],
    tenants: [
      { id: TENANT, name: 'Acme', owner_phone: '3005559999', phone: null, telnyx_api_key: 'key', telnyx_phone: '+15550000000' },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

function post(bookingId: string, eta = 10) {
  return POST(new Request('http://t/api/team-portal/running-late', { method: 'POST', body: JSON.stringify({ bookingId, eta }) }))
}

describe('team-portal/running-late POST — write-side tenant scope', () => {
  it("marks the caller's own tenant's booking running-late and leaves the other tenant's same-id booking untouched", async () => {
    const res = await post(SHARED_BOOKING_ID)
    expect(res.status).toBe(200)

    const mine = h.seed.bookings.find((b) => b.tenant_id === TENANT)!
    const theirs = h.seed.bookings.find((b) => b.tenant_id === OTHER_TENANT)!
    expect(mine.running_late_at).toBeTruthy()
    expect(theirs.running_late_at).toBeUndefined()
  })
})
