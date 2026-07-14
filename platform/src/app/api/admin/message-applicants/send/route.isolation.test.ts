import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * admin/message-applicants/send POST — permission isolation.
 *
 * BUG (fixed here): mass-SMS broadcast to job applicants, same blast-radius/
 * cost/brand-risk class as the sibling send-apology-batch route (gated on
 * campaigns.send). This route previously only checked for a valid tenant
 * session via getTenantForRequest(), which succeeds for ANY tenant_members
 * row regardless of role — so a 'staff' role user (rbac.ts grants staff no
 * campaigns.send) could broadcast SMS to every new applicant directly via
 * the API.
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
      tenant: { id: A, telnyx_api_key: 'key', telnyx_phone: '+15551234567' },
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
    // TEST_MODE (constants.ts) is hard-coded true, so the seeded recipient
    // must match TEST_APPLICANT_NAME_SUBSTRING to survive the send filter.
    cleaner_applications: [
      { id: 'app-a1', tenant_id: A, name: 'Jeff Tucker', phone: '+15559990001', status: 'new' },
    ],
    notifications: [],
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

const validBody = { applicant_ids: ['app-a1'], message: 'Hi there!', confirmed: true }

describe('admin/message-applicants/send — permission isolation', () => {
  it('owner can broadcast to applicants', async () => {
    const res = await POST(req(validBody))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.sent).toBe(1)
  })

  it("PERMISSION PROBE: 'staff' role (no campaigns.send) is forbidden and nothing is sent", async () => {
    roleHolder.role = 'staff'
    const res = await POST(req(validBody))
    expect(res.status).toBe(403)
    expect(h.capture.inserts.find((i) => i.table === 'notifications')).toBeUndefined()
  })

  it("PERMISSION PROBE: 'manager' role (no campaigns.send) is forbidden", async () => {
    roleHolder.role = 'manager'
    const res = await POST(req(validBody))
    expect(res.status).toBe(403)
    expect(h.capture.inserts.find((i) => i.table === 'notifications')).toBeUndefined()
  })
})
