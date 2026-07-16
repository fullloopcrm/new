import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * POST /api/admin/campaigns/preview — permission gate.
 *
 * BUG (fixed here): this handler only called getTenantForRequest() (proves
 * tenant membership at ANY role) with zero permission check, even though it
 * returns the FULL client list (name/email/phone/marketing-opt-out status)
 * for the tenant, filterable by audience segment — a bigger PII surface than
 * the sibling campaigns.view-gated GET /api/campaigns list endpoint. By
 * default rbac.ts grants 'manager' campaigns.view but NOT campaigns.create,
 * and 'staff' gets no campaigns.* at all, so any staff-tier (or manager-tier)
 * member could already pull every client's contact info with zero role
 * check. No live frontend caller exists yet, but (unlike routes that always
 * 401) this one fully executes for any authenticated tenant member.
 *
 * FIX: requirePermission('campaigns.create') on POST, matching the rest of
 * the campaigns family's create-workflow gate (this is a pre-send audience
 * preview step, same tier as campaigns/send/route.ts POST/PUT).
 */

const A = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

const tenantHolder = vi.hoisted(() => ({
  role: 'owner' as string,
  tenant: { id: 'tid-a', name: 'Acme Cleaning', primary_color: '#2563eb' } as Record<string, unknown>,
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
    clients: [
      { id: 'client-1', tenant_id: A, name: 'Jane Doe', email: 'jane@example.com', phone: '+15559990001', email_marketing_opt_out: false, sms_marketing_opt_out: false, status: 'active', do_not_service: false, created_at: '2026-01-01' },
    ],
    bookings: [],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  tenantHolder.role = 'owner'
  tenantHolder.tenant = { id: A, name: 'Acme Cleaning', primary_color: '#2563eb' }
})

function req() {
  return new Request('http://t', {
    method: 'POST',
    body: JSON.stringify({ audience_filter: 'active', channel: 'email', contact_filter: 'all' }),
  })
}

describe('POST /api/admin/campaigns/preview — permission probe', () => {
  it('owner (has campaigns.create) can preview audience + PII', async () => {
    const res = await POST(req())
    expect(res.status).toBe(200)
  })

  it('admin (has campaigns.create) can preview audience + PII', async () => {
    tenantHolder.role = 'admin'
    const res = await POST(req())
    expect(res.status).toBe(200)
  })

  it("PERMISSION PROBE: 'manager' (has campaigns.view but NOT campaigns.create per default rbac.ts) is forbidden from previewing the audience list (incl. email/phone PII)", async () => {
    tenantHolder.role = 'manager'
    const res = await POST(req())
    expect(res.status).toBe(403)
  })

  it("PERMISSION PROBE: 'staff' (no campaigns.* per default rbac.ts) is forbidden from previewing the audience list", async () => {
    tenantHolder.role = 'staff'
    const res = await POST(req())
    expect(res.status).toBe(403)
  })

  it("PERMISSION PROBE: a tenant that revokes 'campaigns.create' from admin via a role_permissions override blocks POST for admin", async () => {
    tenantHolder.role = 'admin'
    tenantHolder.tenant = {
      id: A,
      name: 'Acme Cleaning',
      primary_color: '#2563eb',
      selena_config: { role_permissions: { admin: { 'campaigns.create': false } } },
    }
    const res = await POST(req())
    expect(res.status).toBe(403)
  })
})
