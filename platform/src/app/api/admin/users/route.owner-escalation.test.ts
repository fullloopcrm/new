import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * /api/admin/users — role-escalation guard.
 * POST/PUT are gated on `settings.edit`, which both 'owner' AND 'admin' hold
 * (rbac.ts). Without an extra check, a non-owner 'admin' could grant themself
 * (or anyone) the 'owner' role — the one role that ignores per-tenant
 * permission overrides entirely (rbac.ts resolvePermissions short-circuits for
 * 'owner'), permanently escaping any restriction the real owner sets later.
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
vi.mock('@/lib/admin-pin', () => ({
  hashAdminPin: (pin: string) => `hashed-${pin}`,
  generateAdminPin: () => '1234',
}))

import { POST, PUT } from './route'

const jsonReq = (method: string, body: unknown) =>
  new NextRequest('http://x', { method, body: JSON.stringify(body) })

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.callerRole = 'owner'
  h.seq = 0
  h.store = {
    tenant_members: [
      { id: 'm-owner', tenant_id: 'tenant-A', name: 'Owner', role: 'owner', pin_hash: 'h0' },
      { id: 'm-admin', tenant_id: 'tenant-A', name: 'AdminActor', role: 'admin', pin_hash: 'h1' },
    ],
  }
})

describe('POST /api/admin/users — owner-role grant restricted to owner callers', () => {
  it('an admin-role caller cannot create a new owner-role member (403, no insert)', async () => {
    h.callerRole = 'admin'
    const res = await POST(jsonReq('POST', { name: 'Shadow Owner', role: 'owner' }))
    expect(res.status).toBe(403)
    expect(h.store.tenant_members.some((m) => m.name === 'Shadow Owner')).toBe(false)
  })

  it('an owner-role caller can create a new owner-role member', async () => {
    h.callerRole = 'owner'
    const res = await POST(jsonReq('POST', { name: 'Co-Owner', role: 'owner' }))
    expect(res.status).toBe(200)
    expect(h.store.tenant_members.some((m) => m.name === 'Co-Owner' && m.role === 'owner')).toBe(true)
  })

  it('an admin-role caller can still create a non-owner member', async () => {
    h.callerRole = 'admin'
    const res = await POST(jsonReq('POST', { name: 'New Staffer', role: 'manager' }))
    expect(res.status).toBe(200)
    expect(h.store.tenant_members.some((m) => m.name === 'New Staffer' && m.role === 'manager')).toBe(true)
  })
})

describe('PUT /api/admin/users — owner-role grant restricted to owner callers', () => {
  it('an admin-role caller cannot self-promote to owner (403, role unchanged)', async () => {
    h.callerRole = 'admin'
    const res = await PUT(jsonReq('PUT', { id: 'm-admin', role: 'owner' }))
    expect(res.status).toBe(403)
    expect(h.store.tenant_members.find((m) => m.id === 'm-admin')?.role).toBe('admin')
  })

  it('an owner-role caller can promote another member to owner', async () => {
    h.callerRole = 'owner'
    const res = await PUT(jsonReq('PUT', { id: 'm-admin', role: 'owner' }))
    expect(res.status).toBe(200)
    expect(h.store.tenant_members.find((m) => m.id === 'm-admin')?.role).toBe('owner')
  })

  it('an admin-role caller can still edit a member to a non-owner role', async () => {
    h.callerRole = 'admin'
    const res = await PUT(jsonReq('PUT', { id: 'm-admin', role: 'staff' }))
    expect(res.status).toBe(200)
    expect(h.store.tenant_members.find((m) => m.id === 'm-admin')?.role).toBe('staff')
  })
})
