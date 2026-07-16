import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * /api/admin/users/[id] — role-escalation guard (sibling gap to the fix
 * already applied on the collection route ../route.ts). PUT is gated on
 * `settings.edit`, which both 'owner' AND 'admin' hold (rbac.ts). Without
 * this check, a non-owner 'admin' could grant themself (or anyone) the
 * 'owner' role — the one role that ignores per-tenant permission overrides
 * entirely (rbac.ts resolvePermissions short-circuits for 'owner').
 */

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  callerRole: 'owner',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle & { tenantId: string; callerRole: string }

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: h.tenantId, role: h.callerRole }, error: null }),
}))

import { PUT } from './route'

const params = (id: string) => Promise.resolve({ id })
const putReq = (body: unknown) => new NextRequest('http://x', { method: 'PUT', body: JSON.stringify(body) })

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.callerRole = 'owner'
  h.seq = 0
  h.store = {
    tenant_members: [
      { id: 'm-owner', tenant_id: 'tenant-A', name: 'Owner', role: 'owner' },
      { id: 'm-admin', tenant_id: 'tenant-A', name: 'AdminActor', role: 'admin' },
    ],
  }
})

describe('PUT /api/admin/users/[id] — owner-role grant restricted to owner callers', () => {
  it('an admin-role caller cannot self-promote to owner (403, role unchanged)', async () => {
    h.callerRole = 'admin'
    const res = await PUT(putReq({ role: 'owner' }), { params: params('m-admin') })
    expect(res.status).toBe(403)
    expect(h.store.tenant_members.find((m) => m.id === 'm-admin')?.role).toBe('admin')
  })

  it('an owner-role caller can promote another member to owner', async () => {
    h.callerRole = 'owner'
    const res = await PUT(putReq({ role: 'owner' }), { params: params('m-admin') })
    expect(res.status).toBe(200)
    expect(h.store.tenant_members.find((m) => m.id === 'm-admin')?.role).toBe('owner')
  })

  it('an admin-role caller can still edit a member to a non-owner role', async () => {
    h.callerRole = 'admin'
    const res = await PUT(putReq({ role: 'staff' }), { params: params('m-admin') })
    expect(res.status).toBe(200)
    expect(h.store.tenant_members.find((m) => m.id === 'm-admin')?.role).toBe('staff')
  })

  it('an admin-role caller cannot demote the real owner (403, role unchanged)', async () => {
    h.callerRole = 'admin'
    const res = await PUT(putReq({ role: 'staff' }), { params: params('m-owner') })
    expect(res.status).toBe(403)
    expect(h.store.tenant_members.find((m) => m.id === 'm-owner')?.role).toBe('owner')
  })

  it('an owner-role caller can demote another owner', async () => {
    h.callerRole = 'owner'
    const res = await PUT(putReq({ role: 'admin' }), { params: params('m-owner') })
    expect(res.status).toBe(200)
    expect(h.store.tenant_members.find((m) => m.id === 'm-owner')?.role).toBe('admin')
  })
})
