import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * GET/PUT /api/settings/notifications — permission gate.
 *
 * BUG (fixed here): both handlers only called getTenantForRequest() (proves
 * tenant membership at ANY role) with zero permission check, even though the
 * sibling settings routes (settings/services, settings/team,
 * settings/permissions, settings/page-config) are already gated behind
 * settings.view/settings.edit. This route — which persists tenant-wide
 * comms/notification preferences (`tenants.notification_preferences`) — was
 * missed, same class as P80/P83.
 *
 * NOT override-only: by default rbac.ts grants 'settings.edit' to
 * owner/admin only, and 'settings.view' to owner/admin/manager only —
 * 'staff' gets neither. So any manager could already read comms capability
 * flags and any staff-tier member could overwrite the tenant's notification
 * preferences outright, with zero role check, no override needed.
 *
 * FIX: requirePermission('settings.view') on GET,
 * requirePermission('settings.edit') on PUT.
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

import { GET, PUT } from './route'

function seed() {
  return {
    tenants: [
      { id: A, notification_preferences: null, resend_api_key: null, telnyx_api_key: null, telnyx_phone: null },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  tenantHolder.role = 'owner'
  tenantHolder.tenant = { id: A }
})

describe('GET /api/settings/notifications — permission probe', () => {
  it('owner (has settings.view) can read comms preferences', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
  })

  it("PERMISSION PROBE: 'staff' (no settings.view per default rbac.ts, no override needed) is forbidden from reading comms preferences", async () => {
    tenantHolder.role = 'staff'
    const res = await GET()
    expect(res.status).toBe(403)
  })
})

describe('PUT /api/settings/notifications — permission probe', () => {
  it('owner (has settings.edit) can update comms preferences', async () => {
    const req = new Request('http://t/api/settings/notifications', {
      method: 'PUT',
      body: JSON.stringify({ preferences: {} }),
    })
    const res = await PUT(req)
    expect(res.status).toBe(200)
  })

  it("PERMISSION PROBE: 'staff' (no settings.edit per default rbac.ts, no override needed) is forbidden from overwriting comms preferences", async () => {
    tenantHolder.role = 'staff'
    const before = h.seed.tenants[0].notification_preferences
    const req = new Request('http://t/api/settings/notifications', {
      method: 'PUT',
      body: JSON.stringify({ preferences: {} }),
    })
    const res = await PUT(req)
    expect(res.status).toBe(403)
    expect(h.seed.tenants[0].notification_preferences).toBe(before)
  })

  it("PERMISSION PROBE: a tenant that revokes 'settings.edit' from admin via override blocks PUT for admin", async () => {
    tenantHolder.role = 'admin'
    tenantHolder.tenant = {
      id: A,
      selena_config: { role_permissions: { admin: { 'settings.edit': false } } },
    }
    const req = new Request('http://t/api/settings/notifications', {
      method: 'PUT',
      body: JSON.stringify({ preferences: {} }),
    })
    const res = await PUT(req)
    expect(res.status).toBe(403)
  })
})
