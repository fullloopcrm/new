import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — POST /api/admin/schedule-issues/fix.
 *
 * This route lives behind the GLOBAL /dashboard (one shared codebase, every
 * tenant's own PIN-based admin reaches it — see platform/CLAUDE.md "THE
 * GLOBAL RULE"). It previously gated on requireAdmin(), which only accepts
 * the platform-wide super_admin token — every ordinary tenant_admin PIN
 * login got 401'd (the "Resolve" button silently did nothing), and none of
 * its queries were tenant-scoped even when reached. Now it uses
 * getTenantForRequest() (matching the sibling GET/PUT ../route.ts) and every
 * query is tenant-scoped. This file proves both: same-tenant success, and a
 * wrong-tenant probe that must 404 rather than read/mutate a foreign
 * tenant's issue or booking.
 */

const CTX_TENANT = 'tid-a'
const OTHER_TENANT = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/tenant-query', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  }
  return {
    AuthError,
    getTenantForRequest: vi.fn(async () => ({
      userId: 'u1',
      tenantId: CTX_TENANT,
      tenant: { id: CTX_TENANT },
      role: 'owner',
    })),
  }
})

import { POST } from './route'

function seed() {
  return {
    schedule_issues: [
      {
        id: 'issue-a1', tenant_id: CTX_TENANT, type: 'day_off', message: 'day off conflict',
        booking_id: 'bk-a', team_member_id: 'tm-x', status: 'open',
      },
      {
        id: 'issue-b1', tenant_id: OTHER_TENANT, type: 'day_off', message: 'foreign issue',
        booking_id: 'bk-b', team_member_id: 'tm-foreign', status: 'open',
      },
    ],
    bookings: [
      {
        id: 'bk-a', tenant_id: CTX_TENANT, team_member_id: 'tm-x', status: 'confirmed',
        start_time: '2026-08-01T10:00:00Z', end_time: '2026-08-01T12:00:00Z', price: 20000, hourly_rate: 100,
      },
      {
        id: 'bk-b', tenant_id: OTHER_TENANT, team_member_id: 'tm-foreign', status: 'confirmed',
        start_time: '2026-08-01T10:00:00Z', end_time: '2026-08-01T12:00:00Z', price: 20000, hourly_rate: 100,
      },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

function req(body: Record<string, unknown>): Request {
  return new Request('http://t/api/admin/schedule-issues/fix', { method: 'POST', body: JSON.stringify(body) })
}

describe('admin/schedule-issues/fix — tenant isolation', () => {
  it('positive control: same-tenant issue previews correctly', async () => {
    const res = await POST(req({ id: 'issue-a1', apply: false }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.preview.acknowledgeOnly).toBe(false)
    expect(body.preview.changes.some((c: { field: string }) => c.field === 'team_member_id')).toBe(true)
  })

  it('positive control: applying the fix updates the booking + resolves the issue, both tenant-scoped', async () => {
    const res = await POST(req({ id: 'issue-a1', apply: true }))
    expect(res.status).toBe(200)
    const bookingUpdate = h.capture.updates.find((u) => u.table === 'bookings')
    expect(bookingUpdate?.values.team_member_id).toBeNull()
    expect(bookingUpdate?.values.status).toBe('pending')
    const issueUpdate = h.capture.updates.find((u) => u.table === 'schedule_issues')
    expect(issueUpdate?.values.status).toBe('resolved')
    // Only the ctx-tenant's booking/issue were matched, never the foreign rows.
    expect(bookingUpdate?.matched.every((r) => r.tenant_id === CTX_TENANT)).toBe(true)
    expect(issueUpdate?.matched.every((r) => r.tenant_id === CTX_TENANT)).toBe(true)
  })

  it("wrong-tenant probe: another tenant's issue id 404s instead of previewing", async () => {
    const res = await POST(req({ id: 'issue-b1', apply: false }))
    expect(res.status).toBe(404)
    expect(JSON.stringify(await res.clone().json())).not.toContain('foreign issue')
  })

  it("wrong-tenant probe: another tenant's issue id cannot be applied — no foreign booking/issue mutated", async () => {
    const res = await POST(req({ id: 'issue-b1', apply: true }))
    expect(res.status).toBe(404)
    expect(h.capture.updates.find((u) => u.table === 'bookings')).toBeUndefined()
    expect(h.capture.updates.find((u) => u.table === 'schedule_issues')).toBeUndefined()
  })
})
