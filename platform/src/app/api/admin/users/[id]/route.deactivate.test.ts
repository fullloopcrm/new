import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * PUT /api/admin/users/[id] is_active toggle — a deactivated member must be
 * blocked from login (enforced separately in admin-auth/tenant-query), and a
 * tenant can never be left with zero active owners, mirroring the existing
 * "cannot remove the last owner" guard on DELETE.
 */

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle & { tenantId: string }

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: h.tenantId, role: 'owner' }, error: null }),
}))

import { PUT } from './route'

const params = (id: string) => Promise.resolve({ id })
const putReq = (body: unknown) => new NextRequest('http://x', { method: 'PUT', body: JSON.stringify(body) })

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
})

describe('PUT /api/admin/users/[id] — is_active toggle', () => {
  it('deactivates a non-owner member', async () => {
    h.store = { tenant_members: [{ id: 'm-1', tenant_id: 'tenant-A', role: 'staff', is_active: true }] }
    const res = await PUT(putReq({ is_active: false }), { params: params('m-1') })
    expect(res.status).toBe(200)
    expect(h.store.tenant_members.find((m) => m.id === 'm-1')?.is_active).toBe(false)
  })

  it('deactivates one owner when a second active owner remains', async () => {
    h.store = {
      tenant_members: [
        { id: 'owner-1', tenant_id: 'tenant-A', role: 'owner', is_active: true },
        { id: 'owner-2', tenant_id: 'tenant-A', role: 'owner', is_active: true },
      ],
    }
    const res = await PUT(putReq({ is_active: false }), { params: params('owner-1') })
    expect(res.status).toBe(200)
    expect(h.store.tenant_members.find((m) => m.id === 'owner-1')?.is_active).toBe(false)
  })

  it('rejects deactivating the last active owner', async () => {
    h.store = { tenant_members: [{ id: 'owner-1', tenant_id: 'tenant-A', role: 'owner', is_active: true }] }
    const res = await PUT(putReq({ is_active: false }), { params: params('owner-1') })
    expect(res.status).toBe(400)
    expect(h.store.tenant_members.find((m) => m.id === 'owner-1')?.is_active).toBe(true)
  })

  it('rejects deactivating the only active owner even if an already-inactive owner also exists', async () => {
    h.store = {
      tenant_members: [
        { id: 'owner-1', tenant_id: 'tenant-A', role: 'owner', is_active: true },
        { id: 'owner-2', tenant_id: 'tenant-A', role: 'owner', is_active: false },
      ],
    }
    const res = await PUT(putReq({ is_active: false }), { params: params('owner-1') })
    expect(res.status).toBe(400)
    expect(h.store.tenant_members.find((m) => m.id === 'owner-1')?.is_active).toBe(true)
  })

  it('reactivates a deactivated member', async () => {
    h.store = { tenant_members: [{ id: 'm-1', tenant_id: 'tenant-A', role: 'staff', is_active: false }] }
    const res = await PUT(putReq({ is_active: true }), { params: params('m-1') })
    expect(res.status).toBe(200)
    expect(h.store.tenant_members.find((m) => m.id === 'm-1')?.is_active).toBe(true)
  })
})
