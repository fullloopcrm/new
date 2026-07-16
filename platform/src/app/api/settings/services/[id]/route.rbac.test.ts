import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * PUT/DELETE /api/settings/services/[id] — permission gate.
 *
 * BUG (fixed here): both handlers only called getTenantForRequest() (proves
 * tenant membership at ANY role) with zero permission check — same gap as
 * the sibling settings/services/route.ts (also fixed, see P80 in
 * cross-tenant-leak-register.md) and /api/catalog.
 *
 * NOT override-only: by default rbac.ts grants 'settings.edit' to
 * owner/admin only — 'manager' and 'staff' get neither. So any manager or
 * staff-tier member could already edit or delete a service (price, cost,
 * active flag), with zero role check, no override needed — same class as
 * P72/P76/P77/P78/P79.
 *
 * FIX: requirePermission('settings.edit') on both PUT and DELETE.
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

import { PUT, DELETE } from './route'

function params(id: string) {
  return { params: Promise.resolve({ id }) }
}

function seed() {
  return {
    service_types: [{ id: 'svc-a1', tenant_id: A, name: 'Standard Clean', active: true }],
    audit_logs: [] as Record<string, unknown>[],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  tenantHolder.role = 'owner'
  tenantHolder.tenant = { id: A }
})

describe('PUT /api/settings/services/[id] — permission probe', () => {
  it('owner (has settings.edit) can update a service', async () => {
    const req = new Request('http://t/api/settings/services/svc-a1', { method: 'PUT', body: JSON.stringify({ name: 'Renamed' }) })
    const res = await PUT(req, params('svc-a1'))
    expect(res.status).toBe(200)
  })

  it("PERMISSION PROBE: 'manager' (no settings.edit per default rbac.ts, no override needed) is forbidden from updating a service", async () => {
    tenantHolder.role = 'manager'
    const req = new Request('http://t/api/settings/services/svc-a1', { method: 'PUT', body: JSON.stringify({ name: 'HIJACKED' }) })
    const res = await PUT(req, params('svc-a1'))
    expect(res.status).toBe(403)
    expect(h.seed.service_types.find((r) => r.id === 'svc-a1')!.name).toBe('Standard Clean')
  })
})

describe('DELETE /api/settings/services/[id] — permission probe', () => {
  it('owner (has settings.edit) can delete a service', async () => {
    const res = await DELETE(new Request('http://t/api/settings/services/svc-a1', { method: 'DELETE' }), params('svc-a1'))
    expect(res.status).toBe(200)
  })

  it("PERMISSION PROBE: 'staff' (no settings.edit per default rbac.ts, no override needed) is forbidden from deleting a service", async () => {
    tenantHolder.role = 'staff'
    const res = await DELETE(new Request('http://t/api/settings/services/svc-a1', { method: 'DELETE' }), params('svc-a1'))
    expect(res.status).toBe(403)
    expect(h.seed.service_types.some((r) => r.id === 'svc-a1')).toBe(true)
  })
})
