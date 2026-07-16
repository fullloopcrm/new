import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * GET+POST /api/notifications — permission gate.
 *
 * BUG (fixed here): both handlers only called getTenantForRequest() (proves
 * tenant membership at ANY role) with zero permission check, even though
 * rbac.ts defines 'notifications.view' specifically for this resource.
 *
 * Override-only — 'notifications.view' is granted to every default role
 * including staff, so this was only exploitable once a tenant explicitly
 * revokes it via a role_permissions override (same shape as most of this
 * session's prior findings, e.g. P75).
 *
 * FIX: requirePermission('notifications.view') on both GET and POST — no
 * separate 'notifications.create' permission exists in rbac.ts, so POST
 * (which only ever inserts an in-app admin notification, never a
 * tenant-scoped resource write like clients/bookings) reuses the same
 * 'view' gate as the family's one defined permission.
 */

const A = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))

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

import { GET, POST } from './route'

function seed() {
  return {
    notifications: [
      { id: 'notif-a1', tenant_id: A, recipient_type: 'admin', type: 'test', metadata: null, created_at: '2020-01-01' },
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

describe('GET /api/notifications — permission probe', () => {
  it('owner (has notifications.view) can list notifications', async () => {
    const res = await GET(new NextRequest('http://t/api/notifications'))
    expect(res.status).toBe(200)
  })

  it("PERMISSION PROBE: a tenant that revokes 'notifications.view' from staff via a role_permissions override blocks GET for staff", async () => {
    tenantHolder.role = 'staff'
    tenantHolder.tenant = {
      id: A,
      selena_config: { role_permissions: { staff: { 'notifications.view': false } } },
    }
    const res = await GET(new NextRequest('http://t/api/notifications'))
    expect(res.status).toBe(403)
  })
})

describe('POST /api/notifications — permission probe', () => {
  function postReq(body: Record<string, unknown>) {
    return new NextRequest('http://t/api/notifications', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  it('owner (has notifications.view) can post a 15min_warning notification', async () => {
    const res = await POST(postReq({ type: '15min_warning' }))
    expect(res.status).toBe(200)
  })

  it("PERMISSION PROBE: a tenant that revokes 'notifications.view' from staff via a role_permissions override blocks POST for staff", async () => {
    tenantHolder.role = 'staff'
    tenantHolder.tenant = {
      id: A,
      selena_config: { role_permissions: { staff: { 'notifications.view': false } } },
    }
    const res = await POST(postReq({ type: '15min_warning' }))
    expect(res.status).toBe(403)
  })
})
