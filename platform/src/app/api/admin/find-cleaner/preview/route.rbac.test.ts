import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * POST /api/admin/find-cleaner/preview — permission gate.
 *
 * BUG (fixed here): this handler only called getTenantForRequest() (proves
 * tenant membership at ANY role) with zero permission check, even though it
 * returns the same team-member roster (name/phone/availability) the sibling
 * POST /api/admin/find-cleaner/send actually messages, and that route is
 * gated behind campaigns.send. By default rbac.ts grants no campaigns.*
 * permission to 'staff' at all, so any staff-tier member could already pull
 * the full eligible-cleaner list (incl. phone numbers) with zero role check.
 *
 * FIX: requirePermission('campaigns.view') on POST — this step is read-only
 * (no SMS sent, no row written), so it uses the weaker read-tier rather than
 * campaigns.send, consistent with the view/mutate split used elsewhere.
 */

const A = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

const tenantHolder = vi.hoisted(() => ({
  role: 'owner' as string,
  tenant: { id: 'tid-a' } as Record<string, unknown>,
}))
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
      tenantId: A,
      tenant: tenantHolder.tenant,
      role: tenantHolder.role,
    })),
  }
})

import { POST } from './route'

function seed() {
  return {
    team_members: [
      { id: 'tm-a1', tenant_id: A, name: 'Jeff Tucker', phone: '+15559990001', status: 'active', working_days: null, schedule: null, unavailable_dates: [], service_zones: [], has_car: true, max_jobs_per_day: null, hourly_rate: 25, preferred_language: 'en' },
    ],
    bookings: [],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  tenantHolder.role = 'owner'
  tenantHolder.tenant = { id: A }
})

function req() {
  return new Request('http://t', {
    method: 'POST',
    body: JSON.stringify({ job_date: '2026-08-01', start_time: '09:00', duration_hours: 2 }),
  })
}

describe('POST /api/admin/find-cleaner/preview — permission probe', () => {
  it('owner (has campaigns.view) can preview eligible cleaners', async () => {
    const res = await POST(req())
    expect(res.status).toBe(200)
  })

  it("manager (has campaigns.view per default rbac.ts) can preview eligible cleaners", async () => {
    tenantHolder.role = 'manager'
    const res = await POST(req())
    expect(res.status).toBe(200)
  })

  it("PERMISSION PROBE: 'staff' (no campaigns.* per default rbac.ts, no override needed) is forbidden from previewing the cleaner roster (incl. phone PII)", async () => {
    tenantHolder.role = 'staff'
    const res = await POST(req())
    expect(res.status).toBe(403)
  })

  it("PERMISSION PROBE: a tenant that revokes 'campaigns.view' from manager via a role_permissions override blocks POST for manager", async () => {
    tenantHolder.role = 'manager'
    tenantHolder.tenant = {
      id: A,
      selena_config: { role_permissions: { manager: { 'campaigns.view': false } } },
    }
    const res = await POST(req())
    expect(res.status).toBe(403)
  })
})
