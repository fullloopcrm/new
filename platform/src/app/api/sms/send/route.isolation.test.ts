import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * sms/send POST — permission isolation.
 *
 * BUG (fixed here): arbitrary-recipient SMS blast using the tenant's own
 * Telnyx credentials, same blast-radius/cost/brand-risk class as the sibling
 * admin/find-cleaner/send and admin/message-applicants/send routes (both
 * gated on campaigns.send). This route previously only checked for a valid
 * tenant session via getTenantForRequest(), which succeeds for ANY
 * tenant_members row regardless of role — so a 'staff' or 'manager' role
 * user (rbac.ts grants neither campaigns.send) could send an arbitrary SMS
 * to an arbitrary phone number directly via the API.
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

const spies = vi.hoisted(() => ({ sendSMS: vi.fn(async () => ({ success: true })) }))
vi.mock('@/lib/sms', () => ({ sendSMS: spies.sendSMS }))

// Real requirePermission + real rbac run against the mocked tenant-query above,
// so a 'staff'/'manager' role is denied by the ACTUAL permission table, not a stub.
import { POST } from './route'

function seed() {
  return {
    tenants: [{ id: A, name: 'Acme', telnyx_api_key: 'key', telnyx_phone: '+15551234567' }],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  roleHolder.role = 'owner'
  spies.sendSMS.mockClear()
})

function req(body: Record<string, unknown>) {
  return new NextRequest('http://t', { method: 'POST', body: JSON.stringify(body) })
}

const validBody = { to: '+15559990001', message: 'hello there' }

describe('sms/send POST — permission isolation', () => {
  it('owner can send a manual SMS', async () => {
    const res = await POST(req(validBody))
    expect(res.status).toBe(200)
    expect(spies.sendSMS).toHaveBeenCalledTimes(1)
  })

  it("PERMISSION PROBE: 'staff' role (no campaigns.send) is forbidden and nothing is sent", async () => {
    roleHolder.role = 'staff'
    const res = await POST(req(validBody))
    expect(res.status).toBe(403)
    expect(spies.sendSMS).not.toHaveBeenCalled()
  })

  it("PERMISSION PROBE: 'manager' role (no campaigns.send) is forbidden", async () => {
    roleHolder.role = 'manager'
    const res = await POST(req(validBody))
    expect(res.status).toBe(403)
    expect(spies.sendSMS).not.toHaveBeenCalled()
  })
})
