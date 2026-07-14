import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * admin/find-cleaner/send POST — permission isolation.
 *
 * BUG (fixed here): mass-SMS broadcast to team members, same blast-radius/
 * cost/brand-risk class as the sibling send-apology-batch route (gated on
 * campaigns.send). This route previously only checked for a valid tenant
 * session via getTenantForRequest(), which succeeds for ANY tenant_members
 * row regardless of role — so a 'staff' role user (rbac.ts grants staff
 * neither campaigns.send nor team.edit) could broadcast SMS to every team
 * member directly via the API.
 *
 * FIX: requirePermission('campaigns.send') before anything else runs.
 */

const A = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

const roleHolder = vi.hoisted(() => ({ role: 'owner' as string }))
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
      tenant: { id: A },
      role: roleHolder.role,
    })),
  }
})

vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => ({ success: true })) }))

// Real requirePermission + real rbac run against the mocked tenant-query above,
// so a 'staff' role is denied by the ACTUAL permission table, not a stub.
import { POST } from './route'

function seed() {
  return {
    tenants: [{ id: A, name: 'Acme', telnyx_api_key: 'key', telnyx_phone: '+15551234567' }],
    // TEST_MODE (constants.ts) is hard-coded true, so the seeded recipient
    // must match TEST_CLEANER_NAME_SUBSTRING to survive the send filter.
    team_members: [{ id: 'tm-a1', tenant_id: A, name: 'Jeff Tucker', phone: '+15559990001', preferred_language: 'en', hourly_rate: 25 }],
    cleaner_broadcasts: [],
    cleaner_broadcast_recipients: [],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  roleHolder.role = 'owner'
})

function req(body: Record<string, unknown>) {
  return new Request('http://t', { method: 'POST', body: JSON.stringify(body) })
}

const validBody = {
  job_date: '2026-08-01', start_time: '09:00', duration_hours: 2,
  cleaner_ids: ['tm-a1'], confirmed: true,
}

describe('admin/find-cleaner/send — permission isolation', () => {
  it('owner can broadcast to team members', async () => {
    const res = await POST(req(validBody))
    expect(res.status).toBe(200)
    expect(h.capture.inserts.find((i) => i.table === 'cleaner_broadcasts')).toBeDefined()
  })

  it("PERMISSION PROBE: 'staff' role (no campaigns.send) is forbidden and no broadcast is sent", async () => {
    roleHolder.role = 'staff'
    const res = await POST(req(validBody))
    expect(res.status).toBe(403)
    expect(h.capture.inserts.find((i) => i.table === 'cleaner_broadcasts')).toBeUndefined()
  })

  it("PERMISSION PROBE: 'manager' role (no campaigns.send) is forbidden", async () => {
    roleHolder.role = 'manager'
    const res = await POST(req(validBody))
    expect(res.status).toBe(403)
    expect(h.capture.inserts.find((i) => i.table === 'cleaner_broadcasts')).toBeUndefined()
  })
})
